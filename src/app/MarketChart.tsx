import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Droplets, Info } from 'lucide-react';
import type { PoolState, TokenSpec } from '../lib/models';

export function makeSeededHistory(tokenId: string, currentPrice: number, count: number): number[] {
  let seed = [...tokenId].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7) || 1;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  const points: number[] = [];
  let value = currentPrice;
  for (let i = 0; i < count; i += 1) {
    value *= 1 + (random() - 0.53) * 0.032;
    points.push(value);
  }
  const scale = currentPrice / points[points.length - 1];
  return points.map((point) => point * scale);
}

type Range = '1H' | '24H' | '7D' | 'ALL';
const rangeCount: Record<Range, number> = { '1H': 12, '24H': 36, '7D': 72, ALL: 96 };

export function MarketChart({ token, price, history, pool }: { token: TokenSpec; price: number; history: number[]; pool: PoolState }) {
  const [range, setRange] = useState<Range>('24H');
  const values = useMemo(() => history.slice(-Math.min(rangeCount[range], history.length)), [history, range]);
  const chartValues = values.length ? values : [price];
  const min = Math.min(...chartValues);
  const max = Math.max(...chartValues);
  const spread = Math.max(max - min, Math.abs(price) * 0.0001, 1e-12);
  const points = chartValues.map((value, index) => {
    const x = chartValues.length === 1 ? 0 : index / (chartValues.length - 1) * 1000;
    const y = 184 - (value - min) / spread * 150;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const change = chartValues.length > 1 ? (chartValues[chartValues.length - 1] / chartValues[0] - 1) * 100 : 0;
  const reserveLabel = useMemo(() => pool.solReserve.toLocaleString('en-US', { maximumFractionDigits: 0 }), [pool.solReserve]);

  return <section className="panel chart-panel">
    <div className="chart-head">
      <div className="chart-title-group"><span className="token-icon hero-token">{token.symbol.slice(0, 1)}</span><div><div className="chart-title-line"><h2>{token.name}</h2><span className="sim-tag">SIMULATED</span></div><p>{token.symbol} <span className="chart-dot">·</span> No on-chain mint</p></div></div>
      <div className="chart-price-block"><strong>{price.toPrecision(5)} <small>SOL</small></strong><span className={change >= 0 ? 'positive-text' : 'negative-text'}>{change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change >= 0 ? '+' : ''}{change.toFixed(2)}% <small>seeded history</small></span></div>
    </div>
    <div className="chart-tools"><div className="chart-tabs"><button className="selected">Price</button><button disabled title="Volume is not simulated">Volume <Info size={12} /></button></div><div className="chart-range" role="group" aria-label="Simulated chart window">{(['1H', '24H', '7D', 'ALL'] as Range[]).map((option) => <button key={option} className={range === option ? 'selected' : ''} onClick={() => setRange(option)} aria-pressed={range === option}>{option}</button>)}</div></div>
    <div className="chart-canvas" role="img" aria-label={`${token.symbol} simulated price chart, ${range} window`}>
      <div className="chart-grid-lines"><span /><span /><span /><span /></div>
      <svg viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b8f36a" stopOpacity="0.19" /><stop offset="100%" stopColor="#b8f36a" stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,220 ${points} 1000,220`} fill="url(#price-fill)" />
        <polyline points={points} fill="none" stroke="#b8f36a" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="chart-y-labels"><span>{max.toPrecision(3)}</span><span>{((max + min) / 2).toPrecision(3)}</span><span>{min.toPrecision(3)}</span></div>
      <div className="chart-x-labels"><span>{range} · seeded</span><span>Simulated history</span><span>Now</span></div>
    </div>
    <div className="chart-foot"><div><span className="chart-legend" />SIMULATED PRICE <span className="chart-divider">/</span> Not market data</div><div className="pool-liquidity"><Droplets size={14} /><span>Virtual pool</span><strong>{reserveLabel} SOL</strong><span className="sim-tag">SIM</span></div></div>
  </section>;
}
