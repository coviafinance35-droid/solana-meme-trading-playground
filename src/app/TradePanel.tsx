import { ArrowDownUp, ArrowRight, LockKeyhole, RotateCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { SwapQuote, TokenSpec, TradeSide, TradingMode } from '../lib/models';

function number(value: number, maximum = 6): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: maximum });
}

export function TradePanel({
  mode, token, price, side, onSideChange, amount, onAmountChange, inputUnit, onInputUnitChange,
  quote, quoteError, availableSol, availableToken, feeBps, slippageBps, message, onTrade, realSwapReason,
}: {
  mode: TradingMode;
  token: TokenSpec;
  price: number;
  side: TradeSide;
  onSideChange: (side: TradeSide) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  inputUnit: 'SOL' | 'TOKEN';
  onInputUnitChange: (unit: 'SOL' | 'TOKEN') => void;
  quote: SwapQuote | null;
  quoteError: string | null;
  availableSol: number;
  availableToken: number;
  feeBps: number;
  slippageBps: number;
  message: { kind: 'success' | 'error'; text: string } | null;
  onTrade: () => void;
  realSwapReason: string;
}) {
  const isPractice = mode === 'practice';
  const inputCurrency = side === 'buy'
    ? (inputUnit === 'SOL' ? 'SOL' : token.symbol)
    : (inputUnit === 'TOKEN' ? token.symbol : 'SOL');
  const outputCurrency = side === 'buy' ? token.symbol : 'SOL';
  const inputLabel = side === 'buy'
    ? (inputUnit === 'TOKEN' ? 'Target receive' : 'You pay')
    : (inputUnit === 'SOL' ? 'Target receive' : 'You sell');
  const feeCurrency = side === 'buy' ? 'SOL' : token.symbol;
  const typedAmount = Number(amount);
  const insufficient = isPractice && typedAmount > 0 && (
    side === 'buy' && inputUnit === 'SOL' ? typedAmount > availableSol
      : side === 'sell' && inputUnit === 'TOKEN' ? typedAmount > availableToken
        : side === 'buy' ? (quote?.amountIn ?? Infinity) > availableSol
          : (quote?.amountIn ?? Infinity) > availableToken
  );
  const cannotExecute = !isPractice || !quote || insufficient;
  const halfBalance = side === 'buy'
    ? (inputUnit === 'SOL' ? availableSol / 2 : (availableSol / 2) / price)
    : (inputUnit === 'TOKEN' ? availableToken / 2 : (availableToken / 2) * price);
  const amountForTrade = (fraction: number) => {
    if (side === 'buy') return inputUnit === 'SOL' ? availableSol * fraction : availableSol * fraction / price;
    return inputUnit === 'TOKEN' ? availableToken * fraction : availableToken * fraction * price;
  };

  return <section className="panel trade-panel">
    <div className="trade-panel-head"><div><p className="eyebrow">{isPractice ? 'SIMULATED EXECUTION' : 'DEVNET SWAP'}</p><h2>Trade {token.symbol}</h2></div><span className={`trade-network ${isPractice ? 'sim' : 'dev'}`}>{isPractice ? 'SIM' : 'DEVNET'}</span></div>
    <div className="trade-tabs" role="tablist" aria-label="Trade action"><button role="tab" aria-selected={side === 'buy'} className={side === 'buy' ? 'selected buy' : ''} onClick={() => onSideChange('buy')}>Buy</button><button role="tab" aria-selected={side === 'sell'} className={side === 'sell' ? 'selected sell' : ''} onClick={() => onSideChange('sell')}>Sell</button></div>
    <div className="trade-input-label"><span>{inputLabel}</span><span>{isPractice ? `Available ${side === 'buy' ? number(availableSol, 3) + ' SOL' : number(availableToken, 4) + ' ' + token.symbol}` : 'Wallet balance shown below'}</span></div>
    <div className="amount-box"><input type="number" min="0" step="any" value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="0.00" aria-label={`${side} amount`} disabled={!isPractice} /><button className="currency-pill" onClick={() => onInputUnitChange(inputUnit === 'SOL' ? 'TOKEN' : 'SOL')} disabled={!isPractice} title="Switch between input and target-output units">{inputCurrency}<ArrowDownUp size={13} /></button></div>
    <div className="quick-amounts"><button onClick={() => onAmountChange('0.1')} disabled={!isPractice}>0.1 {inputCurrency}</button><button onClick={() => onAmountChange('1')} disabled={!isPractice}>1 {inputCurrency}</button><button onClick={() => onAmountChange(String(halfBalance.toFixed(inputUnit === 'SOL' ? 3 : 4)))} disabled={!isPractice}>½ balance</button></div>
    <div className="receive-row"><div><span>You receive</span><strong>{quote ? `${number(quote.amountOut)} ${outputCurrency}` : '—'}</strong></div><ArrowRight size={15} /><div className="receive-right"><span>Minimum received</span><strong>{quote ? `${number(quote.minimumReceived)} ${outputCurrency}` : '—'}</strong></div></div>
    {isPractice ? (
      <div className="quote-breakdown">
        <div><span>Estimated input</span><strong>{quote ? `${number(quote.amountIn)} ${side === 'buy' ? 'SOL' : token.symbol}` : '—'}</strong></div>
        <div><span>Simulated price</span><strong>{price.toPrecision(5)} SOL</strong></div>
        <div><span>Trading fee ({(feeBps / 100).toFixed(2)}%)</span><strong>{quote ? `${number(quote.fee)} ${feeCurrency}` : '—'}</strong></div>
        <div><span>Price impact</span><strong className={quote && quote.priceImpactPct > 5 ? 'negative-text' : ''}>{quote ? `${quote.priceImpactPct.toFixed(2)}%` : '—'}</strong></div>
        <div><span>Slippage tolerance</span><strong>{(slippageBps / 100).toFixed(2)}%</strong></div>
      </div>
    ) : (
      <div className="real-swap-lock"><span className="lock-icon"><LockKeyhole size={15} /></span><div><strong>Real swap unavailable</strong><p>{realSwapReason}</p></div></div>
    )}
    {quoteError && isPractice && <p className="inline-error">{quoteError}</p>}
    {insufficient && isPractice && <p className="inline-error">Not enough simulated balance for this amount.</p>}
    {message && <p className={`trade-feedback ${message.kind}`}>{message.kind === 'success' ? <ShieldCheck size={14} /> : <RotateCcw size={14} />}{message.text}</p>}
    <button className={`execute-button ${side === 'sell' ? 'sell-button' : ''}`} onClick={onTrade} disabled={cannotExecute}>
      {isPractice ? `${side === 'buy' ? 'Buy' : 'Sell'} ${token.symbol} · Practice` : <><LockKeyhole size={15} /> Swaps unavailable</>}
    </button>
    {isPractice ? <p className="trade-disclaimer"><SlidersHorizontal size={12} />Local AMM · x × y = k · settings are adjustable</p> : <p className="trade-disclaimer devnet-copy"><ShieldCheck size={12} />No transaction will be signed or submitted</p>}
  </section>;
}
