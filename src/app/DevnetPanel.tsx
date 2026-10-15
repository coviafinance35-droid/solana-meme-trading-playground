import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AlertTriangle, CheckCircle2, Circle, Copy, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';
import { assertDevnetConnection, devnetExplorerUrl } from '../lib/devnet';
import { createDevnetMint, parseInitialSupply } from '../lib/token-creation';
import { readDevnetWalletSnapshot } from '../lib/wallet';
import type { DevnetWalletSnapshot } from '../lib/wallet';

function short(value: string): string { return `${value.slice(0, 6)}…${value.slice(-5)}`; }
function sol(value: number): string { return `${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} SOL`; }

export function DevnetPanel({ active, onSnapshot }: { active: boolean; onSnapshot: (snapshot: DevnetWalletSnapshot | null) => void }) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [network, setNetwork] = useState<'idle' | 'checking' | 'online' | 'error'>('idle');
  const [networkError, setNetworkError] = useState('');
  const [snapshot, setSnapshot] = useState<DevnetWalletSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);
  const [name, setName] = useState('Practice Token');
  const [symbol, setSymbol] = useState('TEST');
  const [decimals, setDecimals] = useState('6');
  const [supply, setSupply] = useState('1000000');
  const [mintPending, setMintPending] = useState(false);
  const [mintError, setMintError] = useState('');
  const [mintResult, setMintResult] = useState<{ mintAddress: string; signature: string; tokenAccount: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!active) return;
    setRefreshing(true);
    setNetwork('checking');
    setNetworkError('');
    try {
      await assertDevnetConnection(connection);
      setNetwork('online');
      if (connected && publicKey) {
        const walletData = await readDevnetWalletSnapshot(connection, publicKey);
        setSnapshot(walletData);
        onSnapshot(walletData);
      } else {
        setSnapshot(null);
        onSnapshot(null);
      }
    } catch (error) {
      setNetwork('error');
      setNetworkError(error instanceof Error ? error.message : 'Could not verify the Devnet connection.');
      setSnapshot(null);
      onSnapshot(null);
    } finally {
      setRefreshing(false);
    }
  }, [active, connection, connected, onSnapshot, publicKey]);

  useEffect(() => {
    if (!active) {
      setNetwork('idle');
      setSnapshot(null);
      onSnapshot(null);
      return;
    }
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 20_000);
    return () => window.clearInterval(timer);
  }, [active, onSnapshot, refresh]);

  async function createMint() {
    setMintError('');
    setMintResult(null);
    if (!connected || !publicKey) { setMintError('Connect a Devnet wallet before creating a mint.'); return; }
    const parsedDecimals = Number(decimals);
    if (!name.trim() || name.trim().length > 32) { setMintError('Enter a token name from 1 to 32 characters.'); return; }
    if (!/^[A-Za-z0-9]{2,10}$/.test(symbol.trim())) { setMintError('Use a symbol with 2–10 letters or numbers.'); return; }
    try { parseInitialSupply(supply, parsedDecimals); }
    catch (error) { setMintError(error instanceof Error ? error.message : 'Enter a valid initial supply.'); return; }
    if (network !== 'online') { setMintError('Verify the Devnet connection before creating a mint.'); return; }

    setMintPending(true);
    try {
      const result = await createDevnetMint({ decimals: parsedDecimals, initialSupply: supply, owner: publicKey }, connection, sendTransaction);
      setMintResult(result);
      await refresh();
    } catch (error) {
      setMintError(error instanceof Error ? error.message : 'The mint transaction failed.');
    } finally {
      setMintPending(false);
    }
  }

  async function copyAddress(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }

  return <div className="devnet-panel-content">
    <div className="devnet-panel-head"><div><p className="eyebrow">WALLET & NETWORK</p><h2>Devnet access</h2></div><div className={`network-chip network-${network}`}><span className="status-dot" />{network === 'online' ? 'DEVNET VERIFIED' : network === 'checking' ? 'CHECKING RPC' : network === 'error' ? 'NETWORK ERROR' : 'NOT CHECKED'}</div></div>
    <div className="network-check-card"><div className="network-check-icon">{network === 'online' ? <CheckCircle2 size={17} /> : network === 'error' ? <AlertTriangle size={17} /> : network === 'checking' ? <LoaderCircle size={17} className="spin" /> : <Circle size={17} />}</div><div><strong>{network === 'online' ? 'Connected to Solana Devnet' : network === 'checking' ? 'Checking RPC cluster' : network === 'error' ? 'Devnet verification failed' : 'Devnet check not started'}</strong><small>{networkError || 'The configured RPC genesis hash is checked before wallet reads.'}</small></div><button className="icon-button refresh-button" onClick={() => void refresh()} disabled={!active || refreshing} title="Refresh Devnet status"><RefreshCw size={15} className={refreshing ? 'spin' : ''} /></button></div>
    <div className="wallet-connect-row">
      <div className="wallet-identity-icon"><Wallet size={18} /></div>
      <div className="wallet-identity">
        <strong>{connected && publicKey ? 'Wallet connected' : 'Connect a Solana wallet'}</strong>
        <small title={connected && publicKey ? publicKey.toBase58() : undefined}>{connected && publicKey ? `${short(publicKey.toBase58())} · Devnet only` : 'Phantom and compatible Wallet Standard wallets'}</small>
      </div>
      {connected && publicKey && <div className="wallet-address-tools">
        <button className="icon-button" onClick={() => void copyAddress(publicKey.toBase58())} aria-label={copied ? 'Wallet address copied' : 'Copy full wallet address'} title={copied ? 'Copied' : 'Copy full address'}><Copy size={14} />{copied && <span>Copied</span>}</button>
        <a className="address-explorer-link" href={devnetExplorerUrl('address', publicKey.toBase58())} target="_blank" rel="noreferrer" aria-label="Open wallet in Devnet Explorer" title="Open wallet in Devnet Explorer"><ExternalLink size={14} /></a>
      </div>}
      <WalletMultiButton className="wallet-adapter-button" />
    </div>
    {connected && snapshot && <div className="wallet-data-grid"><div className="wallet-data-card"><span>Live balance</span><strong>{sol(snapshot.solBalance)}</strong><small>Confirmed Devnet SOL</small></div><div className="wallet-data-card"><span>Token accounts</span><strong>{snapshot.tokenAccounts.length}</strong><small>SPL Token + Token-2022</small></div></div>}
    {connected && snapshot && <div className="token-account-list"><div className="subsection-title"><strong>Token balances</strong><span>{snapshot.tokenAccounts.length} accounts</span></div>{snapshot.tokenAccounts.length ? snapshot.tokenAccounts.slice(0, 8).map((account) => <div className="token-account-row" key={account.accountAddress}><span className="token-account-symbol">SPL</span><span className="token-account-mint"><strong title={account.mint}>{short(account.mint)}</strong><small>{account.program} · {account.decimals} decimals</small></span><strong>{Number(account.uiAmount).toLocaleString('en-US', { maximumFractionDigits: 5 })}</strong><a href={devnetExplorerUrl('address', account.mint)} target="_blank" rel="noreferrer" aria-label="Open mint in Devnet Explorer"><ExternalLink size={13} /></a></div>) : <p className="muted-empty">No SPL token balances found for this wallet on Devnet.</p>}</div>}
    {network === 'error' && <p className="network-error-note"><AlertTriangle size={14} />Wallet balances and token creation remain unavailable until Devnet is verified.</p>}
    <div className="devnet-actions"><div><span className="eyebrow">SPL TOKEN MINT</span><strong>Create a test token on Devnet</strong><small>A mint is not a trading market. Metadata is not uploaded.</small></div><button className="secondary-button" onClick={() => { setMintOpen(true); setMintError(''); }} disabled={!active || network !== 'online'}><Sparkles size={14} />Create mint</button></div>
    {mintResult && <div className="mint-result"><div className="mint-result-icon"><CheckCircle2 size={17} /></div><div className="mint-result-main"><strong>Mint confirmed on Devnet</strong><a href={devnetExplorerUrl('address', mintResult.mintAddress)} target="_blank" rel="noreferrer">{short(mintResult.mintAddress)} <ExternalLink size={12} /></a><small>Initial supply is in the connected wallet. No market was created.</small></div><a className="explorer-link" href={devnetExplorerUrl('tx', mintResult.signature)} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12} /></a></div>}
    {mintOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !mintPending) setMintOpen(false); }}><section className="mint-modal" role="dialog" aria-modal="true" aria-labelledby="mint-title"><div className="modal-heading"><div><p className="eyebrow">USER-INITIATED ON-CHAIN ACTION</p><h2 id="mint-title">Create SPL token mint</h2></div><button className="icon-button" onClick={() => setMintOpen(false)} disabled={mintPending} aria-label="Close mint dialog"><X size={18} /></button></div><div className="mint-safety-note"><ShieldCheck size={17} /><p>This creates a real token mint on <strong>Devnet only</strong>. The wallet will ask you to review and sign the transaction. The app never asks for seed phrases or private keys.</p></div><div className="mint-form"><label>Token name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} /></label><label>Symbol<input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} maxLength={10} /></label><div className="mint-form-duo"><label>Decimals<input type="number" min="0" max="9" value={decimals} onChange={(event) => setDecimals(event.target.value)} /></label><label>Initial supply<input type="text" inputMode="decimal" value={supply} onChange={(event) => setSupply(event.target.value)} /></label></div><p className="mint-disclaimer">Creating a mint does not create a liquidity pool. No metadata or market is created by this action.</p>{mintError && <p className="form-error">{mintError}</p>}</div><div className="modal-actions"><button className="secondary-button" onClick={() => setMintOpen(false)} disabled={mintPending}>Cancel</button><button className="primary-button" onClick={() => void createMint()} disabled={mintPending || network !== 'online' || !connected}>{mintPending ? <><LoaderCircle size={15} className="spin" />Waiting for confirmation…</> : 'Create on Devnet'}</button></div></section></div>}
    <p className="devnet-footnote"><ShieldCheck size={13} />Network is pinned to Devnet. No mainnet switch is available.</p>
  </div>;
}
