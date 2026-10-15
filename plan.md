# Solana Meme Trading Playground — Plan

## Product and implementation

Build a TypeScript/React single-page trading terminal with Practice as the first-run mode and a separate, explicitly Devnet-only wallet mode. Use Vite, Solana Wallet Adapter, `@solana/web3.js`, and `@solana/spl-token`. Practice state, settings, positions, and trade history live only in browser local storage. Practice balances and Devnet wallet data remain isolated.

Practice trades execute against local constant-product AMMs (`x × y = k`) with simulated reserves, configurable fees/slippage, bounded random price movement, and deterministic seeded chart history. Weighted-average cost basis includes the full buy spend, tracks partial sales and realized proceeds, and supports portfolio-level realized/unrealized P&L. No market API is called in Practice Mode.

The Devnet wallet bundle loads only after the user chooses Devnet. Wallet access is pinned to `WalletAdapterNetwork.Devnet`; RPC overrides use `VITE_SOLANA_RPC_URL` and must pass an exact Devnet genesis-hash check. The wallet panel exposes the connected address (with copy and Explorer links), current SOL balance, SPL Token and Token-2022 accounts, and network status. A user-requested mint-creation flow builds a real Devnet SPL mint and initial supply and waits for confirmation. It requests a signature only after the user asks to create a mint and approves the wallet prompt. The UI explains that a mint does not create liquidity.

### Real-market boundary

Real swaps remain unavailable until the program, pool account, quote path, and liquidity are verified on Devnet. The supplied Raydium SDK V2 demo README says its API does not currently provide Devnet pool/farm data and notes SDK RPC pool-info methods as the Devnet path. The README's sample pool address was checked on Solana Devnet and resolves to the System Program with empty account data, so it is not a verified swap pool. This release will not invent quotes, enable real swaps, or pretend a Devnet transaction succeeded. The app makes the missing supported route explicit and keeps Practice Mode fully functional.

## Project structure

- `src/app/` — terminal layout, chart, trade panel, Devnet panel, lazy wallet workspace, and settings.
- `src/lib/amm.ts` — pure AMM quote math, fees, price impact, and slippage.
- `src/lib/portfolio.ts` — weighted-average inventory, cost basis, realized/unrealized P&L, and return calculations.
- `src/lib/practice-store.ts` — practice-only initialization, persistence, reset, and simulated trade transitions.
- `src/lib/devnet.ts` — one Devnet connection, cluster verification, and Explorer URLs.
- `src/lib/wallet.ts` — Devnet SOL and SPL account reads.
- `src/lib/token-creation.ts` — user-initiated SPL mint transaction construction and confirmation.
- `src/lib/markets.ts` — explicit verified-market registry; currently empty, so real swaps stay disabled.
- `src/lib/*.test.ts` — deterministic AMM, accounting, persistence, and network-guard tests.
- `public/manus-routes.json` — current page route manifest.

The client-side app does not need a private server or database. Browser-safe RPC configuration is documented in `.env.example`; no seed phrases or wallet private keys are read or stored by the application.

## Design direction

Three low-tail visual directions considered: Signal Noir (0.063), Neon Liquidity (0.051), and Terminal Brutalism (0.011). Selected: **Signal Noir**.

- **Design Movement:** Refined trading-terminal minimalism with Swiss information design and a restrained Solana-neon signal.
- **Core Principles:** Every value has a clear source label; dense data stays scannable; simulated and on-chain actions remain visually separate; mobile controls remain thumb-friendly.
- **Color Philosophy:** Ink-black and deep graphite make the terminal calm rather than casino-like. Bright chartreuse-mint identifies actions and positive performance; slate carries secondary data; coral is reserved for loss and warnings.
- **Layout Paradigm:** Left watchlist rail, wide central market workspace, narrow right execution panel. On small screens the rail becomes a horizontal token strip and the execution panel flows below the chart.
- **Signature Elements:** Custom split-coin mark; thin luminous price trace; persistent, pill-shaped mode/network banners.
- **Interaction Philosophy:** Quotes recalculate immediately; user-initiated wallet actions require an explicit click and wallet review; disabled actions explain the missing prerequisite.
- **Animation:** Short, low-amplitude transitions; respect reduced-motion preference; no fake order-book motion or animation that implies an on-chain confirmation.
- **Typography System:** Sans-serif UI with tabular numerals and a compact mono face for mint addresses, balances, and status.
- **Brand Essence:** A sandbox for learning meme-token mechanics before touching a wallet; precise, playful, candid.
- **Brand Voice:** Direct and transparent. Examples: “SIMULATION — NO REAL FUNDS”; “No verified Devnet pool is available, so real swaps stay locked.”
- **Wordmark & Logo:** “Meme / Playground” wordmark with a custom split-coin glyph and one offset mint-green segment.
- **Signature Brand Color:** Signal Mint `#B8F36A`.

## Reference material

- Raydium SDK V2 demo: https://github.com/raydium-io/raydium-sdk-V2-demo
- Raydium SDK V1 demo: https://github.com/raydium-io/raydium-sdk-V1-demo
- Raydium frontend: https://github.com/raydium-io/raydium-frontend
- Solana testnet testsuite: https://github.com/solana-foundation/testnet-testsuite
- Solana Wallet Adapter cookbook: https://solana.com/developers/cookbook/wallets/connect-wallet-react
- Raydium program-address reference: https://docs.raydium.io/reference/program-addresses
