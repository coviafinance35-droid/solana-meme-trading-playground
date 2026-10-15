import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import type { DevnetTokenAccount } from './models';
import { assertDevnetConnection } from './devnet';

export interface DevnetWalletSnapshot {
  address: string;
  solBalance: number;
  tokenAccounts: DevnetTokenAccount[];
  fetchedAt: number;
}

export async function readDevnetWalletSnapshot(
  connection: Connection,
  owner: PublicKey,
): Promise<DevnetWalletSnapshot> {
  await assertDevnetConnection(connection);
  const [lamports, legacy, token2022] = await Promise.all([
    connection.getBalance(owner, 'confirmed'),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, 'confirmed'),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }, 'confirmed'),
  ]);

  const tokenAccounts: DevnetTokenAccount[] = [
    ...legacy.value.map((account) => toAccount(account, 'SPL Token')),
    ...token2022.value.map((account) => toAccount(account, 'Token-2022')),
  ].filter((account) => account.amount !== '0');

  return {
    address: owner.toBase58(),
    solBalance: lamports / 1_000_000_000,
    tokenAccounts,
    fetchedAt: Date.now(),
  };
}

function toAccount(
  entry: { pubkey: PublicKey; account: { data: { parsed?: { info?: { mint?: string; tokenAmount?: { amount?: string; uiAmountString?: string; decimals?: number } } } } } },
  program: DevnetTokenAccount['program'],
): DevnetTokenAccount {
  const info = entry.account.data.parsed?.info;
  const tokenAmount = info?.tokenAmount;
  if (!info?.mint || !tokenAmount) throw new Error('The RPC returned an unrecognized SPL token account.');
  return {
    mint: info.mint,
    amount: tokenAmount.amount ?? '0',
    uiAmount: tokenAmount.uiAmountString ?? '0',
    decimals: tokenAmount.decimals ?? 0,
    accountAddress: entry.pubkey.toBase58(),
    program,
  };
}
