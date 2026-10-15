export type TradeSide = 'buy' | 'sell';
export type TradingMode = 'practice' | 'devnet';

export interface TokenSpec {
  id: string;
  name: string;
  symbol: string;
  description: string;
  initialPriceSol: number;
}

export interface PoolState {
  solReserve: number;
  tokenReserve: number;
}

export interface PracticeSettings {
  startingBalanceSol: number;
  virtualLiquiditySol: number;
  feeBps: number;
  slippageBps: number;
  volatilityEnabled: boolean;
  volatilityBps: number;
  seededHistory: boolean;
}

export interface Position {
  quantity: number;
  costBasisSol: number;
}

export interface TradeRecord {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  side: TradeSide;
  amountIn: number;
  amountOut: number;
  fee: number;
  priceImpactPct: number;
  realizedPnlSol: number;
  timestamp: number;
  simulated: true;
}

export interface PracticeState {
  version: 1;
  createdAt: number;
  settings: PracticeSettings;
  cashSol: number;
  realizedPnlSol: number;
  pools: Record<string, PoolState>;
  positions: Record<string, Position>;
  history: TradeRecord[];
}

export interface SwapQuote {
  side: TradeSide;
  amountIn: number;
  amountOut: number;
  fee: number;
  minimumReceived: number;
  priceImpactPct: number;
  spotPriceSol: number;
  averagePriceSol: number;
  nextPool: PoolState;
}

export interface PortfolioSummary {
  cashSol: number;
  marketValueSol: number;
  totalValueSol: number;
  realizedPnlSol: number;
  unrealizedPnlSol: number;
  totalPnlSol: number;
  returnPct: number;
}

export interface DevnetTokenAccount {
  mint: string;
  amount: string;
  uiAmount: string;
  decimals: number;
  accountAddress: string;
  program: 'SPL Token' | 'Token-2022';
}
