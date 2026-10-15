import type { PortfolioSummary, Position, PracticeState } from './models';
import { PRACTICE_TOKENS } from './tokens';

export function buyPosition(current: Position | undefined, tokenQuantity: number, totalCostSol: number): Position {
  if (!Number.isFinite(tokenQuantity) || tokenQuantity <= 0) throw new Error('Bought token quantity must be positive.');
  if (!Number.isFinite(totalCostSol) || totalCostSol < 0) throw new Error('Buy cost cannot be negative.');
  return {
    quantity: (current?.quantity ?? 0) + tokenQuantity,
    costBasisSol: (current?.costBasisSol ?? 0) + totalCostSol,
  };
}

export interface SaleAccounting {
  remaining: Position;
  basisRemovedSol: number;
  realizedPnlSol: number;
}

export function sellPosition(current: Position, tokenQuantity: number, proceedsSol: number): SaleAccounting {
  if (!Number.isFinite(tokenQuantity) || tokenQuantity <= 0) throw new Error('Sold token quantity must be positive.');
  if (tokenQuantity > current.quantity + 1e-12) throw new Error('Insufficient token balance.');
  if (!Number.isFinite(proceedsSol) || proceedsSol < 0) throw new Error('Sale proceeds cannot be negative.');

  const sold = Math.min(tokenQuantity, current.quantity);
  const fraction = sold / current.quantity;
  const basisRemovedSol = current.costBasisSol * fraction;
  const quantityLeft = Math.max(0, current.quantity - sold);
  const remainingBasis = quantityLeft <= 1e-12 ? 0 : Math.max(0, current.costBasisSol - basisRemovedSol);

  return {
    remaining: { quantity: quantityLeft, costBasisSol: remainingBasis },
    basisRemovedSol,
    realizedPnlSol: proceedsSol - basisRemovedSol,
  };
}

export function averageEntryPrice(position: Position | undefined): number {
  if (!position || position.quantity <= 0) return 0;
  return position.costBasisSol / position.quantity;
}

export function summarizePortfolio(state: PracticeState): PortfolioSummary {
  let marketValueSol = 0;
  let unrealizedPnlSol = 0;

  for (const token of PRACTICE_TOKENS) {
    const position = state.positions[token.id];
    const pool = state.pools[token.id];
    if (!position || position.quantity <= 0 || !pool || pool.tokenReserve <= 0) continue;
    const markPrice = pool.solReserve / pool.tokenReserve;
    const value = position.quantity * markPrice;
    marketValueSol += value;
    unrealizedPnlSol += value - position.costBasisSol;
  }

  const totalValueSol = state.cashSol + marketValueSol;
  const totalPnlSol = totalValueSol - state.settings.startingBalanceSol;
  return {
    cashSol: state.cashSol,
    marketValueSol,
    totalValueSol,
    realizedPnlSol: state.realizedPnlSol,
    unrealizedPnlSol,
    totalPnlSol,
    returnPct: state.settings.startingBalanceSol > 0 ? totalPnlSol / state.settings.startingBalanceSol * 100 : 0,
  };
}
