# Primary KPI

## Main KPI

Successful end-to-end Devnet stream lifecycle demo without manual intervention:

`connect wallet -> create stream -> fetch real stream -> withdraw -> pause/resume -> cancel -> export CSV`

## Why This KPI Matters

This KPI proves that DRIP is more than a static frontend or isolated smart contract. It verifies that the deployed app, wallet integration, Anchor program, on-chain stream state, transaction actions, and compliance export work together in one reviewer-visible flow.

## Success Criteria

- Wallet connects successfully.
- A native SOL stream is created on Solana Devnet.
- The created stream can be fetched from real on-chain state.
- Withdraw succeeds for unlocked funds.
- Pause and resume succeed.
- Cancel succeeds.
- CSV export produces usable compliance data.
- The flow works from the live Vercel app against the deployed Devnet program.

