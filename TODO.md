# Delivery outcomes

## Complete — Practice mode and simulated AMM

- [x] Work immediately without a wallet, test SOL, or market API.
- [x] Configurable virtual SOL starting balance, pool liquidity, fee, slippage, price movement, and seeded chart history.
- [x] Simulated meme-token set and configurable prices.
- [x] Constant-product buy/sell quotes with minimum received, fee, price impact, and balance/liquidity guards.
- [x] Positions, weighted-average basis, partial sells, realized/unrealized P&L, return percentage, and recent activity.
- [x] Label simulation data throughout; do not mix practice state with wallet balances.
- [x] Persist practice account state locally; default to Practice on a first visit.
- [x] Persistent “SIMULATION — NO REAL FUNDS” banner.

## Complete — Dashboard and responsive UI

- [x] Dark trading terminal with portfolio value, available SOL, realized/unrealized P&L, and percentage return.
- [x] Searchable simulated watchlist, seeded price chart/time windows, holdings, entry price, mark value, and local trade history.
- [x] Buy/Sell tabs with SOL or token amount input and detailed local quote breakdown.
- [x] Responsive desktop/tablet/mobile layouts and visible mode indicators.
- [x] Invalid amounts, insufficient virtual funds, and unsupported Devnet swaps are guarded; no false on-chain success messages.

## Complete — Devnet wallet safety and token account reads

- [x] Solana Wallet Adapter with Phantom and compatible Wallet Standard discovery.
- [x] Explicit Devnet endpoint and verified full Devnet genesis hash; non-Devnet endpoints fail closed.
- [x] Connected wallet address (copy + Devnet Explorer link), confirmed SOL balance, network status, and SPL Token/Token-2022 account balances.
- [x] Devnet tools load only after the user selects Devnet.
- [x] Persistent “SOLANA DEVNET — TEST FUNDS ONLY” banner; no mainnet switch, seed phrase, or private key handling.
- [x] User-requested Devnet SPL mint creation flow with pending/error/confirmation state and Explorer links. A mint is explicitly not presented as a trading market. Metadata upload is not implemented because a metadata program/URI flow is not configured.

## Intentionally incomplete — Real Devnet market data and swaps

- [ ] Add a verified live Devnet market source and display real market data only after the program, pool, mints, reserves, and quote path are validated.
- [ ] Build quote review and real Devnet swap submission/confirmation around a supported verified pool. Do not connect an unverified program or infer a pool from a mint.
- [x] Keep swaps disabled, do not fabricate Devnet quotes, and keep Practice fully functional while no verified route exists.
- [x] Do not enable mainnet trading or real-money deposits.

**Why:** The supplied Raydium SDK V2 demo notes its API does not provide Devnet pool/farm data; the sample pool address was checked against Devnet and is not an AMM pool account. See [DEVNET-MARKETS.md](./DEVNET-MARKETS.md).

## Complete — Tests, docs, and delivery

- [x] TypeScript React app with separated AMM, wallet, market, token, practice-store, and portfolio/P&L modules.
- [x] Automated tests cover AMM math, fees, slippage, cost basis, partial sales, P&L, persistence, insufficient balance, and Devnet cluster guard.
- [x] README includes setup, run/test/build/deploy instructions and safety limits.
- [x] Public GitHub repository; working Vite preview verified locally and through its public URL.
