# Drip

Solana streaming payments protocol. Stream SOL by the second — to contractors, agents, or subscriptions — with on-chain enforcement via Anchor.

---

## Quick start

```bash
cp .env.example .env.local   # already filled with devnet defaults
npm install
npm run dev                  # http://localhost:3000
```

Connect a browser wallet set to **Devnet** and airdrop yourself some devnet SOL.

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

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 16 · React · Tailwind CSS   |
| On-chain    | Anchor 0.30.1 · Solana Devnet       |
| Wallet      | `@solana/wallet-adapter`            |
| Language    | TypeScript                          |

---

## Commands

```bash
# Next.js
npm run dev       # dev server
npm run build     # production build
npm run start     # serve production build

# Anchor
anchor build                          # compile program
anchor test                           # run tests on localnet
anchor deploy --provider.cluster devnet  # deploy to devnet
```

---

## Deployed program

**Program ID:** `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6`  
**Cluster:** Devnet  
[View on Solana Explorer](https://explorer.solana.com/address/D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6?cluster=devnet)

See [DEVNET_DEPLOYMENT.md](DEVNET_DEPLOYMENT.md) for full deployment instructions.

---

## Current limitations

- Native SOL only (no SPL tokens yet)
- Raydium/yield UI is a stub
- PDF export is a stub
- AI agent terminal is a demo simulation
- Devnet only — not on mainnet
