# Drip — Devnet Deployment Guide

## Program

| Field       | Value                                          |
|-------------|------------------------------------------------|
| Program ID  | `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6` |
| Cluster     | Solana Devnet                                  |
| Framework   | Anchor 0.30.1                                  |

Verify on explorer:
`https://explorer.solana.com/address/D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6?cluster=devnet`

---

## Environment setup

Copy `.env.example` to `.env.local` at the repo root:

```bash
cp .env.example .env.local
```

`.env.local` must contain:

```env
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DRIP_PROGRAM_ID=D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6
```

These are the only required variables. All three are public (`NEXT_PUBLIC_`) and safe to commit in `.env.example`.

---

## Running the Next.js app

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm run start     # serve the production build
```

---

## Anchor program

### Prerequisites

- [Rust](https://rustup.rs/) stable toolchain
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) ≥ 1.18
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) 0.30.1
- A Solana keypair at `~/.config/solana/id.json` (or set `ANCHOR_WALLET`)

### Build

```bash
anchor build
```

Compiled artifacts land in `target/deploy/`.

### Test

Tests run against a local validator (localnet) by default:

```bash
anchor test
# or, if validator is already running:
npm run anchor:test
```

### Deploy to devnet

```bash
# Fund your deploy wallet with devnet SOL first
solana airdrop 2 --url devnet

anchor deploy --provider.cluster devnet
```

The deployed program ID must match `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6`.
If it differs, update `Anchor.toml` under `[programs.devnet]` and the three env vars above.

---

## Wallet requirements (browser)

- Set your browser wallet (Phantom, Backpack, etc.) to **Devnet** before connecting.
- Your wallet needs devnet SOL for:
  - Transaction fees (~0.000005 SOL per tx)
  - Stream deposit: minimum **~0.00214 SOL** (rent for StreamState PDA + escrow + a small funding buffer)
- Get free devnet SOL: `solana airdrop 2 <YOUR_ADDRESS> --url devnet`
  or use https://faucet.solana.com

---

## MVP limitations (current build)

| Feature               | Status                                      |
|-----------------------|---------------------------------------------|
| Token                 | Native SOL only                             |
| SPL tokens            | Not supported yet                           |
| Raydium / yield       | UI stub — not wired to on-chain yield       |
| PDF export            | Stub — shows "coming soon" toast            |
| Agent terminal logs   | Demo simulation — not real on-chain execution |
| Mainnet               | Not deployed — devnet only                  |
