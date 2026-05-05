# Project Details

## Grant Form Answer: Problem Statement and Proposed Solution

Modern work is becoming continuous, software-driven, and increasingly agentic, but payments are still mostly handled through delayed lump sums, manual transfers, subscriptions, or invoice cycles. This creates a mismatch for AI agents, API providers, contractors, and teams that need programmable cashflow with clear controls.

For example, an AI agent may need to pay for API usage, compute, human review, or another agent's service in real time. A company may want to pay a contractor continuously as work happens. A user may want to stop payment immediately when service stops. Existing payment flows make these workflows slow, manual, and difficult to enforce.

DRIP solves this by building a Solana-native streaming payment protocol for native SOL. Users can connect a wallet, create a real on-chain payment stream, fetch stream state from the Anchor program, withdraw unlocked funds, pause, resume, cancel, and export compliance CSV data.

The protocol supports practical controls such as max budget and expiration, which are important for autonomous and semi-autonomous spending. These controls make it possible to fund workflows without giving unlimited authority to an agent, service, or counterparty.

Solana is a strong fit because streaming payments require low fees, fast confirmation, and scalable account state. DRIP uses Anchor on Solana Devnet so the program, stream accounts, and lifecycle actions are publicly verifiable through Solana Explorer.

The current MVP is intentionally focused: native SOL only, Devnet only, with CSV export live and PDF, USDC/SPL, Raydium/yield, and deeper autonomous-agent execution on the roadmap. The agent page is clearly labelled as a demo simulation, while the payment stream lifecycle is real and connected to on-chain state.

In short, DRIP makes cashflow programmable for the next generation of AI agents and modern workforces, starting with a working Solana Devnet protocol and dashboard.

