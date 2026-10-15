import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Check, CircleHelp, Clock3,
  ExternalLink, History, Info, Search, Settings2, ShieldCheck, Sparkles,
  WalletCards, X,
} from 'lucide-react';
import { MarketChart, makeSeededHistory } from './MarketChart';
import { TradePanel } from './TradePanel';
import { PRACTICE_TOKENS, DEFAULT_TOKEN_ID, tokenById } from '../lib/tokens';
import {
  createPracticeState, DEFAULT_SETTINGS, executePracticeTrade, getPracticeQuote,
  readPracticeState, updateVolatilityPrice, writePracticeState,
} from '../lib/practice-store';
import { averageEntryPrice, summarizePortfolio } from '../lib/portfolio';
import { quoteBuyForTokens, quoteSellForSol } from '../lib/amm';
import type { DevnetWalletSnapshot } from '../lib/wallet';
import type { PracticeSettings, PracticeState, SwapQuote, TradeSide, TradingMode } from '../lib/models';
import { REAL_SWAP_UNAVAILABLE_REASON } from '../lib/markets';

function formatSol(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })} SOL`;
}

function formatToken(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 5 });
}

function compactAddress(value: string): string {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function priceText(value: number): string {
  if (value >= 0.01) return value.toFixed(5);
  return value.toPrecision(4);
}

function App() {
  const [mode, setMode] = useState<TradingMode>(() => {
    if (typeof localStorage === 'undefined') return 'practice';
    return localStorage.getItem('meme-playground.mode') === 'devnet' ? 'devnet' : 'practice';
  });
  const [practice, setPractice] = useState<PracticeState>(() => readPracticeState());
  const [selectedId, setSelectedId] = useState(DEFAULT_TOKEN_ID);
  const [searchText, setSearchText] = useState('');
  const [side, setSide] = useState<TradeSide>('buy');
  const [amount, setAmount] = useState('1.25');
  const [inputUnit, setInputUnit] = useState<'SOL' | 'TOKEN'>('SOL');
  const [tradeMessage, setTradeMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [walletSnapshot, setWalletSnapshot] = useState<DevnetWalletSnapshot | null>(null);
  const [devnetWorkspace, setDevnetWorkspace] = useState<import('react').ComponentType<{ onSnapshot: (snapshot: DevnetWalletSnapshot | null) => void }> | null>(null);
  const [devnetLoadError, setDevnetLoadError] = useState('');
  const [history, setHistory] = useState<number[]>([]);

  const selectedToken = tokenById(selectedId);
  const selectedPool = practice.pools[selectedId];
  const spotPrice = selectedPool.solReserve / selectedPool.tokenReserve;
  const portfolio = useMemo(() => summarizePortfolio(practice), [practice]);

  useEffect(() => {
    writePracticeState(practice);
  }, [practice]);

  useEffect(() => {
    localStorage.setItem('meme-playground.mode', mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'devnet' || devnetWorkspace || devnetLoadError) return;
    let cancelled = false;
    void import('./DevnetWorkspace')
      .then(({ DevnetWorkspace }) => {
        if (!cancelled) setDevnetWorkspace(() => DevnetWorkspace);
      })
      .catch(() => {
        if (!cancelled) setDevnetLoadError('The Devnet wallet module could not be loaded. Refresh the page to retry.');
      });
    return () => { cancelled = true; };
  }, [devnetLoadError, devnetWorkspace, mode]);

  useEffect(() => {
    const seeded = practice.settings.seededHistory ? makeSeededHistory(selectedId, spotPrice, 36) : [spotPrice];
    setHistory(seeded);
  }, [selectedId, practice.settings.seededHistory]);

  useEffect(() => {
    setHistory((current) => [...current.slice(-47), spotPrice]);
  }, [spotPrice]);

  useEffect(() => {
    if (mode !== 'practice' || !practice.settings.volatilityEnabled) return;
    const timer = window.setInterval(() => {
      setPractice((current) => PRACTICE_TOKENS.reduce((next, token) => {
        const direction = Math.random() * 2 - 1;
        const deltaBps = Math.round(direction * current.settings.volatilityBps);
        return updateVolatilityPrice(next, token.id, deltaBps);
      }, current));
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [mode, practice.settings.volatilityEnabled, practice.settings.volatilityBps]);

  const filteredTokens = PRACTICE_TOKENS.filter((token) =>
    `${token.name} ${token.symbol}`.toLowerCase().includes(searchText.toLowerCase()),
  );

  const parsedAmount = Number(amount);
  const quoteState = useMemo((): { quote: SwapQuote | null; error: string | null; inputAmount: number } => {
    if (mode !== 'practice' || !amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return { quote: null, error: null, inputAmount: 0 };
    }
    try {
      if (side === 'buy' && inputUnit === 'TOKEN') {
        const quote = quoteBuyForTokens(selectedPool, parsedAmount, practice.settings.feeBps, practice.settings.slippageBps);
        return { quote, error: null, inputAmount: quote.amountIn };
      }
      if (side === 'sell' && inputUnit === 'SOL') {
        const quote = quoteSellForSol(selectedPool, parsedAmount, practice.settings.feeBps, practice.settings.slippageBps);
        return { quote, error: null, inputAmount: quote.amountIn };
      }
      const quote = getPracticeQuote(practice, selectedId, side, parsedAmount);
      return { quote, error: null, inputAmount: parsedAmount };
    } catch (error) {
      return { quote: null, error: error instanceof Error ? error.message : 'Unable to calculate a simulated quote.', inputAmount: 0 };
    }
  }, [amount, inputUnit, mode, parsedAmount, practice, selectedId, selectedPool, side]);

  function onTrade() {
    if (mode !== 'practice') return;
    if (!quoteState.quote) {
      setTradeMessage({ kind: 'error', text: quoteState.error ?? 'Enter a valid amount to preview the simulated trade.' });
      return;
    }
    try {
      const result = executePracticeTrade(practice, selectedId, side, quoteState.inputAmount);
      setPractice(result.state);
      setTradeMessage({
        kind: 'success',
        text: `${side === 'buy' ? 'Bought' : 'Sold'} ${formatToken(result.quote.amountOut)} ${side === 'buy' ? selectedToken.symbol : 'SOL'} in the simulated pool.`,
      });
      setAmount('');
    } catch (error) {
      setTradeMessage({ kind: 'error', text: error instanceof Error ? error.message : 'The simulated trade could not be completed.' });
    }
  }

  function changeMode(nextMode: TradingMode) {
    setMode(nextMode);
    setTradeMessage(null);
    if (nextMode === 'practice') setWalletSnapshot(null);
  }

  function updatePracticeSettings(nextSettings: PracticeSettings) {
    if (nextSettings.startingBalanceSol !== practice.settings.startingBalanceSol) {
      setPractice(createPracticeState(nextSettings));
      setTradeMessage({ kind: 'success', text: 'Practice account reset with the new starting balance.' });
      return;
    }
    const pools = Object.fromEntries(PRACTICE_TOKENS.map((token) => {
      const oldPool = practice.pools[token.id];
      const currentPrice = oldPool.solReserve / oldPool.tokenReserve;
      return [token.id, { solReserve: nextSettings.virtualLiquiditySol, tokenReserve: nextSettings.virtualLiquiditySol / currentPrice }];
    }));
    setPractice({ ...practice, settings: nextSettings, pools });
  }

  const isPractice = mode === 'practice';
  const devnetSol = walletSnapshot?.solBalance;
  const displayedPositions = isPractice
    ? PRACTICE_TOKENS.filter((token) => (practice.positions[token.id]?.quantity ?? 0) > 0)
    : [];
  const devnetStatusText = walletSnapshot ? 'Wallet synced' : 'Connect to read balances';
  const DevnetWorkspaceView = devnetWorkspace;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Meme Playground home">
          <span className="brand-mark"><span /></span>
          <span className="brand-wordmark"><strong>meme</strong><span>playground</span></span>
        </a>
        <div className="header-center"><span className="eyebrow">SOLANA TRADING LAB</span><span className="live-dot" /> <span className="header-note">A safer place to learn the mechanics</span></div>
        <button className="icon-button settings-button" onClick={() => setShowSettings(true)} title="Practice settings" aria-label="Practice settings">
          <Settings2 size={18} /><span>Settings</span>
        </button>
      </header>

      <div className={`mode-banner ${isPractice ? 'mode-practice' : 'mode-devnet'}`} role="status">
        {isPractice ? <Sparkles size={16} /> : <ShieldCheck size={16} />}
        <strong>{isPractice ? 'SIMULATION — NO REAL FUNDS' : 'SOLANA DEVNET — TEST FUNDS ONLY'}</strong>
        <span className="banner-divider" />
        <span>{isPractice ? 'Local AMM · simulated prices and P&L' : 'Devnet only · no mainnet trading'}</span>
        <div className="mode-switch" role="group" aria-label="Trading mode">
          <button className={isPractice ? 'selected' : ''} onClick={() => changeMode('practice')}>Practice</button>
          <button className={!isPractice ? 'selected' : ''} onClick={() => changeMode('devnet')}>Devnet</button>
        </div>
      </div>

      <main id="top" className="page-wrap">
        <section className="page-intro">
          <div>
            <p className="eyebrow">YOUR TERMINAL, YOUR PACE</p>
            <h1>{isPractice ? 'Trade the idea, not your wallet.' : 'Devnet, without the guesswork.'}</h1>
            <p className="intro-copy">{isPractice
              ? 'Try meme-market mechanics against local virtual pools. Nothing here touches a blockchain.'
              : 'Wallet reads and SPL balances are Devnet-only. Real swaps stay locked until this app can verify a supported pool.'}</p>
          </div>
          <div className="session-chip"><span className="status-dot" />{isPractice ? 'LOCAL SESSION' : 'DEVNET ONLY'}</div>
        </section>

        {isPractice ? (
          <section className="metric-grid" aria-label="Practice portfolio summary">
            <MetricCard label="Portfolio value" value={formatSol(portfolio.totalValueSol)} note="Simulated mark-to-pool" icon={<WalletCards size={17} />} />
            <MetricCard label="Available balance" value={formatSol(portfolio.cashSol)} note="Virtual SOL" icon={<ArrowDownLeft size={17} />} />
            <MetricCard label="Realized P&L" value={formatSol(portfolio.realizedPnlSol)} note="Weighted-average basis" icon={<Activity size={17} />} positive={portfolio.realizedPnlSol >= 0} />
            <MetricCard label="Unrealized P&L" value={formatSol(portfolio.unrealizedPnlSol)} note="Simulated prices" icon={<ArrowUpRight size={17} />} positive={portfolio.unrealizedPnlSol >= 0} />
            <MetricCard label="Total return" value={`${portfolio.returnPct >= 0 ? '+' : ''}${portfolio.returnPct.toFixed(2)}%`} note={`${portfolio.totalPnlSol >= 0 ? '+' : ''}${formatSol(portfolio.totalPnlSol)} since start`} icon={<BarChart3 size={17} />} positive={portfolio.returnPct >= 0} />
          </section>
        ) : (
          <section className="metric-grid devnet-metrics" aria-label="Devnet account summary">
            <MetricCard label="Devnet SOL balance" value={devnetSol === undefined ? '—' : formatSol(devnetSol, 4)} note={devnetStatusText} icon={<WalletCards size={17} />} />
            <MetricCard label="SPL token accounts" value={walletSnapshot ? String(walletSnapshot.tokenAccounts.length) : '—'} note="SPL Token + Token-2022" icon={<Activity size={17} />} />
            <MetricCard label="Verified markets" value="0" note="No verified route configured" icon={<ShieldCheck size={17} />} />
            <MetricCard label="Real swaps" value="Locked" note="No quote will be fabricated" icon={<CircleHelp size={17} />} />
            <MetricCard label="Network" value="Devnet only" note="RPC cluster check before reads" icon={<BarChart3 size={17} />} />
          </section>
        )}

        <div className="terminal-grid">
          <aside className="left-rail panel">
            <div className="panel-heading">
              <div><p className="eyebrow">{isPractice ? 'SIMULATED MARKETS' : 'DEVNET MARKETS'}</p><h2>{isPractice ? 'Watchlist' : 'Market access'}</h2></div>
              <span className="count-pill">{isPractice ? filteredTokens.length.toString().padStart(2, '0') : '00'}</span>
            </div>
            {isPractice ? (
              <>
                <label className="search-field"><Search size={15} /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search tokens" aria-label="Search practice tokens" /><kbd>/</kbd></label>
                <div className="watchlist">
                  {filteredTokens.map((token, index) => {
                    const pool = practice.pools[token.id];
                    const price = pool.solReserve / pool.tokenReserve;
                    const position = practice.positions[token.id];
                    const isSelected = selectedId === token.id;
                    return (
                      <button className={`watch-row ${isSelected ? 'active' : ''}`} key={token.id} onClick={() => { setSelectedId(token.id); setTradeMessage(null); }}>
                        <span className={`token-icon token-${index % 5}`}>{token.symbol.slice(0, 1)}</span>
                        <span className="watch-name"><strong>{token.symbol}</strong><small>{token.name}</small></span>
                        <span className="watch-price"><strong>{priceText(price)}</strong><small>{formatSol(position?.quantity ?? 0, 2)}</small></span>
                      </button>
                    );
                  })}
                  {filteredTokens.length === 0 && <p className="empty-note">No simulated tokens match that search.</p>}
                </div>
                <div className="rail-note"><Info size={14} /><span>Every token and price in this list is simulated. These are not real mints.</span></div>
              </>
            ) : (
              <div className="market-lock-card">
                <span className="lock-orbit"><ShieldCheck size={19} /></span>
                <strong>No verified pools</strong>
                <p>Devnet swaps need an on-chain verified pool and a supported quote route. No market is enabled in this build.</p>
                <div className="micro-status"><span className="status-dot muted" />Market data unavailable</div>
              </div>
            )}
            <div className="rail-footer"><span className="eyebrow">{isPractice ? 'POOL MODEL' : 'NETWORK'}</span><strong>{isPractice ? 'Constant product · x × y = k' : 'Solana Devnet'}</strong></div>
          </aside>

          <section className="center-column">
            {isPractice ? (
              <MarketChart token={selectedToken} price={spotPrice} history={history} pool={selectedPool} />
            ) : (
              <div className="panel empty-market-panel">
                <div className="empty-chart"><div className="empty-chart-grid" /><ShieldCheck size={28} /></div>
                <div className="empty-market-copy"><p className="eyebrow">NO VERIFIED DEVNET PRICE FEED</p><h2>Live market data isn’t configured.</h2><p>No real-time quote, price, or liquidity value is shown until a compatible Devnet pool is verified. Connect a wallet below to read its Devnet balances.</p></div>
                <div className="market-source-note"><Info size={14} />The Raydium SDK V2 demo notes that its API does not provide Devnet pool/farm data. This app does not infer a market from a token mint.</div>
              </div>
            )}

            {isPractice ? (
              <section className="panel positions-panel">
                <div className="panel-heading"><div><p className="eyebrow">OPEN INVENTORY</p><h2>Positions</h2></div><span className="subtle-count">{displayedPositions.length} {displayedPositions.length === 1 ? 'asset' : 'assets'}</span></div>
                {displayedPositions.length ? (
                  <div className="table-scroll"><table><thead><tr><th>Asset</th><th>Quantity</th><th>Avg. entry</th><th>Mark value</th><th>Unrealized</th></tr></thead><tbody>
                    {displayedPositions.map((token) => {
                      const position = practice.positions[token.id];
                      const pool = practice.pools[token.id];
                      const price = pool.solReserve / pool.tokenReserve;
                      const value = position.quantity * price;
                      const pnl = value - position.costBasisSol;
                      return <tr key={token.id} onClick={() => setSelectedId(token.id)} className="clickable-row"><td><span className="asset-inline"><span className="token-icon small">{token.symbol.slice(0, 1)}</span><span><strong>{token.symbol}</strong><small>SIMULATED</small></span></span></td><td>{formatToken(position.quantity)}</td><td>{priceText(averageEntryPrice(position))}</td><td>{formatSol(value, 3)}</td><td className={pnl >= 0 ? 'positive-text' : 'negative-text'}>{pnl >= 0 ? '+' : ''}{formatSol(pnl, 3)}</td></tr>;
                    })}
                  </tbody></table></div>
                ) : <div className="empty-table"><span className="empty-icon"><WalletCards size={17} /></span><p>No positions yet</p><small>Choose a simulated token and place a practice trade to get started.</small></div>}
              </section>
            ) : (
              <section className="panel wallet-section">{devnetLoadError
                ? <p className="network-error-note">{devnetLoadError}</p>
                : DevnetWorkspaceView
                  ? <DevnetWorkspaceView onSnapshot={setWalletSnapshot} />
                  : <div className="network-check-card"><span className="network-check-icon">…</span><div><strong>Loading Devnet wallet tools</strong><small>Wallet support is loaded only when you choose Devnet mode.</small></div></div>}
              </section>
            )}

            <section className="panel activity-panel">
              <div className="panel-heading"><div><p className="eyebrow">{isPractice ? 'LOCAL LEDGER' : 'DEVNET STATUS'}</p><h2>{isPractice ? 'Recent activity' : 'On-chain actions'}</h2></div><span className="subtle-count"><History size={14} />{isPractice ? `${practice.history.length} trades` : 'No swap history'}</span></div>
              {isPractice ? (
                practice.history.length ? <div className="activity-list">{practice.history.slice(0, 5).map((trade) => (
                  <div className="activity-row" key={trade.id}><span className={`activity-icon ${trade.side}`}>{trade.side === 'buy' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><span className="activity-main"><strong>{trade.side === 'buy' ? 'Bought' : 'Sold'} {trade.tokenSymbol}</strong><small>SIMULATED · {new Date(trade.timestamp).toLocaleString()}</small></span><span className="activity-value"><strong>{trade.side === 'buy' ? `−${formatSol(trade.amountIn, 3)}` : `+${formatSol(trade.amountOut, 3)}`}</strong><small>{trade.realizedPnlSol ? `P&L ${trade.realizedPnlSol >= 0 ? '+' : ''}${formatSol(trade.realizedPnlSol, 3)}` : `Fee ${formatSol(trade.fee, 4)}`}</small></span></div>
                ))}</div> : <div className="empty-table compact"><span className="empty-icon"><Clock3 size={16} /></span><p>No trades recorded</p><small>Your local simulated history will appear here.</small></div>
              ) : <p className="devnet-activity-note"><Info size={15} />Wallet reads do not sign transactions. Mint creation will display its confirmed Devnet signature in the wallet panel.</p>}
            </section>
          </section>

          <aside className="right-rail">
            <TradePanel
              mode={mode}
              token={selectedToken}
              price={spotPrice}
              side={side}
              onSideChange={(next) => { setSide(next); setTradeMessage(null); }}
              amount={amount}
              onAmountChange={setAmount}
              inputUnit={inputUnit}
              onInputUnitChange={setInputUnit}
              quote={quoteState.quote}
              quoteError={quoteState.error}
              availableSol={practice.cashSol}
              availableToken={practice.positions[selectedId]?.quantity ?? 0}
              feeBps={practice.settings.feeBps}
              slippageBps={practice.settings.slippageBps}
              message={tradeMessage}
              onTrade={onTrade}
              realSwapReason={REAL_SWAP_UNAVAILABLE_REASON}
            />
            {isPractice ? (
              <div className="panel coach-card"><span className="coach-icon"><Info size={16} /></span><div><strong>Learning mode</strong><p>Quotes use a local constant-product AMM. A trade here never signs or broadcasts a transaction.</p></div></div>
            ) : (
              <div className="panel devnet-summary"><p className="eyebrow">DEVNET WALLET</p><div className="devnet-summary-row"><span>Balance</span><strong>{devnetSol === undefined ? '—' : formatSol(devnetSol, 4)}</strong></div><div className="devnet-summary-row"><span>Address</span><strong>{walletSnapshot ? compactAddress(walletSnapshot.address) : 'Not connected'}</strong></div><div className="devnet-summary-row"><span>Real swaps</span><strong className="muted-text">Disabled</strong></div><a href="https://faucet.solana.com/" target="_blank" rel="noreferrer">Devnet faucet <ExternalLink size={13} /></a></div>
            )}
          </aside>
        </div>

        <footer className="footer"><span>MEME PLAYGROUND <span className="footer-dot">/</span> {isPractice ? 'PAPER MARKETS ONLY' : 'SOLANA DEVNET ONLY'}</span><span><ShieldCheck size={13} /> No mainnet trades, deposits, or seed phrases</span></footer>
      </main>

      {showSettings && <SettingsDialog state={practice} onClose={() => setShowSettings(false)} onSave={updatePracticeSettings} />}
    </div>
  );
}

function MetricCard({ label, value, note, icon, positive }: { label: string; value: string; note: string; icon: React.ReactNode; positive?: boolean }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong className={positive === undefined ? '' : positive ? 'positive-text' : 'negative-text'}>{value}</strong><small>{note}</small></article>;
}

function SettingsDialog({ state, onClose, onSave }: { state: PracticeState; onClose: () => void; onSave: (settings: PracticeSettings) => void }) {
  const [settings, setSettings] = useState<PracticeSettings>({ ...state.settings });
  const [error, setError] = useState('');
  const startingBalanceChanged = settings.startingBalanceSol !== state.settings.startingBalanceSol;

  function save() {
    if (!Number.isFinite(settings.startingBalanceSol) || settings.startingBalanceSol <= 0
      || !Number.isFinite(settings.virtualLiquiditySol) || settings.virtualLiquiditySol <= 0
      || settings.feeBps < 0 || settings.feeBps > 1_000
      || settings.slippageBps < 0 || settings.slippageBps > 2_000
      || settings.volatilityBps < 0 || settings.volatilityBps > 500) {
      setError('Check the values: starting balance and liquidity must be positive; fee ≤10%, slippage ≤20%, movement ≤5% per tick.');
      return;
    }
    onSave(settings);
    onClose();
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-heading"><div><p className="eyebrow">PRACTICE ACCOUNT</p><h2 id="settings-title">Simulation settings</h2></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={18} /></button></div>
      <p className="settings-copy">Tune the local model. These controls never change Solana Devnet or a wallet.</p>
      <div className="settings-form">
        <label>Starting virtual balance <span className="input-with-suffix"><input type="number" min="1" step="1" value={settings.startingBalanceSol} onChange={(event) => setSettings({ ...settings, startingBalanceSol: Number(event.target.value) })} /><i>SOL</i></span></label>
        <label>Virtual pool liquidity <span className="input-with-suffix"><input type="number" min="1" step="50" value={settings.virtualLiquiditySol} onChange={(event) => setSettings({ ...settings, virtualLiquiditySol: Number(event.target.value) })} /><i>SOL / pool</i></span></label>
        <label>Trading fee <span className="input-with-suffix"><input type="number" min="0" max="10" step="0.01" value={(settings.feeBps / 100).toFixed(2)} onChange={(event) => setSettings({ ...settings, feeBps: Math.round(Number(event.target.value) * 100) })} /><i>%</i></span></label>
        <label>Slippage tolerance <span className="input-with-suffix"><input type="number" min="0" max="20" step="0.1" value={(settings.slippageBps / 100).toFixed(1)} onChange={(event) => setSettings({ ...settings, slippageBps: Math.round(Number(event.target.value) * 100) })} /><i>%</i></span></label>
        <label>Price movement per 5 seconds <span className="input-with-suffix"><input type="number" min="0" max="5" step="0.1" value={(settings.volatilityBps / 100).toFixed(1)} onChange={(event) => setSettings({ ...settings, volatilityBps: Math.round(Number(event.target.value) * 100) })} /><i>%</i></span></label>
        <div className="settings-toggle-row"><span><strong>Enable simulated price movement</strong><small>Random drift, local only</small></span><button className={`toggle ${settings.volatilityEnabled ? 'on' : ''}`} onClick={() => setSettings({ ...settings, volatilityEnabled: !settings.volatilityEnabled })} role="switch" aria-checked={settings.volatilityEnabled} aria-label="Enable simulated price movement"><span /></button></div>
        <div className="settings-toggle-row"><span><strong>Seeded chart history</strong><small>Historical line is generated locally</small></span><button className={`toggle ${settings.seededHistory ? 'on' : ''}`} onClick={() => setSettings({ ...settings, seededHistory: !settings.seededHistory })} role="switch" aria-checked={settings.seededHistory} aria-label="Enable seeded chart history"><span /></button></div>
      </div>
      {startingBalanceChanged && <p className="reset-warning"><Info size={14} />Changing the starting balance resets this practice account and clears its positions and history.</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={save}>{startingBalanceChanged ? 'Reset & save settings' : 'Save settings'}</button></div>
    </section>
  </div>;
}

export { App, formatSol, formatToken, priceText };
