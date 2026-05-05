# Proof of Work

## Product Links

Live app: https://drip-self.vercel.app/

Dashboard: https://drip-self.vercel.app/dashboard

GitHub: https://github.com/zkzora/Drip

Demo video: TODO - add public video link

Technical demo video: TODO - add public video link

## Devnet Program

Program ID: `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6`

Solana Explorer: https://explorer.solana.com/address/D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6?cluster=devnet

## Example Stream Accounts

Example stream account 1: https://explorer.solana.com/address/BsWBUdoqv4wXno3nza6tStVLoYdNrYjSH799Q8YX4v7C?cluster=devnet

Example stream account 2: https://explorer.solana.com/address/29KDsJ6kpdqmK4dRDRxyrKGTsvktEpiYqEihnPCtwGJh?cluster=devnet

## Technical Proof

- Anchor tests passing 19/19.
- Anchor smart contract deployed to Solana Devnet.
- Public Devnet program available through Solana Explorer.
- Real stream accounts created on Devnet.
- Dashboard supports create stream against the deployed program.
- Dashboard fetches real streams from on-chain state.
- Withdraw unlocked funds is implemented.
- Pause, resume, and cancel stream actions are implemented.
- Max budget and expiration controls are implemented.
- Compliance CSV export is implemented.

## MVP Scope and Limitations

- Native SOL only.
- Devnet only.
- CSV export is live.
- PDF export is planned next.
- USDC and SPL token support are on the roadmap.
- Raydium and yield integrations are on the roadmap.
- Agent terminal is a demo simulation, not autonomous execution yet.

