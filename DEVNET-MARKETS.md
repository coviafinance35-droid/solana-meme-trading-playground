# Devnet market status

This build leaves real Devnet swaps disabled. No market is entered into `src/lib/markets.ts` unless its program ID, pool account, token mints, live reserves, and quote/transaction path are verified on Solana Devnet.

The supplied Raydium SDK V2 demo README says the Raydium API does not currently provide Devnet pool/farm data and notes that RPC pool-info methods are the Devnet path. The demo's sample CLMM pool address `8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj` was queried against the official Solana Devnet RPC during development; it resolves to the System Program and has no account data, so it is not a verified pool. The app therefore does not infer market data from a token mint, does not show quotes in Devnet mode, and does not send swaps.

References:

- [Raydium SDK V2 demo](https://github.com/raydium-io/raydium-sdk-V2-demo)
- [Raydium program-address reference](https://docs.raydium.io/reference/program-addresses)
- [Solana Devnet RPC](https://api.devnet.solana.com)

When an audited Devnet market is added, first verify the live account owner/program, mints, reserves, fee configuration, and SDK transaction builder against current official program addresses. Add the exact verified market to the registry, implement an RPC-backed quote, then require an explicit review and wallet signature for each requested transaction. Never enable a mainnet endpoint.
