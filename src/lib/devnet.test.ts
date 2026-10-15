import { describe, expect, it, vi } from 'vitest';
import type { Connection } from '@solana/web3.js';
import { assertDevnetConnection, DEVNET_GENESIS_HASH } from './devnet';

function mockConnection(genesisHash: string): Connection {
  return { getGenesisHash: vi.fn().mockResolvedValue(genesisHash) } as unknown as Connection;
}

describe('Devnet cluster guard', () => {
  it('accepts the exact genesis hash returned by Solana Devnet', async () => {
    await expect(assertDevnetConnection(mockConnection('EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'))).resolves.toBeUndefined();
    expect(DEVNET_GENESIS_HASH).toBe('EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG');
  });

  it('rejects other clusters, including mainnet, with a clear error', async () => {
    await expect(assertDevnetConnection(mockConnection('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')))
      .rejects.toThrow(/not Solana Devnet/);
  });
});
