# Stellar Testnet Support

## Overview

DRIP supports Stellar Testnet as a second chain alongside its existing Solana Devnet
implementation.  Each chain is fully independent — no bridge, no cross-chain escrow,
no shared liquidity.

---

## Current Capability Summary (Phase S5C complete)

| Capability | Status |
|---|---|
| Soroban contract deployed to Stellar Testnet | ✓ live |
| `get_stream` read from Soroban RPC | ✓ verified |
| Read-only frontend adapter (`lib/adapters/stellar.ts`) | ✓ live |
| Agent Controller stream access check on Stellar | ✓ works when env vars set |
| XLM token custody in contract | ✓ wired — `create_stream` escrows, `withdraw`/`cancel` transfer |
| Freighter wallet connect in UI | ✓ Phase S5B — detect, connect, get address + network |
| Transaction signing helper | ✓ `signStellarTx` — explicit user action only, never auto-signed |
| Creating streams from the UI | ✓ Phase S5C — build → simulate → preview → sign → submit |
| Pause / resume / withdraw / cancel from UI | ✓ Phase S5C — same tx flow, full action suite |

> All Stellar Testnet stream operations are now available from the dashboard.
> Requires Freighter wallet connected to Testnet + env vars configured.
> Testnet only — no real funds.

---

## Chain Support Status

| Chain | Status | Notes |
|---|---|---|
| Solana Devnet | Live | Full Anchor program at `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6` |
| Stellar Testnet | **Deployed, full UI actions live** | Contract `CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV` · Freighter S5B ✓ · UI actions S5C ✓ |

---

## Deployed Contract

| Item | Value |
|---|---|
| Network | Stellar Testnet (`Test SDF Network ; September 2015`) |
| Contract ID | `CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV` |
| Wasm hash | `006d722b06241c859e4b8c0a3016e5c6ddc819fe609ee04d69e1a6f5964b11f1` |
| Wasm size | 11 469 bytes (built with `wasm32v1-none`) |
| Admin | `GCWDBQTIPSIOBCCSRR7ZB4AJBNEVNE2SCLHJSMJNPE7GQQMW2QPMQR2V` |
| Explorer | https://lab.stellar.org/r/testnet/contract/CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV |

> **Testnet only.** Do not use for real funds.  No mainnet deploy is planned.

---

## Soroban Contract

### Location

```
stellar/
  Cargo.toml                                 ← isolated Rust workspace
  contracts/drip_stream/
    Cargo.toml
    src/lib.rs                               ← contract + 10 unit tests
  target/wasm32v1-none/release/
    drip_stream.wasm                         ← 11 KB Soroban-compatible build
```

### Contract status

| Item | Status |
|---|---|
| All 7 contract functions | ✓ implemented |
| `cargo test` | ✓ 14/14 pass |
| Wasm built (`wasm32v1-none`) | ✓ 11 KB |
| Deployed to Stellar Testnet | ✓ deployed (Phase S5A contract) |
| `initialize_admin` called | ✓ done |
| Test stream created with XLM custody (stream_id=1) | ✓ XLM transfer confirmed on testnet |
| `get_stream` verified live | ✓ returns `Active` + `token` field |
| Frontend read-only adapter | ✓ live (activates when env vars set) |
| XLM token custody (`create_stream` / `withdraw` / `cancel`) | ✓ wired — Phase S5A complete |

### Contract functions

| Function | Auth | Description |
|---|---|---|
| `initialize_admin(admin)` | — | One-time setup; sets admin address |
| `create_stream(payer, receiver, amount, start_time, end_time)` | payer | Creates a stream; returns `stream_id` |
| `pause_stream(caller, stream_id)` | payer | Pauses active stream; records `pause_started_at` |
| `resume_stream(caller, stream_id)` | payer | Resumes paused stream; accumulates `total_paused_secs` |
| `withdraw(caller, stream_id)` | receiver | Releases linearly-vested funds not yet withdrawn |
| `cancel_stream(caller, stream_id)` | payer | Cancels stream; returns `(receiver_due, payer_refund)` |
| `get_stream(stream_id)` | — | Read-only stream state |

### Vesting model

```
active_elapsed = (min(now, end_time) - start_time) - total_paused_secs
vested = amount × active_elapsed / (end_time - start_time)
```

If `end_time == 0` all funds vest immediately.

---

## Build and Deploy Commands

### Prerequisites

```bash
# Install Stellar CLI (v26+ — the --features opt flag is no longer needed)
cargo install --locked stellar-cli
apt-get install -y libdbus-1-dev pkg-config   # Linux: required by stellar-cli

# Add the Soroban-compatible wasm target
rustup target add wasm32v1-none
```

### Build wasm

```bash
cd stellar
stellar contract build --manifest-path Cargo.toml
# Output: stellar/target/wasm32v1-none/release/drip_stream.wasm  (11 KB)
# Note: use `stellar contract build`, NOT `cargo build --target wasm32-unknown-unknown`
#       The stellar CLI applies the correct rustflags for Soroban compatibility.
```

### Run unit tests (no CLI required)

```bash
cd stellar/contracts/drip_stream
cargo test
# 10/10 pass
```

### Generate and fund a deployer key

```bash
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
stellar keys address deployer   # prints the G... address
```

### Deploy

```bash
stellar contract deploy \
  --wasm stellar/target/wasm32v1-none/release/drip_stream.wasm \
  --source deployer \
  --network testnet
# Prints the C... contract ID
```

### Initialize admin

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize_admin --admin <ADMIN_ADDRESS>
```

### Create a test stream

```bash
# Get the native XLM SAC address
XLM_SAC=$(stellar contract id asset --asset native --network testnet)
# = CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- create_stream \
    --payer <PAYER_ADDRESS> \
    --token "$XLM_SAC" \
    --receiver <RECEIVER_ADDRESS> \
    --amount 1000000 \
    --start_time $(date +%s) \
    --end_time $(($(date +%s) + 86400))
# Emits a token transfer event: payer → contract (1 000 000 stroops = 0.1 XLM)
```

### Verify get_stream

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- get_stream --stream_id 1
# Returns JSON with status:"Active", amount, payer, receiver, etc.
```

---

## Read-only Frontend Adapter

**File:** `lib/adapters/stellar.ts`

Uses `rpc.Server.getContractData()` from `@stellar/stellar-sdk` (already installed) to read
the `Stream` persistent storage entry directly — no transaction needed.

**Key encoding note:** Soroban encodes `#[contracttype]` newtype enum variants as
`ScvVec([Symbol("VariantName"), value])`.  The adapter uses this encoding for
`DataKey::Stream(stream_id)`.

### Behavior

| Condition | `allowed` | `reason` |
|---|---|---|
| `STELLAR_CONTRACT_ID` not set / placeholder | `false` | `config_missing` |
| Invalid Stellar address | `false` | `wallet_mismatch` |
| No `streamId` provided | `false` | `no_stream` |
| Stream not found / entry expired | `false` | `no_stream` |
| `status == Active`, wallet matches | `true` | `active` |
| `status == Paused` | `false` | `paused` |
| `status == Cancelled` | `false` | `cancelled` |
| `status == Completed` | `false` | `expired` |
| Wallet does not match receiver | `false` | `wallet_mismatch` |
| RPC error | `false` | `unknown` |

The adapter never returns `allowed: true` unless the on-chain status is `Active`.

### Activate the adapter

Add to `.env.local` (never commit this file):

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_CONTRACT_ID=CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

---

## Verified Adapter Behavior (live testnet)

Tested against the deployed contract on 2026-05-25:

| Test | Input | Result |
|---|---|---|
| Active stream, correct receiver | stream_id=1, wallet=GCWDBQT... | `allowed=true, reason=active` |
| Missing stream | stream_id=999 | `allowed=false, reason=no_stream` |
| Wallet mismatch | stream_id=1, wrong wallet | `allowed=false, reason=wallet_mismatch` |

---

## UX Architecture (post Unified Streams refactor)

### Page responsibilities

| Page | Purpose |
|---|---|
| Dashboard | High-level overview — net flow, balance, active stream count |
| Streams | Create and manage streams across all supported chains |
| Agents | Access control — stream-state-based service authorization (Solana-focused demo) |
| History | Completed and cancelled stream ledger |
| Reports | Compliance CSV export |
| Settings | Workspace preferences |

### Stellar stream management location

Stellar Testnet stream creation and management live under **Streams → Stellar Testnet tab** (not inside the Agents page).

- The `ChainSelector` component is rendered at the top of the Streams page.
- Selecting "Stellar Testnet" mounts `StellarStreamPanel` (extracted to `components/streams/StellarStreamPanel.tsx`).
- Selecting "Solana Devnet" shows the existing stream list and Solana `NewStreamDrawer`.

### Chain-aware "New stream" button

The global "New stream" button in the Topbar respects the active chain:

- **Solana Devnet**: opens the `NewStreamDrawer` (Solana Anchor flow).
- **Stellar Testnet**: navigates to the Streams page / Stellar tab (no Solana drawer opened).

### Agents page scope

The Agents page shows a compact "Manage streams →" link card instead of the full Stellar management panel.
Stream creation and management for all chains is done exclusively from the Streams page.

---

## Architecture Principles

### No bridge. No cross-chain escrow. No shared liquidity.

A Solana Devnet stream and a Stellar Testnet stream are completely separate. There is no
mechanism to link, bridge, or share funds between them.

- Solana streams use SOL held in Anchor escrow PDAs.
- Stellar streams use XLM held in the Soroban contract (token custody not yet wired — prototype only).
- A Solana wallet address and a Stellar wallet address are different key spaces.

### Same DRIP access model on both chains

| Stream Status | Access |
|---|---|
| `Active` | Allowed |
| `Paused` | Blocked |
| `Cancelled` | Blocked |
| `Completed` | Blocked |

Unvested funds always remain controllable by the payer.

---

## Prototype Limitations

1. **~~No token transfers~~** — ✓ Resolved in Phase S5A. `create_stream` escrows XLM, `withdraw` and `cancel_stream` transfer to the correct parties using `token::Client`.

2. **~~No stream UI actions~~** — ✓ Resolved in Phase S5C. Full transaction flow implemented: build → simulate → preview → Freighter sign → submit → poll for confirmation. Create Stream form + Pause/Resume/Withdraw/Cancel buttons all wired.

3. **Testnet only** — Do not use for real funds. No mainnet deploy is planned.

4. **Deployer key is ephemeral** — The testnet deployer key is not backed up or stored in
   version control. Regenerate if needed (`stellar keys generate deployer --network testnet`
   then `stellar keys fund deployer --network testnet`).

---

## Implementation Roadmap

### Phase S5A — Token Custody ✓ Complete

Real XLM custody is implemented using the Stellar native asset SAC
(`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` on testnet).

**What was added:**
- `Stream.token: Address` — SEP-41 token contract stored per stream
- `create_stream(payer, token, receiver, amount, start_time, end_time)` now transfers `amount` from payer into contract escrow via `token::Client::transfer`
- `withdraw` transfers vested amount from contract to receiver (CEI pattern)
- `cancel_stream` transfers `receiver_due` to receiver and `payer_refund` to payer
- 14/14 unit tests pass with real balance assertions using `register_stellar_asset_contract`
- Live on testnet: stream_id=1 shows XLM transfer event (payer → contract) on creation

---

### Phase S5B — Stellar Wallet Connector ✓ Complete

**Goal:** Allow the user to connect a Freighter wallet and sign Soroban transactions.

**Package added:**
```bash
npm install @stellar/freighter-api   # v6.0.1 — uses isConnected/getAddress/getNetwork/signTransaction
```

**Files added:**

| File | Purpose |
|---|---|
| `lib/stellar/wallet.ts` | Freighter helper functions — detect, connect, sign |
| `lib/stellar/useFreighterWallet.ts` | React hook — `available`, `connected`, `address`, `network`, `networkPassphrase`, `error`, `connecting`, `connect()`, `disconnect()` |

**UI changes:**
- `ChainSelector` badge changed from `read-only` to `testnet`
- Stellar panel in `AgentsPage` updated:
  - New "Freighter Wallet" sub-panel with connect button
  - Shows installed/not-installed state (with freighter.app install link if missing)
  - Shows connected address (shortened), network name, testnet-only label
  - Shows warning if Freighter is on a non-testnet network
  - "Available now" list updated to include Freighter connect (5 items)
  - "Not yet available" list updated — Freighter removed, 2 items remain (S5C)
  - `disconnect()` clears local state only (no wallet-side revocation)

**Signing limitations:**
- `signStellarTx(xdrTx, networkPassphrase)` is available in `lib/stellar/wallet.ts`
- It must be called only in direct response to a user button press — never auto-signed
- Freighter shows a transaction preview to the user before they approve
- Phase S5C will wire this to actual stream actions

**Rules (enforced):**
- No private keys stored or transmitted
- No seed phrases
- Only sign on explicit user action
- Always show transaction preview (Freighter does this natively)
- Testnet only — no mainnet

---

### Phase S5C — Stellar UI Actions ✓ Complete

**Goal:** Add stream creation and management UI for Stellar Testnet (behind wallet connection).

**Files added / changed:**

| File | Change |
|---|---|
| `lib/stellar/transactions.ts` | New — transaction helper: build, simulate, submit all 5 contract calls + `getStreamState` |
| `components/dashboard/DashboardApp.tsx` | Added `StellarTestnetPanel` component; replaced IIFE with component call; added imports |
| `docs/architecture/STELLAR_TESTNET_SUPPORT.md` | Updated to reflect Phase S5C completion |

**Transaction helper (`lib/stellar/transactions.ts`):**

- `buildCreateStream(params)` — builds + simulates `create_stream` via Soroban RPC; returns assembled XDR
- `buildPauseStream(params)` — builds + simulates `pause_stream`
- `buildResumeStream(params)` — builds + simulates `resume_stream`
- `buildWithdraw(params)` — builds + simulates `withdraw`
- `buildCancelStream(params)` — builds + simulates `cancel_stream`
- `submitSignedTx(signedXdr)` — sends to RPC, polls for confirmation (5 × 3 s), returns `{ok, txHash, returnValue}`
- `getStreamState(streamId)` — reads persistent stream state from Soroban storage
- Exports: `STROOPS_PER_XLM`, `NETWORK_PASSPHRASE`, `EXPLORER_TX_URL`, `XLM_SAC_TESTNET`

**Transaction flow (5-phase):**

```
1. Build     — build contract call operation
2. Simulate  — server.simulateTransaction() → fail here if unauthorized/invalid
3. Preview   — show action / network / contract / signer / receiver / amount / warning
4. Sign      — signStellarTx(xdr, passphrase) — Freighter shows tx, user approves
5. Submit    — sendTransaction() → poll getTransaction() → show hash + explorer link
```

**UI changes (gated on `freighter.connected && isTestnet && contractConfigured`):**

- **New Stream tab**: Receiver address input (G... validation), XLM amount (stroops display), duration in hours → Preview Transaction → Sign in Freighter → submit
- **Manage Stream tab**: Stream ID input → Load (shows status/payer/receiver/amount/withdrawn) → action buttons (Pause / Resume / Withdraw / Cancel) with status-aware enable logic
- **Transaction preview panel**: shows all details before any Freighter prompt
- **Building / Signing / Submitting spinners** with descriptive labels
- **Success state**: tx hash + stellar.expert explorer link + stream ID (for create_stream)
- **Error state**: error message + Try again button (fail closed on simulation failures)

**Safety enforced:**

- All builds simulate first — contract authorization errors surface before Freighter opens
- No auto-sign: user must click "Sign in Freighter" to trigger signing
- Wrong network → buttons never shown (gated on `isTestnet`)
- Missing env vars → buttons never shown (gated on `contractConfigured`)
- Simulation failure → error state, no Freighter prompt
- User rejection in Freighter → error state with message

**UI actions (gated on loaded stream status):**

| Action | Enabled when |
|---|---|
| Pause | status === "Active" |
| Resume | status === "Paused" |
| Withdraw | status === "Active" |
| Cancel | status !== "Cancelled" && status !== "Completed" |

When no stream is loaded: all buttons enabled (contract enforces auth — simulation fails safely).

**Testnet explorer:** `https://stellar.expert/explorer/testnet/tx/{hash}`

