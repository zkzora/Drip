![Drip](public/banner.png)

# Drip

![Anchor Tests](https://img.shields.io/badge/anchor%20tests-19%2F19%20passing-brightgreen?style=flat-square)
![Network](https://img.shields.io/badge/solana-devnet%20live-9945FF?style=flat-square&logo=solana&logoColor=white)
![Token](https://img.shields.io/badge/token-native%20SOL%20MVP-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**Programmable cashflow for AI agents and modern workforces.**

> Give AI agents a budget that streams, stops, and audits itself.
> Agents should not receive lump sums. They should receive revocable real-time budgets.

Drip is a Solana streaming payments protocol. Set a flow rate, a max budget, and an expiry — then let the escrow stream SOL by the second with on-chain enforcement via Anchor.

---

## Quick start

```bash
cp .env.example .env.local   # already filled with devnet defaults
npm install
npm run dev                  # http://localhost:3000
```

Connect a browser wallet (Phantom, Backpack, etc.) set to **Devnet** and airdrop yourself some devnet SOL from [faucet.solana.com](https://faucet.solana.com).

---

## Environment

`.env.local` (copy from `.env.example`):

```env
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DRIP_PROGRAM_ID=D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6
```

---

## Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Frontend    | Next.js 16 · React 18 · Tailwind CSS               |
| On-chain    | Anchor 0.30.1 · Solana Devnet                       |
| Wallet      | Jupiter Unified Wallet Kit (`@jup-ag/wallet-adapter`) |
| Language    | TypeScript                                          |

---

## Commands

```bash
# Next.js
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm run start     # serve production build

# Anchor
anchor build                             # compile Anchor program
anchor test                              # run tests on localnet
anchor deploy --provider.cluster devnet  # deploy to devnet
```

---

## Deployed program

**Program ID:** `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6`  
**Cluster:** Solana Devnet  
[View on Solana Explorer](https://explorer.solana.com/address/D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6?cluster=devnet)

See [DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md) for full deployment and wallet setup instructions.

---

## What works today (MVP)

- Create a stream: set receiver, flow rate (SOL/sec), deposit, max budget, expiration
- Streams tick live in the dashboard UI with sub-second updates
- Withdraw unlocked funds (receiver only, enforced on-chain)
- Pause and resume a stream (payer only, enforced on-chain)
- Cancel a stream and recover remaining escrow (payer only)
- Compliance page: real on-chain records + CSV export (22 columns, Excel-compatible)
- Agent demo page: real budget panel wired to on-chain stream, simulated agent terminal
- Jupiter wallet connect modal (Phantom, Backpack, Solflare, and more)

---

## Current MVP limitations

| Feature | Status |
|---------|--------|
| Token | **Native SOL only** |
| SPL tokens / USDC | Roadmap |
| Raydium / yield routing | Roadmap - UI placeholder only |
| PDF export | Stub - shows "coming next" toast |
| Agent terminal activity | Demo simulation - not real on-chain execution |
| Deployment | **Devnet only** - mainnet not deployed |

---

## Agent terminal

The **Agents** page in the dashboard shows a live inference log and a real-time spend counter. The terminal activity is a **demo simulation** — it is not executing real on-chain transactions. The budget panel at the top is wired to real on-chain Drip stream state when a wallet is connected. The log illustrates what autonomous agent-to-agent payments will look like when agent autopilot is implemented.

---

## Roadmap

These features are **not live** in the current MVP. They are planned for post-hackathon development.

| Feature | Status |
|---------|--------|
| Agent autopilot withdrawals | Planned — automated pull from on-chain stream balance |
| USDC / SPL token support | Planned — program already parameterised, needs UI wiring |
| Helius indexing & webhooks | Planned — real-time stream events via Helius enhanced WS |
| PDF audit export | Planned — PDF generation for the compliance page |
| Mainnet deployment | Planned — after security review and audit |
| drip-sol SDK package | Planned — lightweight TypeScript client (npm package) |
| Raydium yield routing | Planned — idle escrow routed to liquidity pools |

---

## 3-minute demo

See [DEMO.md](DEMO.md) for the full hackathon demo script.
