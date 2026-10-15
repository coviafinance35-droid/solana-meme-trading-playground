import type { TokenSpec } from './models';

/** These are fictional practice assets; no mint addresses or external prices are implied. */
export const PRACTICE_TOKENS: TokenSpec[] = [
  {
    id: 'bork',
    name: 'Bork Inu',
    symbol: 'BORK',
    description: 'The dog who found the liquidity pool.',
    initialPriceSol: 0.00042,
  },
  {
    id: 'frog',
    name: 'Frog Signal',
    symbol: 'FRÖG',
    description: 'A very serious amphibian thesis.',
    initialPriceSol: 0.00118,
  },
  {
    id: 'mooncat',
    name: 'Mooncat Club',
    symbol: 'MCRT',
    description: 'Cats, but with a chart.',
    initialPriceSol: 0.000078,
  },
  {
    id: 'crumb',
    name: 'Crumb Finance',
    symbol: 'CRUMB',
    description: 'Small cap, even smaller bakery.',
    initialPriceSol: 0.0036,
  },
  {
    id: 'orb',
    name: 'Orbital Hamster',
    symbol: 'ORB',
    description: 'One wheel. Many candles.',
    initialPriceSol: 0.00091,
  },
];

export const DEFAULT_TOKEN_ID = PRACTICE_TOKENS[0].id;

export function tokenById(id: string): TokenSpec {
  const token = PRACTICE_TOKENS.find((candidate) => candidate.id === id);
  if (!token) throw new Error(`Unknown practice token: ${id}`);
  return token;
}
