export interface VerifiedDevnetMarket {
  id: string;
  programId: string;
  poolAddress: string;
  inputMint: string;
  outputMint: string;
  feeBps: number;
  verifiedAt: number;
  verificationSource: string;
}

/** Intentionally empty: a pool must be verified on Devnet before it can enable a quote or swap. */
export const VERIFIED_DEVNET_MARKETS: readonly VerifiedDevnetMarket[] = [];
export const REAL_DEVNET_SWAPS_ENABLED = VERIFIED_DEVNET_MARKETS.length > 0;

export const REAL_SWAP_UNAVAILABLE_REASON =
  'No Devnet pool has been verified for this build. Real quotes and swaps are locked; no simulated quote is shown in Devnet mode.';

export function hasVerifiedMarketForMint(mint: string): boolean {
  return VERIFIED_DEVNET_MARKETS.some((market) => market.inputMint === mint || market.outputMint === mint);
}
