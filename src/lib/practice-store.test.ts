import { describe, expect, it } from 'vitest';
import { createPracticeState, executePracticeTrade, readPracticeState, writePracticeState } from './practice-store';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

describe('practice-only account state', () => {
  it('persists a local practice balance and history', () => {
    const storage = memoryStorage();
    let state = createPracticeState();
    state = executePracticeTrade(state, 'bork', 'buy', 1).state;
    writePracticeState(state, storage);
    const restored = readPracticeState(storage);
    expect(restored.cashSol).toBeCloseTo(state.cashSol, 12);
    expect(restored.history).toHaveLength(1);
    expect(restored.history[0].simulated).toBe(true);
  });

  it('rejects simulated buys above the local virtual SOL balance', () => {
    const state = createPracticeState();
    expect(() => executePracticeTrade(state, 'bork', 'buy', state.cashSol + 1)).toThrow(/Insufficient simulated SOL/);
  });

  it('does not create holdings or change the account when a sell is invalid', () => {
    const state = createPracticeState();
    expect(() => executePracticeTrade(state, 'bork', 'sell', 1)).toThrow(/Insufficient simulated token/);
    expect(state.cashSol).toBe(state.settings.startingBalanceSol);
    expect(state.history).toHaveLength(0);
  });
});
