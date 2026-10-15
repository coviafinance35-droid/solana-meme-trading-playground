import { quoteSwap } from './amm';
import type { PracticeSettings, PracticeState, SwapQuote, TradeSide } from './models';
import { PRACTICE_TOKENS, tokenById } from './tokens';
import { buyPosition, sellPosition } from './portfolio';

export const PRACTICE_STORAGE_KEY = 'meme-playground.practice.v1';
export const DEFAULT_SETTINGS: PracticeSettings = {
  startingBalanceSol: 500,
  virtualLiquiditySol: 1_000,
  feeBps: 30,
  slippageBps: 100,
  volatilityEnabled: false,
  volatilityBps: 80,
  seededHistory: true,
};

export function createPracticeState(settings: PracticeSettings = DEFAULT_SETTINGS): PracticeState {
  const pools = Object.fromEntries(PRACTICE_TOKENS.map((token) => [token.id, {
    solReserve: settings.virtualLiquiditySol,
    tokenReserve: settings.virtualLiquiditySol / token.initialPriceSol,
  }]));
  return {
    version: 1,
    createdAt: Date.now(),
    settings: { ...settings },
    cashSol: settings.startingBalanceSol,
    realizedPnlSol: 0,
    pools,
    positions: {},
    history: [],
  };
}

export function readPracticeState(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): PracticeState {
  if (!storage) return createPracticeState();
  try {
    const raw = storage.getItem(PRACTICE_STORAGE_KEY);
    if (!raw) return createPracticeState();
    const parsed: unknown = JSON.parse(raw);
    if (!isPracticeState(parsed)) return createPracticeState();
    return parsed;
  } catch {
    return createPracticeState();
  }
}

export function writePracticeState(state: PracticeState, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): void {
  storage?.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(state));
}

function isPracticeState(value: unknown): value is PracticeState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PracticeState>;
  return candidate.version === 1
    && typeof candidate.cashSol === 'number'
    && typeof candidate.realizedPnlSol === 'number'
    && Boolean(candidate.settings)
    && Boolean(candidate.pools)
    && Boolean(candidate.positions)
    && Array.isArray(candidate.history);
}

export function updateVolatilityPrice(state: PracticeState, tokenId: string, deltaBps: number): PracticeState {
  const pool = state.pools[tokenId];
  if (!pool || !Number.isFinite(deltaBps)) return state;
  const newPrice = (pool.solReserve / pool.tokenReserve) * (1 + deltaBps / 10_000);
  if (newPrice <= 0) return state;
  const k = pool.solReserve * pool.tokenReserve;
  const solReserve = Math.sqrt(k * newPrice);
  const tokenReserve = Math.sqrt(k / newPrice);
  return { ...state, pools: { ...state.pools, [tokenId]: { solReserve, tokenReserve } } };
}

export function getPracticeQuote(state: PracticeState, tokenId: string, side: TradeSide, amountIn: number): SwapQuote {
  const pool = state.pools[tokenId];
  if (!pool) throw new Error('No simulated pool is configured for this token.');
  return quoteSwap(side, pool, amountIn, state.settings.feeBps, state.settings.slippageBps);
}

export function executePracticeTrade(state: PracticeState, tokenId: string, side: TradeSide, amountIn: number): { state: PracticeState; quote: SwapQuote } {
  const token = tokenById(tokenId);
  const quote = getPracticeQuote(state, tokenId, side, amountIn);
  const currentPosition = state.positions[tokenId];
  let cashSol = state.cashSol;
  let realizedPnlSol = state.realizedPnlSol;
  let position = currentPosition;
  let realizedForTrade = 0;

  if (side === 'buy') {
    if (amountIn > state.cashSol + 1e-12) throw new Error('Insufficient simulated SOL balance.');
    position = buyPosition(currentPosition, quote.amountOut, amountIn);
    cashSol -= amountIn;
  } else {
    if (!currentPosition || amountIn > currentPosition.quantity + 1e-12) throw new Error('Insufficient simulated token balance.');
    const sale = sellPosition(currentPosition, amountIn, quote.amountOut);
    position = sale.remaining;
    realizedForTrade = sale.realizedPnlSol;
    realizedPnlSol += sale.realizedPnlSol;
    cashSol += quote.amountOut;
  }

  const nextPositions = { ...state.positions };
  if (!position || position.quantity <= 1e-12) delete nextPositions[tokenId];
  else nextPositions[tokenId] = position;

  const trade = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tokenId,
    tokenSymbol: token.symbol,
    side,
    amountIn,
    amountOut: quote.amountOut,
    fee: quote.fee,
    priceImpactPct: quote.priceImpactPct,
    realizedPnlSol: realizedForTrade,
    timestamp: Date.now(),
    simulated: true as const,
  };

  return {
    quote,
    state: {
      ...state,
      cashSol: Math.max(0, cashSol),
      realizedPnlSol,
      pools: { ...state.pools, [tokenId]: quote.nextPool },
      positions: nextPositions,
      history: [trade, ...state.history].slice(0, 100),
    },
  };
}
