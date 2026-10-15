import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import type { SendTransactionOptions } from '@solana/wallet-adapter-base';
import { assertDevnetConnection } from './devnet';

export interface MintRequest {
  decimals: number;
  initialSupply: string;
  owner: PublicKey;
}

export interface MintResult {
  mintAddress: string;
  signature: string;
  tokenAccount: string;
  decimals: number;
  initialSupply: string;
}

export type WalletSendTransaction = (
  transaction: Transaction,
  connection: Connection,
  options?: SendTransactionOptions,
) => Promise<string>;

export function parseInitialSupply(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) throw new Error('Decimals must be an integer from 0 to 9.');
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error('Enter a positive decimal supply using digits only.');
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) throw new Error(`This token supports at most ${decimals} fractional digits.`);
  const baseUnits = BigInt(whole) * 10n ** BigInt(decimals)
    + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0');
  if (baseUnits <= 0n) throw new Error('Initial supply must be greater than zero.');
  if (baseUnits > (1n << 64n) - 1n) throw new Error('Initial supply is larger than the SPL token limit.');
  return baseUnits;
}

export async function createDevnetMint(
  request: MintRequest,
  connection: Connection,
  sendTransaction: WalletSendTransaction,
): Promise<MintResult> {
  await assertDevnetConnection(connection);
  const supply = parseInitialSupply(request.initialSupply, request.decimals);

  // This one-time mint Keypair is generated in memory only to create the mint account.
  // It is never serialized, persisted, uploaded, or used as the user's wallet.
  const mint = Keypair.generate();
  const mintAddress = mint.publicKey;
  const tokenAccount = getAssociatedTokenAddressSync(
    mintAddress,
    request.owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE, 'confirmed');
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({
    feePayer: request.owner,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(
    SystemProgram.createAccount({
      fromPubkey: request.owner,
      newAccountPubkey: mintAddress,
      lamports,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintAddress, request.decimals, request.owner, request.owner, TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountInstruction(request.owner, tokenAccount, request.owner, mintAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createMintToInstruction(tokenAccount, mintAddress, request.owner, supply, [], TOKEN_PROGRAM_ID),
  );

  const signature = await sendTransaction(transaction, connection, { signers: [mint] });
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }, 'confirmed');
  if (confirmation.value.err) throw new Error(`Devnet rejected the mint transaction: ${JSON.stringify(confirmation.value.err)}`);

  return {
    mintAddress: mintAddress.toBase58(),
    signature,
    tokenAccount: tokenAccount.toBase58(),
    decimals: request.decimals,
    initialSupply: request.initialSupply,
  };
}
