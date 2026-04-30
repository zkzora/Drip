# DRIP Internal System Implementation Plan

**Project:** DRIP — Programmable Cashflow for AI Agents  
**Tagline:** Give AI agents a budget that streams, stops, and audits itself.  
**Current status:** Landing page, dashboard design, and frontend UI are already built. This plan focuses on making the internal system real: Solana program, Anchor client wiring, stream lifecycle, policy enforcement, transaction UX, compliance data, and demo readiness.

---

## 0. What Codex/Claude Must Understand First

DRIP is not just a streaming payroll dashboard. It is a programmable cashflow system for AI agents, contractors, and B2B payments on Solana.

The frontend already exists. Do not rebuild the landing page or dashboard from scratch. Your task is to connect the existing UI to real system logic.

The core product is:

1. A payer creates a funded stream.
2. Funds are locked in an escrow PDA.
3. A receiver or AI agent earns funds continuously over time.
4. The receiver can withdraw the unlocked amount.
5. The payer can pause, resume, or cancel the stream.
6. Optional policies limit how much an agent can receive or how long the stream can run.
7. The app records enough data to generate compliance/audit exports.

The system must feel real during the hackathon demo, even if some parts use mock data around the on-chain core.

---

## 1. Core Product Positioning

### Main Narrative

DRIP gives AI agents programmable budgets on Solana.

Instead of sending a lump sum to an autonomous agent, a user can create a real-time payment stream with rules:

- How fast money flows.
- Maximum total budget.
- Expiration time.
- Whether the payer can pause or cancel.
- Whether the receiver can withdraw only unlocked funds.

This solves a real problem: AI agents need money to pay for compute, APIs, tools, and other agents, but users and companies need spending controls and audit logs.

### Hackathon Differentiation

Do not describe DRIP as only a payroll app.

Describe it as:

> Programmable cashflow infrastructure for AI agents and modern workforces.

The payroll and B2B use cases are secondary. The AI agent budget control story is the sharpest hackathon wedge.

---

## 2. Development Goal

By the end of this implementation, the app should support the following complete flow on Solana Devnet or Localnet:

1. Connect/login user.
2. Create a stream with:
   - receiver address,
   - token mint or SOL mode,
   - deposit amount,
   - flow rate,
   - optional max budget,
   - optional expiration timestamp.
3. Store stream state in a PDA.
4. Show active streams in the dashboard.
5. Show live ticking earned amount in the UI.
6. Allow receiver to withdraw unlocked funds.
7. Allow payer to pause stream.
8. Allow payer to resume stream.
9. Allow payer to cancel stream and refund unused funds.
10. Generate mock or semi-real compliance entries from stream and transaction data.

---

## 3. Implementation Priorities

### Priority 1 — Must Have for Demo

These are non-negotiable:

- Anchor program compiles.
- Stream PDA state works.
- Create stream transaction works.
- Withdraw transaction works.
- Cancel stream transaction works.
- Dashboard reads stream state.
- UI live counter is based on real stream state.
- Solana Explorer links appear after transactions.
- Basic error states and transaction toasts exist.

### Priority 2 — Strong Top 20 Signal

These make the project feel serious:

- Pause and resume stream.
- Max budget enforcement.
- Expiration timestamp enforcement.
- Anchor tests for create, withdraw, pause, resume, cancel.
- Compliance page uses real stream metadata where possible.
- Export CSV from stream records.

### Priority 3 — Nice to Have

Only build after priorities 1 and 2:

- PDF export.
- Agent demo terminal simulation.
- SPL token support if SOL flow is already stable.
- Multi-stream filtering.
- Human-readable rate parser: `$1000/month` to lamports/second or token units/second.
- Stream categories: AI Compute, API Costs, Human Payroll, B2B Subscription.

---

## 4. Suggested Repo Assumptions

Assume the project is a Next.js app with an Anchor program inside the same repo.

Expected structure:

```text
/drip-protocol
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── compliance/
│   │   └── page.tsx
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   ├── marketing/
│   ├── ui/
│   └── agent-demo/
├── lib/
│   ├── solana/
│   │   ├── anchor.ts
│   │   ├── constants.ts
│   │   ├── pda.ts
│   │   ├── stream.ts
│   │   └── types.ts
│   ├── format.ts
│   └── rates.ts
├── programs/
│   └── drip/
│       └── src/
│           └── lib.rs
├── tests/
│   └── drip.ts
├── Anchor.toml
├── package.json
└── tsconfig.json
```

If the existing structure differs, adapt carefully. Do not delete existing UI components unless absolutely necessary.

---

## 5. System Architecture

### On-chain Layer

The Anchor program owns the stream state and escrow.

Responsibilities:

- Create stream state PDA.
- Lock funds in escrow.
- Calculate unlocked amount based on elapsed time and rate.
- Enforce max budget.
- Enforce expiration.
- Allow withdrawal only up to unlocked amount.
- Pause and resume streams without overpaying.
- Cancel stream and refund remaining balance.

### Client Layer

The Next.js app uses Anchor client helpers.

Responsibilities:

- Build transactions.
- Derive PDAs.
- Fetch stream accounts.
- Convert UI rate input into on-chain integer values.
- Convert timestamps into readable dashboard data.
- Display optimistic loading states.
- Show transaction success/failure toasts.

### UI Layer

The frontend already exists. Only wire it to real logic.

Responsibilities:

- Replace mock dashboard data with fetched stream accounts.
- Keep live ticking animation, but base it on real stream state.
- Let payer create, pause, resume, and cancel streams.
- Let receiver withdraw from streams.
- Show stream policies clearly.
- Show audit/compliance records.

---

## 6. On-chain Program Design

### 6.1 Stream State

Create an Anchor account named `StreamState`.

Fields:

```rust
#[account]
pub struct StreamState {
    pub payer: Pubkey,
    pub receiver: Pubkey,
    pub mint: Pubkey,
    pub escrow: Pubkey,

    pub stream_id: u64,

    pub deposited_amount: u64,
    pub withdrawn_amount: u64,
    pub flow_rate_per_second: u64,

    pub start_time: i64,
    pub last_withdraw_time: i64,
    pub pause_started_at: i64,
    pub total_paused_seconds: i64,

    pub max_budget: u64,
    pub expiration_time: i64,

    pub is_paused: bool,
    pub is_cancelled: bool,

    pub bump: u8,
    pub escrow_bump: u8,
}
```

Notes:

- `mint` can be `Pubkey::default()` if using native SOL in the first version.
- For the fastest demo, implement native SOL escrow first.
- Add SPL token support only after SOL mode works.
- `max_budget = 0` means no explicit max budget beyond deposited amount.
- `expiration_time = 0` means no explicit expiration.

### 6.2 PDA Seeds

Use deterministic seeds.

Stream state PDA:

```rust
[b"stream", payer.key().as_ref(), receiver.key().as_ref(), &stream_id.to_le_bytes()]
```

Escrow PDA:

```rust
[b"escrow", stream_state.key().as_ref()]
```

For native SOL, the escrow PDA can hold lamports directly.

For SPL token mode, use an associated token account owned by escrow authority PDA. This can be added later.

---

## 7. On-chain Instructions

## 7.1 initialize_stream

Creates a stream and funds escrow.

### Inputs

```rust
pub fn initialize_stream(
    ctx: Context<InitializeStream>,
    stream_id: u64,
    deposited_amount: u64,
    flow_rate_per_second: u64,
    max_budget: u64,
    expiration_time: i64,
) -> Result<()>
```

### Validation

- `deposited_amount > 0`
- `flow_rate_per_second > 0`
- `receiver != payer`
- if `max_budget > 0`, then `max_budget <= deposited_amount`
- if `expiration_time > 0`, then `expiration_time > current_time`

### Actions

- Create stream PDA.
- Transfer deposited SOL from payer to escrow PDA.
- Save stream state.
- Emit `StreamCreated` event.

### Event

```rust
#[event]
pub struct StreamCreated {
    pub stream: Pubkey,
    pub payer: Pubkey,
    pub receiver: Pubkey,
    pub deposited_amount: u64,
    pub flow_rate_per_second: u64,
    pub max_budget: u64,
    pub expiration_time: i64,
    pub start_time: i64,
}
```

---

## 7.2 withdraw

Allows receiver to withdraw earned/unlocked funds.

### Inputs

```rust
pub fn withdraw(ctx: Context<Withdraw>) -> Result<()>
```

### Validation

- stream is not cancelled.
- stream is not paused.
- caller must be receiver.
- unlocked amount must be greater than withdrawn amount.

### Earned Amount Calculation

Create a helper function:

```rust
fn calculate_unlocked_amount(stream: &StreamState, current_time: i64) -> Result<u64>
```

Effective time:

```text
effective_elapsed_seconds = min(current_time, expiration_time_if_set) - start_time - total_paused_seconds
```

Unlocked amount:

```text
unlocked = effective_elapsed_seconds * flow_rate_per_second
```

Then cap by:

```text
min(unlocked, deposited_amount, max_budget_if_set)
```

Withdrawable amount:

```text
withdrawable = unlocked_amount - withdrawn_amount
```

Use checked math everywhere:

- `checked_sub`
- `checked_mul`
- `checked_add`

Never allow overflow or negative elapsed time.

### Actions

- Transfer withdrawable lamports from escrow PDA to receiver.
- Increment `withdrawn_amount`.
- Set `last_withdraw_time = current_time`.
- Emit `Withdrawn` event.

### Event

```rust
#[event]
pub struct Withdrawn {
    pub stream: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub total_withdrawn: u64,
    pub timestamp: i64,
}
```

---

## 7.3 pause_stream

Allows payer to temporarily stop the stream.

### Inputs

```rust
pub fn pause_stream(ctx: Context<PauseStream>) -> Result<()>
```

### Validation

- caller must be payer.
- stream is not cancelled.
- stream is not already paused.

### Actions

- Set `is_paused = true`.
- Set `pause_started_at = current_time`.
- Emit `StreamPaused`.

---

## 7.4 resume_stream

Allows payer to resume a paused stream.

### Inputs

```rust
pub fn resume_stream(ctx: Context<ResumeStream>) -> Result<()>
```

### Validation

- caller must be payer.
- stream is not cancelled.
- stream is currently paused.

### Actions

- Calculate `paused_duration = current_time - pause_started_at`.
- Add paused duration to `total_paused_seconds`.
- Set `pause_started_at = 0`.
- Set `is_paused = false`.
- Emit `StreamResumed`.

---

## 7.5 cancel_stream

Allows payer to cancel the stream, settle outstanding earned amount, and refund unused balance.

### Inputs

```rust
pub fn cancel_stream(ctx: Context<CancelStream>) -> Result<()>
```

### Validation

- caller must be payer.
- stream is not already cancelled.

### Actions

1. Calculate unlocked amount.
2. Calculate unpaid earned amount:

```text
receiver_due = unlocked_amount - withdrawn_amount
```

3. Transfer `receiver_due` to receiver.
4. Transfer remaining escrow balance to payer.
5. Mark stream as cancelled.
6. Optionally close stream account if safe.
7. Emit `StreamCancelled`.

Important: For the hackathon, it is acceptable to keep the stream account alive after cancellation so the UI can display historical compliance records.

---

## 8. Custom Errors

Add clear Anchor errors:

```rust
#[error_code]
pub enum DripError {
    #[msg("Deposit amount must be greater than zero")]
    InvalidDeposit,

    #[msg("Flow rate must be greater than zero")]
    InvalidFlowRate,

    #[msg("Receiver cannot be the same as payer")]
    InvalidReceiver,

    #[msg("Max budget cannot exceed deposited amount")]
    InvalidMaxBudget,

    #[msg("Expiration timestamp must be in the future")]
    InvalidExpiration,

    #[msg("Only the payer can perform this action")]
    UnauthorizedPayer,

    #[msg("Only the receiver can perform this action")]
    UnauthorizedReceiver,

    #[msg("Stream is currently paused")]
    StreamPaused,

    #[msg("Stream is already paused")]
    AlreadyPaused,

    #[msg("Stream is not paused")]
    NotPaused,

    #[msg("Stream is already cancelled")]
    AlreadyCancelled,

    #[msg("No funds available to withdraw")]
    NothingToWithdraw,

    #[msg("Math overflow or underflow")]
    MathError,
}
```

---

## 9. Anchor Account Contexts

### InitializeStream

Required accounts:

- `payer` signer mutable
- `receiver` unchecked or system account
- `stream_state` init PDA
- `escrow` PDA mutable
- `system_program`

### Withdraw

Required accounts:

- `receiver` signer mutable
- `stream_state` mutable
- `escrow` PDA mutable
- `system_program`

### PauseStream

Required accounts:

- `payer` signer
- `stream_state` mutable

### ResumeStream

Required accounts:

- `payer` signer
- `stream_state` mutable

### CancelStream

Required accounts:

- `payer` signer mutable
- `receiver` mutable
- `stream_state` mutable
- `escrow` PDA mutable
- `system_program`

---

## 10. Anchor Tests

Create tests in `tests/drip.ts`.

### Required Test Cases

1. Creates a stream successfully.
2. Fails if deposit is zero.
3. Fails if flow rate is zero.
4. Fails if receiver equals payer.
5. Fails if max budget exceeds deposit.
6. Allows receiver to withdraw after time passes.
7. Prevents payer from withdrawing receiver funds.
8. Prevents receiver from withdrawing when nothing is unlocked.
9. Allows payer to pause stream.
10. Prevents withdrawal while paused.
11. Allows payer to resume stream.
12. Ensures paused time does not count toward earned amount.
13. Allows payer to cancel stream.
14. Pays receiver earned amount on cancel.
15. Refunds remaining balance to payer on cancel.
16. Prevents actions after cancellation.
17. Enforces expiration timestamp.
18. Enforces max budget cap.

### Testing Time

Use local validator and controlled waits. For hackathon speed, short streams are acceptable:

- deposit: 1 SOL
- flow rate: 0.01 SOL/sec equivalent in lamports
- wait 2–3 seconds
- withdraw

Use helper functions for:

- airdrop
- get balance
- derive stream PDA
- derive escrow PDA
- sleep

---

## 11. Frontend Integration Plan

## 11.1 Install/Check Dependencies

Required packages:

```bash
npm install @coral-xyz/anchor @solana/web3.js bn.js
```

If using Solana wallet adapter directly:

```bash
npm install @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui
```

If Privy is already installed, keep Privy and connect it to Solana wallet handling.

Do not break existing auth.

---

## 11.2 Create Solana Constants

File: `lib/solana/constants.ts`

Include:

```ts
export const DRIP_PROGRAM_ID = "REPLACE_WITH_DEPLOYED_PROGRAM_ID";
export const SOL_MINT_PLACEHOLDER = "11111111111111111111111111111111";
export const LAMPORTS_PER_SOL_NUM = 1_000_000_000;
export const CLUSTER = "devnet";
```

After deployment, replace `DRIP_PROGRAM_ID` with the deployed program ID.

---

## 11.3 Create Anchor Provider Helper

File: `lib/solana/anchor.ts`

Responsibilities:

- Create connection.
- Create Anchor provider from wallet.
- Load IDL.
- Return program instance.

Expected helper:

```ts
export function getDripProgram(wallet: AnchorWallet) {
  // return new Program(idl, programId, provider)
}
```

Make sure this works client-side only. Use `"use client"` where needed.

---

## 11.4 Create PDA Helpers

File: `lib/solana/pda.ts`

Functions:

```ts
export function deriveStreamPda(
  payer: PublicKey,
  receiver: PublicKey,
  streamId: BN,
  programId: PublicKey
): [PublicKey, number]
```

```ts
export function deriveEscrowPda(
  streamPda: PublicKey,
  programId: PublicKey
): [PublicKey, number]
```

Seeds must exactly match the Rust program.

---

## 11.5 Create Stream Client API

File: `lib/solana/stream.ts`

Expose these functions:

```ts
createStream(params)
withdrawFromStream(params)
pauseStream(params)
resumeStream(params)
cancelStream(params)
fetchStream(params)
fetchStreamsByPayer(params)
fetchStreamsByReceiver(params)
calculateUnlockedAmountClientSide(stream)
calculateWithdrawableAmountClientSide(stream)
```

### createStream Params

```ts
type CreateStreamParams = {
  wallet: AnchorWallet;
  receiver: string;
  depositSol: number;
  flowRateSolPerSecond: number;
  maxBudgetSol?: number;
  expirationDate?: Date;
  category?: "AI_COMPUTE" | "API_COSTS" | "HUMAN_PAYROLL" | "B2B_SUBSCRIPTION";
};
```

Convert SOL values into lamports using integer-safe conversions.

Avoid floating point issues as much as possible:

```ts
const lamports = Math.round(sol * LAMPORTS_PER_SOL_NUM);
```

For production this should use decimal libraries, but for hackathon this is acceptable if values are small and UI clearly rounds.

---

## 12. Dashboard Wiring

The dashboard design already exists. Replace mock data with real state progressively.

### 12.1 Stream Creation Form

Connect the existing form to `createStream`.

Inputs should map to:

- Recipient address.
- Deposit amount.
- Rate amount.
- Rate unit: second, minute, hour, day, month.
- Max budget toggle.
- Max budget value.
- Auto revoke / expiration date toggle.
- Category dropdown.

### Rate Conversion

Create file: `lib/rates.ts`

Functions:

```ts
export function convertRateToPerSecond(amount: number, unit: RateUnit): number
```

Supported units:

```ts
type RateUnit = "second" | "minute" | "hour" | "day" | "week" | "month";
```

Conversions:

```ts
second: amount
minute: amount / 60
hour: amount / 3600
day: amount / 86400
week: amount / 604800
month: amount / 2592000
```

Use `month = 30 days` for hackathon clarity.

Show user-facing preview:

```text
$1000/month ≈ $0.000385802/sec
```

For SOL demo:

```text
1 SOL/day ≈ 0.000011574 SOL/sec
```

---

## 12.2 Active Streams Table

Each row should show:

- Direction: Incoming or Outgoing.
- Counterparty.
- Status: Active, Paused, Cancelled, Expired.
- Deposit amount.
- Flow rate.
- Earned/unlocked amount ticking live.
- Withdrawn amount.
- Remaining amount.
- Policy badges:
  - Max Budget
  - Auto-Revoke
  - Agent Mode
- Actions:
  - Withdraw if connected wallet is receiver.
  - Pause if connected wallet is payer and stream is active.
  - Resume if connected wallet is payer and stream is paused.
  - Cancel if connected wallet is payer and stream is not cancelled.

### Live Counter Logic

Use fetched on-chain state as base.

Client-side derived amount:

```text
now = current unix timestamp
elapsed = now - start_time - total_paused_seconds
if paused: use pause_started_at instead of now
if expiration set: now = min(now, expiration_time)
unlocked = elapsed * flow_rate_per_second
cap by deposit and max budget
```

Refresh display every 100ms or 250ms for visual effect.

Do not send transactions every tick. The ticking is display-only. Actual withdrawal happens only when receiver clicks withdraw.

---

## 12.3 Transaction Toasts

For each transaction:

- Show `Preparing transaction...`
- Show wallet approval state if possible.
- Show `Confirming on Solana...`
- On success, show:
  - Transaction confirmed.
  - Explorer link.
- On error, show readable error.

Map Anchor custom errors into friendly messages:

- `NothingToWithdraw`: “No unlocked funds available yet.”
- `StreamPaused`: “This stream is paused.”
- `UnauthorizedPayer`: “Only the payer can do this.”
- `UnauthorizedReceiver`: “Only the receiver can withdraw.”

---

## 13. Compliance Module Wiring

The compliance page already exists. Wire it to stream records where possible.

### MVP Approach

Use on-chain stream accounts plus locally generated transaction metadata.

Display:

- Date.
- Counterparty.
- Category.
- Duration.
- Amount streamed.
- Amount withdrawn.
- Status.
- Tx hash.

### CSV Export

Create file: `lib/export/csv.ts`

Function:

```ts
export function exportStreamsToCsv(streams: ComplianceStreamRecord[]): void
```

CSV columns:

```text
stream_id,payer,receiver,category,status,start_time,expiration_time,deposited_amount,withdrawn_amount,flow_rate_per_second,total_paused_seconds,last_tx_signature
```

### PDF Export

Only build this if time remains.

Suggested package:

```bash
npm install jspdf jspdf-autotable
```

PDF should include:

- DRIP logo/title.
- Date range.
- Total inflow.
- Total outflow.
- Total agent compute spend.
- Stream table.
- Disclaimer: “Generated from Solana Devnet stream state for hackathon demo.”

---

## 14. Agent Demo Mode

This is the hackathon wow layer. It can be mostly frontend simulation, as long as the payment stream itself is real.

### Goal

Show that an AI agent is operating under a streamed budget.

### UI Concept

Create or wire existing component:

```text
Agent: DeepSeek Research Agent
Task: Analyze 50 market reports
Budget: 0.5 SOL
Rate: 0.001 SOL/sec
Status: Running
Spent: ticking live
Remaining: ticking down
```

Beside it, show fake terminal logs:

```text
[agent] Starting research task...
[agent] Calling model API...
[agent] Paying compute provider through DRIP stream...
[agent] Budget policy active: max 0.5 SOL
[agent] Task complete. Stream can be cancelled or exported.
```

Important: Make it clear in pitch that agent logs are a demo simulation, while stream creation/withdraw/cancel are real Solana transactions.

---

## 15. Wallet/Auth Integration

The frontend uses Privy. Do not remove it.

### Required Behavior

- User can log in with Privy.
- User has or connects a Solana wallet.
- The app can sign Solana transactions.
- If embedded wallet is available, use it.
- If not, allow external wallet fallback if the current setup supports it.

### Implementation Notes

Codex/Claude should inspect current Privy provider setup before editing.

Find:

- `app/layout.tsx`
- provider components
- auth hooks
- wallet hooks

Then add the minimum required wiring to get an Anchor-compatible wallet object.

Expected wallet shape:

```ts
type AnchorWallet = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction>(txs: T[]) => Promise<T[]>;
};
```

If Privy adapter is difficult, use Solana wallet adapter temporarily for hackathon demo, but keep Privy login visually intact.

---

## 16. Devnet Deployment Flow

### Step 1 — Build Program

```bash
anchor build
```

### Step 2 — Run Tests Locally

```bash
anchor test
```

### Step 3 — Configure Devnet

```bash
solana config set --url devnet
solana airdrop 2
```

### Step 4 — Deploy

```bash
anchor deploy --provider.cluster devnet
```

### Step 5 — Update Program ID

Update:

- `Anchor.toml`
- `programs/drip/src/lib.rs`
- `lib/solana/constants.ts`
- generated IDL if necessary

### Step 6 — Rebuild Client

```bash
anchor build
npm run dev
```

### Step 7 — Test Full App Flow

- Create stream.
- Wait 5 seconds.
- Withdraw.
- Pause.
- Resume.
- Cancel.
- Open Explorer links.
- Verify dashboard updates.

---

## 17. Localnet Fallback Plan

If Devnet is slow or wallet signing becomes painful, keep a localnet fallback.

### Local Validator

```bash
solana-test-validator
```

### Local Anchor Test

```bash
anchor test --skip-local-validator
```

### Local Demo

Use local wallet keypairs and show terminal logs plus UI.

Devnet is better for judges, but localnet is acceptable if the demo clearly shows real program execution.

---

## 18. Data Model for Frontend

Create file: `lib/solana/types.ts`

```ts
export type StreamStatus = "active" | "paused" | "cancelled" | "expired";

export type StreamCategory =
  | "AI_COMPUTE"
  | "API_COSTS"
  | "HUMAN_PAYROLL"
  | "B2B_SUBSCRIPTION";

export type DripStream = {
  publicKey: string;
  payer: string;
  receiver: string;
  streamId: string;
  depositedAmount: bigint;
  withdrawnAmount: bigint;
  flowRatePerSecond: bigint;
  startTime: number;
  lastWithdrawTime: number;
  pauseStartedAt: number;
  totalPausedSeconds: number;
  maxBudget: bigint;
  expirationTime: number;
  isPaused: boolean;
  isCancelled: boolean;
  status: StreamStatus;
  category?: StreamCategory;
  lastTxSignature?: string;
};
```

Add helper formatters:

```ts
formatLamportsToSol(lamports)
formatRate(lamportsPerSecond)
formatUnixTimestamp(timestamp)
shortAddress(address)
getExplorerUrl(signatureOrAddress)
```

---

## 19. Stream Fetching Strategy

### MVP Fetching

Use Anchor account filters:

- Fetch all program accounts for `StreamState`.
- Filter client-side by payer or receiver.

For hackathon, this is fine.

### Better Fetching

Use memcmp filters if possible:

- payer offset
- receiver offset

Do this only if the account layout is stable and there is time.

### Dashboard Query

For connected wallet:

```ts
const outgoing = streams.filter(s => s.payer === wallet.publicKey.toBase58())
const incoming = streams.filter(s => s.receiver === wallet.publicKey.toBase58())
```

Then merge and sort by start time descending.

---

## 20. Security and Correctness Requirements

Do not skip these.

### On-chain

- Use checked math.
- Never allow receiver to withdraw more than unlocked.
- Never allow total withdrawal above deposit.
- Never allow total withdrawal above max budget if max budget is set.
- Never count paused time as earned time.
- Never allow non-payer to pause/resume/cancel.
- Never allow non-receiver to withdraw.
- Do not use floating point on-chain.
- Keep all money amounts as `u64`.

### Client

- Validate public keys before transaction.
- Validate positive deposit and flow rate.
- Show clear messages for invalid input.
- Disable buttons during pending transactions.
- Refresh stream state after every successful transaction.

---

## 21. Common Implementation Pitfalls

### Pitfall 1 — Live Counter Does Not Match On-chain Withdraw

The UI can tick every 100ms, but on-chain math uses full seconds. Make this acceptable by showing approximate display text:

```text
≈ 0.00123 SOL unlocked
```

### Pitfall 2 — Pausing Creates Overpayment

When paused, elapsed time should stop at `pause_started_at`. On resume, add paused duration to `total_paused_seconds`.

### Pitfall 3 — Cancel Does Not Pay Receiver First

Cancel must settle earned funds before refunding payer.

### Pitfall 4 — Floating Point Rate Bugs

Do not store decimal rates on-chain. Convert to integer lamports per second before calling the program.

### Pitfall 5 — Trying to Build Too Much

Do not build Raydium yield integration during hackathon unless everything else is complete.

---

## 22. Minimal Smart Contract Pseudocode

This is not final code, but it defines the expected behavior.

```rust
pub fn calculate_unlocked_amount(stream: &StreamState, current_time: i64) -> Result<u64> {
    let mut end_time = current_time;

    if stream.expiration_time > 0 && end_time > stream.expiration_time {
        end_time = stream.expiration_time;
    }

    if stream.is_paused && stream.pause_started_at > 0 && stream.pause_started_at < end_time {
        end_time = stream.pause_started_at;
    }

    let raw_elapsed = end_time
        .checked_sub(stream.start_time)
        .ok_or(DripError::MathError)?;

    let effective_elapsed = raw_elapsed
        .checked_sub(stream.total_paused_seconds)
        .ok_or(DripError::MathError)?;

    if effective_elapsed <= 0 {
        return Ok(0);
    }

    let unlocked = (effective_elapsed as u64)
        .checked_mul(stream.flow_rate_per_second)
        .ok_or(DripError::MathError)?;

    let mut capped = unlocked.min(stream.deposited_amount);

    if stream.max_budget > 0 {
        capped = capped.min(stream.max_budget);
    }

    Ok(capped)
}
```

---

## 23. Frontend Task Breakdown for Codex/Claude

Execute in this order.

### Task A — Inspect Existing Frontend

- Find dashboard stream creation component.
- Find active streams table component.
- Find compliance page component.
- Find auth/provider setup.
- Identify where mock data currently lives.

Do not rewrite UI. Only wire logic.

### Task B — Implement Anchor Program

- Create or update `programs/drip/src/lib.rs`.
- Add `StreamState`.
- Add instructions.
- Add errors.
- Add events.
- Build successfully.

### Task C — Write Anchor Tests

- Create `tests/drip.ts`.
- Cover create, withdraw, pause, resume, cancel.
- Cover policy constraints.
- Ensure tests pass.

### Task D — Add Client Helpers

- Add `lib/solana/constants.ts`.
- Add `lib/solana/anchor.ts`.
- Add `lib/solana/pda.ts`.
- Add `lib/solana/stream.ts`.
- Add `lib/solana/types.ts`.
- Add `lib/rates.ts`.

### Task E — Wire Dashboard

- Replace create form submit with `createStream`.
- Replace mock stream rows with fetched stream accounts.
- Add action handlers for withdraw/pause/resume/cancel.
- Add transaction toasts.
- Add Explorer links.

### Task F — Wire Compliance

- Convert fetched stream accounts into compliance records.
- Add CSV export.
- Keep PDF export optional.

### Task G — Polish Demo

- Add agent demo mode if not already present.
- Add seeded demo values.
- Add graceful fallback if no wallet connected.
- Make Devnet/localnet environment obvious.

---

## 24. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_DRIP_PROGRAM_ID=REPLACE_WITH_PROGRAM_ID
```

If using Helius/QuickNode later:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=REPLACE_WITH_RPC_URL
```

Do not commit private keys.

---

## 25. Demo Script

Use this exact narrative for hackathon recording.

### Scene 1 — Problem

“AI agents are becoming economic actors. They need to pay for APIs, compute, and services. But giving an autonomous agent a lump sum is risky.”

### Scene 2 — Solution

“DRIP gives agents programmable cashflow. Instead of sending all funds upfront, you stream a budget with rules: rate, max budget, expiration, pause, cancel, and audit logs.”

### Scene 3 — Create Stream

Open dashboard.

Create stream:

- Receiver: Agent wallet.
- Deposit: 0.2 SOL.
- Rate: 0.005 SOL/sec.
- Max budget: 0.1 SOL.
- Expiration: 2 minutes.
- Category: AI Compute.

Click create.

Show transaction success and Explorer link.

### Scene 4 — Live Agent Spending

Show active stream row ticking live.

Switch to agent demo panel.

Show fake terminal logs while balance unlocks.

### Scene 5 — Withdraw

Click withdraw as receiver or simulate receiver wallet if available.

Show transaction success.

### Scene 6 — Pause/Resume

Pause stream.

Show counter stops.

Resume stream.

Show counter continues.

### Scene 7 — Cancel and Audit

Cancel stream.

Show receiver gets earned amount, payer gets remaining balance.

Open compliance page.

Export CSV.

Close with:

“DRIP is programmable payment infrastructure for AI agents and modern workforces, built on Solana.”

---

## 26. Acceptance Criteria

The implementation is complete when:

- `anchor build` passes.
- `anchor test` passes.
- Next.js app runs.
- User can create a stream from dashboard.
- Stream appears in active streams table.
- Earned amount ticks live.
- Receiver can withdraw.
- Payer can pause.
- Payer can resume.
- Payer can cancel.
- Compliance page shows stream record.
- CSV export works.
- Transaction signatures link to Solana Explorer.
- Demo can be completed in under 3 minutes.

---

## 27. Important Instruction to Codex/Claude

Do not over-engineer.

Build the smallest real protocol that proves the thesis:

> Agents should not receive lump sums. They should receive programmable streams with spending controls.

The frontend already exists. Preserve the current design and only replace mock logic with real Solana state and actions.

Do not add Raydium, complex subscriptions, token swaps, or advanced indexing until the core stream lifecycle is working.

---

## 28. Final Build Order

Follow this order strictly:

1. Native SOL Anchor stream program.
2. Anchor tests.
3. Client PDA and program helpers.
4. Create stream from UI.
5. Fetch stream state into dashboard.
6. Live counter from stream state.
7. Withdraw.
8. Pause/resume.
9. Cancel.
10. Compliance CSV.
11. Agent demo polish.
12. Devnet deploy.
13. Record demo.

---

## 29. Final Product Summary

DRIP is a Solana-native programmable cashflow protocol.

It lets users fund AI agents, contractors, or services through real-time streams instead of risky upfront transfers.

Each stream can have spending controls like max budget, expiration, pause, resume, and instant cancellation.

The result is a payment primitive that feels native to the future of autonomous work: money that flows, stops, and audits itself.

