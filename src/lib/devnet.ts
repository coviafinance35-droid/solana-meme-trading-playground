import { clusterApiUrl, Connection } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const DEVNET_NETWORK_NAME = 'Solana Devnet';

const customRpc = import.meta.env.VITE_SOLANA_RPC_URL?.trim();
export const DEVNET_RPC_ENDPOINT = customRpc || clusterApiUrl(WalletAdapterNetwork.Devnet);
export const devnetConnection = new Connection(DEVNET_RPC_ENDPOINT, { commitment: 'confirmed' });

export async function assertDevnetConnection(connection: Connection = devnetConnection): Promise<void> {
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash !== DEVNET_GENESIS_HASH) {
    throw new Error('This RPC endpoint is not Solana Devnet. Mainnet and other clusters are blocked.');
  }
}

export function devnetExplorerUrl(kind: 'address' | 'tx', value: string): string {
  const segment = kind === 'tx' ? 'tx' : 'address';
  return `https://explorer.solana.com/${segment}/${encodeURIComponent(value)}?cluster=devnet`;
}
