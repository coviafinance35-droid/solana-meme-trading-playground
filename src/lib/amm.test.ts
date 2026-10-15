import { describe, expect, it } from 'vitest';
import { quoteBuy, quoteBuyForTokens, quoteSell, quoteSellForSol } from './amm';
import type { PoolState } from './models';

const pool: PoolState = { solReserve: 100, tokenReserve: 1_000_000 };

describe('constant-product AMM quotes', () => {
  it('quotes a buy below the spot-price output and charges the configured fee', () => {
    const quote = quoteBuy(pool, 10, 30, 100);
    expect(quote.amountOut).toBeGreaterThan(0);
    expect(quote.amountOut).toBeLessThan(100_000);
    expect(quote.fee).toBeCloseTo(0.03, 12);
    expect(quote.minimumReceived).toBeCloseTo(quote.amountOut * 0.99, 8);
    expect(quote.nextPool.solReserve).toBe(110);
  });

  it('increases constant product after a fee-retaining swap', () => {
    const quote = quoteBuy(pool, 5, 30, 100);
    const oldK = pool.solReserve * pool.tokenReserve;
    const nextK = quote.nextPool.solReserve * quote.nextPool.tokenReserve;
    expect(nextK).toBeGreaterThan(oldK);
  });

  it('quotes a sell with fee, minimum received, and updated reserves', () => {
    const quote = quoteSell(pool, 25_000, 30, 100);
    expect(quote.amountOut).toBeGreaterThan(0);
    expect(quote.fee).toBeCloseTo(75, 10);
    expect(quote.minimumReceived).toBeCloseTo(quote.amountOut * 0.99, 10);
    expect(quote.nextPool.tokenReserve).toBe(1_025_000);
  });

  it('inverts a desired token output into a buy input', () => {
    const quote = quoteBuyForTokens(pool, 50_000, 30, 100);
    expect(quote.amountOut).toBeCloseTo(50_000, 5);
    expect(quote.amountIn).toBeGreaterThan(5);
  });

  it('inverts desired SOL proceeds into a sell input', () => {
    const quote = quoteSellForSol(pool, 2, 30, 100);
    expect(quote.amountOut).toBeCloseTo(2, 8);
    expect(quote.amountIn).toBeGreaterThan(20_000);
  });

  it('rejects invalid amounts, impossible output targets, and invalid settings', () => {
    expect(() => quoteBuy(pool, 0, 30, 100)).toThrow(/greater than zero/);
    expect(() => quoteBuyForTokens(pool, pool.tokenReserve, 30, 100)).toThrow(/exceed/);
    expect(() => quoteSellForSol(pool, pool.solReserve, 30, 100)).toThrow(/exceeds/);
    expect(() => quoteSell(pool, 1, 1_001, 100)).toThrow(/Fee/);
  });
});
