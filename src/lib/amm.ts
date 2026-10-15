import type { PoolState, SwapQuote, TradeSide } from './models';

const BPS = 10_000;

function validatePool(pool: PoolState): void {
  if (!Number.isFinite(pool.solReserve) || !Number.isFinite(pool.tokenReserve)) {
    throw new Error('Pool reserves must be finite numbers.');
  }
  if (pool.solReserve <= 0 || pool.tokenReserve <= 0) {
    throw new Error('Pool reserves must both be greater than zero.');
  }
}

function validateParameters(amountIn: number, feeBps: number, slippageBps: number): void {
  if (!Number.isFinite(amountIn) || amountIn <= 0) throw new Error('Enter an amount greater than zero.');
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1_000) {
    throw new Error('Fee must be between 0 and 1,000 basis points.');
  }
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 2_000) {
    throw new Error('Slippage must be between 0 and 2,000 basis points.');
  }
}

function quote(
  side: TradeSide,
  pool: PoolState,
  amountIn: number,
  feeBps: number,
  slippageBps: number,
): SwapQuote {
  validatePool(pool);
  validateParameters(amountIn, feeBps, slippageBps);
  const fee = amountIn * feeBps / BPS;
  const netInput = amountIn - fee;
  if (netInput <= 0) throw new Error('The fee leaves no amount to swap.');

  const spotPriceSol = pool.solReserve / pool.tokenReserve;
  let amountOut: number;
  let priceImpactPct: number;
  let nextPool: PoolState;
  let averagePriceSol: number;

  if (side === 'buy') {
    amountOut = pool.tokenReserve * netInput / (pool.solReserve + netInput);
    const spotOutput = netInput / spotPriceSol;
    priceImpactPct = spotOutput > 0 ? Math.max(0, (1 - amountOut / spotOutput) * 100) : 0;
    nextPool = { solReserve: pool.solReserve + amountIn, tokenReserve: pool.tokenReserve - amountOut };
    averagePriceSol = amountIn / amountOut;
  } else {
    amountOut = pool.solReserve * netInput / (pool.tokenReserve + netInput);
    const spotOutput = netInput * spotPriceSol;
    priceImpactPct = spotOutput > 0 ? Math.max(0, (1 - amountOut / spotOutput) * 100) : 0;
    nextPool = { solReserve: pool.solReserve - amountOut, tokenReserve: pool.tokenReserve + amountIn };
    averagePriceSol = amountOut / amountIn;
  }

  if (!Number.isFinite(amountOut) || amountOut <= 0 || nextPool.solReserve <= 0 || nextPool.tokenReserve <= 0) {
    throw new Error('This trade exceeds the available simulated liquidity.');
  }

  return {
    side,
    amountIn,
    amountOut,
    fee,
    minimumReceived: amountOut * (1 - slippageBps / BPS),
    priceImpactPct,
    spotPriceSol,
    averagePriceSol,
    nextPool,
  };
}

export function quoteBuy(pool: PoolState, solIn: number, feeBps: number, slippageBps: number): SwapQuote {
  return quote('buy', pool, solIn, feeBps, slippageBps);
}

export function quoteSell(pool: PoolState, tokenIn: number, feeBps: number, slippageBps: number): SwapQuote {
  return quote('sell', pool, tokenIn, feeBps, slippageBps);
}

export function quoteSwap(
  side: TradeSide,
  pool: PoolState,
  amountIn: number,
  feeBps: number,
  slippageBps: number,
): SwapQuote {
  return quote(side, pool, amountIn, feeBps, slippageBps);
}

/** Quote a buy when the user enters the desired output token quantity. */
export function quoteBuyForTokens(
  pool: PoolState,
  tokenOut: number,
  feeBps: number,
  slippageBps: number,
): SwapQuote {
  validatePool(pool);
  validateParameters(tokenOut, feeBps, slippageBps);
  if (tokenOut >= pool.tokenReserve) throw new Error('Requested tokens exceed the simulated pool reserve.');
  const feeRate = feeBps / BPS;
  const netSolRequired = pool.solReserve * tokenOut / (pool.tokenReserve - tokenOut);
  return quoteBuy(pool, netSolRequired / (1 - feeRate), feeBps, slippageBps);
}

/** Quote a sell when the user enters the desired SOL output amount. */
export function quoteSellForSol(
  pool: PoolState,
  solOut: number,
  feeBps: number,
  slippageBps: number,
): SwapQuote {
  validatePool(pool);
  validateParameters(solOut, feeBps, slippageBps);
  if (solOut >= pool.solReserve) throw new Error('Requested SOL exceeds the simulated pool reserve.');
  const feeRate = feeBps / BPS;
  const netTokenRequired = pool.tokenReserve * solOut / (pool.solReserve - solOut);
  return quoteSell(pool, netTokenRequired / (1 - feeRate), feeBps, slippageBps);
}
