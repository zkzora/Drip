![Drip](public/banner.png)

# Drip

![Anchor Tests](https://img.shields.io/badge/anchor%20tests-19%2F19%20passing-brightgreen?style=flat-square)
![Network](https://img.shields.io/badge/solana-devnet%20live-9945FF?style=flat-square&logo=solana&logoColor=white)
![Stellar](https://img.shields.io/badge/stellar-testnet%20experimental-7D4CDB?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**Programmable cashflow for AI agents and modern workforces.**

> Give AI agents a budget that streams, stops, and audits itself.  
> Agents should not receive lump sums. They should receive revocable real-time budgets.

Drip is a multi-chain streaming payments protocol. Set a flow rate, a max budget, and an expiry — then let the escrow stream funds by the second with full on-chain enforcement.

---

## Quick Start

```bash
cp .env.example .env.local   # already filled with devnet defaults
npm install
npm run dev                  # http://localhost:3000
```

Connect a browser wallet (Phantom, Backpack, etc.) set to **Devnet** and airdrop yourself some devnet SOL from [faucet.solana.com](https://faucet.solana.com).

For Stellar Testnet, install [Freighter](https://freighter.app) and switch to **Testnet** mode.

---

## Environment

Copy `.env.example` to `.env.local`:

```env
# Solana Devnet (fully functional)
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DRIP_PROGRAM_ID=D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6

# Stellar Testnet (experimental)
NEXT_PUBLIC_STELLAR_CONTRACT_ID=CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

---

## Stack

| Layer       | Technology                                                    |
|-------------|---------------------------------------------------------------|
| Frontend    | Next.js 16 · React 18 · Tailwind CSS · Framer Motion         |
| Blockchain  | Solana (Anchor 0.30.1) · Stellar Soroban (experimental)      |
| Wallets     | Jupiter Unified Wallet Kit · Freighter (Stellar)             |
| UI/UX       | 21st.dev-inspired backgrounds · Lucide icons · Custom CSS    |
| Language    | TypeScript · Rust                                            |

---

## Commands

```bash
# Next.js
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm run typecheck  # TypeScript type checking

# Anchor (Solana)
anchor build                             # compile Anchor program
anchor test                              # run tests on localnet
anchor deploy --provider.cluster devnet  # deploy to devnet

# Stellar Soroban
cd stellar
stellar contract build --manifest-path Cargo.toml   # build wasm
cargo test                                           # run unit tests
```

---

## Deployed Programs

### Solana Devnet

| Field      | Value                                                                                                                                     |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| Program ID | `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6`                                                                                          |
| Cluster    | Solana Devnet                                                                                                                             |
| Explorer   | [View on Solana Explorer](https://explorer.solana.com/address/D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6?cluster=devnet)             |

### Stellar Testnet (Experimental)

| Field       | Value                                                                                                                                                                              |
|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Contract ID | `CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV`                                                                                                                       |
| Network     | Stellar Testnet (`Test SDF Network ; September 2015`)                                                                                                                              |
| Explorer    | [View on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV)                                                        |

See [DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md) for full deployment and wallet setup instructions.

---

## Features

### ✅ Live on Solana Devnet

**Stream Management**
- Create streams with custom flow rates (SOL/sec), deposits, max budgets, and expiration
- Real-time streaming counter with sub-second UI updates
- Withdraw unlocked funds — receiver only, enforced on-chain
- Pause and resume streams — payer only, enforced on-chain
- Cancel streams and recover remaining escrow — payer only

**Dashboard**
- Multi-chain support (Solana Devnet + Stellar Testnet experimental)
- Real-time stream monitoring with live balance updates
- Stream filtering and search
- Transaction history with Solscan links
- Wallet integration via Jupiter Unified Wallet Kit

**Compliance & Reporting**
- Real on-chain stream records
- CSV export (22 columns, Excel-compatible)
- Audit-ready transaction logs with category filtering and date range selection

**Agent Terminal**
- Live inference log and real-time spend counter
- Budget panel wired to real on-chain stream state when a wallet is connected
- Demonstrates the autonomous agent-to-agent payment model

### 🚧 Experimental (Stellar Testnet)

- Freighter wallet detection, connection, and transaction signing
- Soroban smart contract with XLM token custody (create, pause, resume, withdraw, cancel)
- Multi-chain stream management panel (Streams → Stellar Testnet tab)
- Pre-flight transaction simulation before any Freighter prompt
- 14/14 contract unit tests passing

---

## Pages

| Route          | Description                                          |
|----------------|------------------------------------------------------|
| `/`            | Landing page — hero, features, calculator, use cases |
| `/dashboard`   | Main dashboard with stream management                |
| `/docs`        | Documentation hub                                    |
| `/docs/[slug]` | Individual doc pages (how-it-works, use-cases, etc.) |
| `/faq`         | Frequently asked questions                           |
| `/compliance`  | Compliance reporting and CSV export                  |

---

## Project Structure

```
drip/
├── app/                    # Next.js app router
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Dashboard page
│   ├── docs/               # Documentation pages
│   ├── faq/                # FAQ page
│   ├── compliance/         # Compliance reporting
│   └── api/                # API routes
├── components/             # React components
│   ├── landing/            # Landing page components
│   ├── dashboard/          # Dashboard (DashboardApp, stream cards, etc.)
│   ├── streams/            # StellarStreamPanel, chain selector
│   ├── docs/               # Documentation renderer
│   ├── compliance/         # Compliance & CSV export
│   └── ui/                 # Reusable UI (Icon, backgrounds, etc.)
├── lib/                    # Utilities and helpers
│   ├── solana/             # Solana wallet & program helpers
│   ├── stellar/            # Stellar wallet, transactions, Freighter hook
│   ├── adapters/           # Chain-agnostic access adapter (Solana + Stellar)
│   └── compliance/         # Compliance data utilities
├── programs/               # Anchor program (Solana Devnet)
├── stellar/                # Soroban contract workspace (Stellar Testnet)
│   └── contracts/drip_stream/src/lib.rs
├── tests/                  # Anchor integration tests
└── public/                 # Static assets
```

---

## Testing

```bash
# Anchor tests (Solana)
anchor test
# → 19/19 passing ✅

# Soroban contract tests (Stellar)
cd stellar/contracts/drip_stream
cargo test
# → 14/14 passing ✅

# TypeScript
npm run typecheck
```

---

## MVP Limitations

| Feature                  | Status                                                       |
|--------------------------|--------------------------------------------------------------|
| Token (Solana)           | **Native SOL only** — SPL / USDC on roadmap                 |
| Stellar XLM streams      | Experimental — contract live, full UI in progress            |
| Raydium / yield routing  | Roadmap — UI placeholder only                               |
| PDF export               | Stub — shows "coming soon" toast                            |
| Agent terminal           | Demo simulation — not real on-chain agent execution         |
| Deployment               | **Devnet / Testnet only** — mainnet pending security review  |

---

## Roadmap

| Feature                      | Status                                                              |
|------------------------------|---------------------------------------------------------------------|
| Stellar XLM streaming        | In progress — contract deployed, full UI integration ongoing        |
| Agent autopilot withdrawals  | Planned — automated pull from on-chain stream balance              |
| USDC / SPL token support     | Planned — program parameterised, needs UI wiring                   |
| Helius indexing & webhooks   | Planned — real-time stream events via Helius enhanced WS           |
| PDF audit export             | Planned — PDF generation for the compliance page                   |
| `drip-sol` SDK package       | Planned — lightweight TypeScript client on npm                     |
| Raydium yield routing        | Planned — idle escrow routed to liquidity pools                    |
| Mainnet deployment           | Planned — after security review and audit                          |

---

## Contributing

Contributions are welcome! This project is open source under the MIT license.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Demo

See [DEMO.md](DEMO.md) for the full demo script and walkthrough.

---

Built with ❤️ for the autonomous agent economy
