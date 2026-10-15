import { describe, expect, it } from 'vitest';
import { averageEntryPrice, buyPosition, sellPosition, summarizePortfolio } from './portfolio';
import { createPracticeState, executePracticeTrade } from './practice-store';

describe('weighted-average position accounting', () => {
  it('includes full buy spend, including fees, in average entry cost', () => {
    const first = buyPosition(undefined, 100, 10.03);
    const combined = buyPosition(first, 50, 5.015);
    expect(combined.quantity).toBe(150);
    expect(combined.costBasisSol).toBeCloseTo(15.045, 10);
    expect(averageEntryPrice(combined)).toBeCloseTo(0.1003, 10);
  });

  it('removes the proportional weighted-average basis after a partial sale', () => {
    const position = { quantity: 100, costBasisSol: 20 };
    const sale = sellPosition(position, 25, 8);
    expect(sale.basisRemovedSol).toBe(5);
    expect(sale.remaining.quantity).toBe(75);
    expect(sale.remaining.costBasisSol).toBe(15);
    expect(sale.realizedPnlSol).toBe(3);
  });

  it('realizes a loss when proceeds are below the allocated basis', () => {
    const sale = sellPosition({ quantity: 5, costBasisSol: 10 }, 2, 3);
    expect(sale.realizedPnlSol).toBe(-1);
    expect(sale.remaining).toEqual({ quantity: 3, costBasisSol: 6 });
  });

  it('rejects selling more tokens than the position contains', () => {
    expect(() => sellPosition({ quantity: 1, costBasisSol: 2 }, 1.1, 3)).toThrow(/Insufficient/);
  });

  it('tracks partial practice trades and separates realized from unrealized P&L', () => {
    let state = createPracticeState();
    state = executePracticeTrade(state, 'bork', 'buy', 2).state;
    const bought = state.positions.bork;
    expect(bought.quantity).toBeGreaterThan(0);
    expect(bought.costBasisSol).toBe(2);
    expect(state.cashSol).toBeCloseTo(498, 10);

    const half = bought.quantity / 2;
    state = executePracticeTrade(state, 'bork', 'sell', half).state;
    expect(state.positions.bork.quantity).toBeCloseTo(half, 10);
    expect(state.positions.bork.costBasisSol).toBeCloseTo(1, 10);
    expect(state.history).toHaveLength(2);
    expect(state.history[0].realizedPnlSol).toBeTypeOf('number');

    const summary = summarizePortfolio(state);
    expect(summary.totalValueSol).toBeCloseTo(summary.cashSol + summary.marketValueSol, 10);
    expect(summary.totalPnlSol).toBeCloseTo(summary.realizedPnlSol + summary.unrealizedPnlSol, 7);
    expect(summary.returnPct).toBeCloseTo(summary.totalPnlSol / state.settings.startingBalanceSol * 100, 8);
  });
});
