# Superteam Agentic Engineering Grant Application

## Project Name

DRIP

## One-Line Pitch

DRIP is a Solana-native programmable cashflow app that lets users create, manage, and export real-time native SOL payment streams for AI agents and modern workforces.

## Problem Statement

Work and software usage increasingly happen continuously, but payments are still handled as delayed lump sums, invoices, subscriptions, or manual transfers. This is especially limiting for AI agents, API services, contractors, and modern teams that need budget-aware, programmable, real-time settlement.

Traditional payment rails are not well suited for autonomous workflows. They are slow, hard to automate, expensive at small transaction sizes, and weak at expressing controls like max budgets, expiration dates, and stream lifecycle actions.

## Solution

DRIP provides a native SOL streaming payment protocol on Solana Devnet with a production-style Next.js interface. Users can connect a wallet, create a stream, fetch real on-chain stream state, withdraw unlocked funds, pause, resume, cancel, and export compliance CSV data.

The current MVP focuses on native SOL streams and a clear dashboard workflow. It keeps demo-labelled agent simulations separate from real on-chain actions so reviewers can distinguish working protocol features from future autonomous-agent functionality.

## Why Solana

Solana is the right foundation for DRIP because payment streaming needs low fees, fast confirmation, and scalable account-based state. Per-second cashflow is practical only when transaction costs and latency stay low enough for frequent lifecycle actions.

DRIP uses Solana Devnet and Anchor to provide a verifiable program, deterministic account state, wallet-based signing, and public Explorer proof for the deployed program and stream accounts.

## What Is Already Shipped

- Next.js frontend deployed on Vercel.
- Anchor smart contract deployed to Solana Devnet.
- Native SOL streaming payment protocol.
- Wallet connect.
- Create stream flow wired to the on-chain program.
- Fetch real streams from on-chain state.
- Withdraw unlocked funds.
- Pause, resume, and cancel streams.
- Max budget and expiration controls.
- Compliance CSV export.
- Agents page with clearly labelled demo simulation.
- Anchor tests passing 19/19.

Live app: https://drip-self.vercel.app/

Dashboard: https://drip-self.vercel.app/dashboard

GitHub: https://github.com/zkzora/Drip

Devnet program: https://explorer.solana.com/address/D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6?cluster=devnet

## What Was Built With Agentic Engineering

Agentic engineering was used across the build process to accelerate implementation, debugging, and QA while keeping the work grounded in real code and verifiable on-chain behavior.

The workflow helped migrate a static UI into a Next.js app, implement the Anchor program, resolve SBF and WSL build issues, debug Anchor rent-exempt failures, stabilize the test suite to 19/19 passing, wire wallet integration, connect the dashboard to on-chain stream creation and actions, deploy to Devnet, and polish grant-facing product copy.

## Why This Grant Helps

The grant directly supports the engineering process used to finish and present DRIP as a working Solana MVP. The remaining near-term work is not speculative feature expansion; it is final demo readiness, public documentation, mobile/responsive polish, repository cleanup, and reviewer-friendly proof packaging before submission deadlines.

## Current MVP Limitations

- Native SOL only.
- Devnet only.
- CSV export is live.
- PDF export is planned next.
- USDC and broader SPL token support are on the roadmap.
- Raydium and yield integrations are on the roadmap.
- The agent terminal is a demo simulation, not autonomous execution yet.

## Final Ask

I am requesting the Superteam Agentic Engineering Grant to support the final polish, documentation, and demo packaging for DRIP: a working Solana Devnet streaming payments app built with an agentic engineering workflow and backed by deployed on-chain proof.

