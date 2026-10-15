# Solana Meme Trading Playground

A mobile-responsive React + TypeScript terminal for practising meme-token trading with a local simulated AMM and for inspecting a Solana Devnet wallet. The first-run mode is Practice. This app has no mainnet trading or real-money deposits.

## Modes

### Practice

Practice mode works without a wallet, RPC request, or market API. It uses five fictional meme assets and local constant-product pools (`x × y = k`). Starting virtual SOL, virtual liquidity, fees, slippage, optional seeded chart history, and optional simulated price movement are configurable. Positions and trade history are persisted in browser local storage. The app labels simulated balances, prices, liquidity, trades, and P&L. Local simulated values never merge with a Devnet wallet.

### Solana Devnet

Devnet mode pins Wallet Adapter and RPC access to Devnet. The app checks the RPC genesis hash before reading account data, displays the wallet address and live SOL balance, and reads SPL Token and Token-2022 accounts. The SPL token mint flow creates a real Devnet mint and initial supply after the user requests it and approves the wallet prompt. The one-time mint-account Keypair exists only in memory to initialize the mint; it is not stored. The UI includes Devnet Explorer links and waits for transaction confirmation.

**Real swaps are intentionally disabled in this release.** No market has been verified and registered for the app. The referenced Raydium SDK V2 demo README says its API does not currently provide Devnet pool/farm data, and its sample pool address was checked on Devnet and is not an AMM pool account. This app therefore shows no Devnet price quote or liquidity estimate and never pretends a swap succeeded. See [DEVNET-MARKETS.md](./DEVNET-MARKETS.md) for the verification basis and the requirements before enabling a real route.

The mint creation flow does not upload metadata: metadata is a separate protocol/action and requires a supported metadata program plus a valid public URI. Creating a mint does not create a trading market.

## Run locally

Requirements: Node.js 22+ and pnpm 11. The package manager and lifecycle script policy are pinned in the repository.

```bash
pnpm install
cp .env.example .env.local
# Optional: set VITE_SOLANA_RPC_URL to a Devnet RPC endpoint only.
pnpm dev
```

Open the Vite URL printed in the terminal. The app defaults to Practice. A custom RPC endpoint must identify as Devnet; mainnet and other clusters are rejected by the client-side genesis-hash check. The public Devnet endpoint is used when no override is configured. Do not put private RPC credentials in a public build or commit an `.env` file.

## Test and build

```bash
pnpm test
pnpm typecheck
pnpm build
```

Tests cover constant-product buy/sell output, fees, minimum received, slippage, liquidity guards, weighted-average entry cost, partial sales, realized/unrealized P&L, account persistence, insufficient practice balances, and the exact Devnet genesis-hash guard.

## Deploy

The frontend is a static Vite app. Run `pnpm build`, then deploy the generated `dist/` directory to any static host with SPA fallback to `index.html`. The app requires no server, database, private key, seed phrase, or hosted account service. Configure a browser-safe Devnet RPC URL only if needed. Verify the deployed site remains pinned to Devnet and does not expose private provider credentials.

## Safety

- Practice mode is local simulation only; it does not send transactions.
- Devnet mode uses `WalletAdapterNetwork.Devnet` and the Solana Devnet cluster only.
- No seed phrase or wallet private key is requested or persisted.
- Wallet signatures are requested only when the user starts the SPL mint transaction. Wallet connection and balance reads do not sign.
- No Devnet swap quote is fabricated. Swap execution stays disabled until a compatible market is verified.

## References

- [Solana Wallet Adapter React guide](https://solana.com/developers/cookbook/wallets/connect-wallet-react)
- [Raydium SDK V2 demo](https://github.com/raydium-io/raydium-sdk-V2-demo)
- [Raydium SDK V1 demo](https://github.com/raydium-io/raydium-sdk-V1-demo)
- [Raydium frontend](https://github.com/raydium-io/raydium-frontend)
- [Solana Foundation testnet testsuite](https://github.com/solana-foundation/testnet-testsuite)
- [Raydium program addresses](https://docs.raydium.io/reference/program-addresses)
