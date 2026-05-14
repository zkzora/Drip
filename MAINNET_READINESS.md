# DRIP Mainnet Readiness Audit

Date: 2026-05-14

Verdict: DRIP is not mainnet ready yet. The core Anchor program is small and mostly disciplined, but mainnet launch should wait until the remaining test gaps, production environment separation, monitoring, and real-money UX warnings are closed.

## Scope Reviewed

- Anchor program: `programs/drip/src/lib.rs`
- Anchor tests: `tests/drip.ts`
- Frontend Solana client: `lib/solana/*`
- Wallet providers: `components/providers/*`
- Dashboard transaction flows: `components/dashboard/DashboardApp.tsx`
- Compliance export: `components/compliance/CompliancePage.tsx`, `lib/compliance/*`
- Environment/config: `.env.example`, `.env.local`, `Anchor.toml`, `package.json`, Next config files
- User-facing docs/copy: `README.md`, `DEVNET_DEPLOYMENT.md`, landing/dashboard mock data

## Changes Made During Audit

- [Important] Fixed a real pause/expiration accounting bug in `resume_stream`.
  - Before: if a stream was paused before expiration and resumed after expiration, `total_paused_seconds` could include time after expiration. Later `withdraw` or `cancel` could underflow and fail with `MathError`.
  - Now: resumed pause duration is capped at the expiration timestamp when the stream has already expired.
- [Important] Added an Anchor regression test: `resume after expiration while paused does not brick cancellation`.
- [Important] Made frontend program ID configuration fail closed.
  - Missing or invalid `NEXT_PUBLIC_DRIP_PROGRAM_ID` is no longer treated as configured just because a devnet fallback exists.
- [Important] Made Jupiter wallet environment follow `NEXT_PUBLIC_SOLANA_CLUSTER` for mainnet.
  - It now uses `mainnet-beta` when the app cluster is `mainnet-beta`, otherwise devnet.
- [Important] Fixed the Anchor `0.30.1` IDL generation blocker.
  - `anchor-syn 0.30.1` is locally patched to use `ANCHOR_IDL_BUILD_PROGRAM_PATH` instead of the unstable `proc_macro2::Span::source_file()` path.
  - SBF build, IDL build, and the full Anchor test path now complete under the pinned Solana `1.18.26` / Rust `1.75.0` toolchain.
- [Important] Stabilized flaky expiration tests.
  - Expiration timestamps are now computed after test-account funding so slow validator setup does not accidentally create already-expired streams.
- [Important] Added Phase 3A critical money-path tests.
  - Coverage now includes unauthorized payer actions, escrow PDA mismatch, repeated withdrawals, multi-cycle pause/resume, partial-withdraw cancel settlement, receiver mismatch on cancel, max-budget cancel settlement, tiny lamport streams, and huge flow-rate overflow protection.
- [Important] Fixed a real high-rate overflow/stuck-funds bug in `calculate_unlocked_amount`.
  - Unlock math now saturates at the applicable deposit/max-budget cap before multiplication can overflow.
- [Important] Added GitHub Actions validation workflow.
  - `.github/workflows/validation.yml` pins Node `20.20.2`, Rust `1.75.0`, Solana `1.18.26`, and Anchor `0.30.1`.
  - Remote GitHub Actions status is still pending until the workflow is pushed and observed green.

## Critical Before Mainnet

- [Critical] Add CI and close the remaining critical money-path tests.
  - WSL Ubuntu now has Solana `1.18.26`, `cargo build-sbf` `1.18.26`, Anchor `0.30.1`, Rust/Cargo `1.75.0`, and `Cargo.lock` version `3`.
  - `npm run preflight:solana`, `npm run build`, and `npm run test:anchor:full` pass locally in WSL.
  - The current Anchor suite reports `29 passing`.
  - Mainnet cannot proceed until this path is observed green in CI and the critical gaps in `TEST_GAPS.md` are closed.
- [Critical] Add a mainnet deployment plan with upgrade authority controls.
  - `Anchor.toml` only defines `devnet` and `localnet`.
  - There is no `[programs.mainnet]` entry, no upgrade authority policy, no multisig/timelock plan, and no verified mainnet program ID.
- [Critical] Clean mainnet UX copy before exposing real funds.
  - Dashboard and landing still contain devnet/demo language mixed with real transaction actions.
  - Yield/Raydium copy in the dashboard overstates behavior not implemented on-chain.
  - Agent terminal copy must remain clearly marked as simulation if shipped at all.
- [Critical] Add production RPC and monitoring.
  - Current fallback RPC is public devnet.
  - No mainnet RPC provider, rate-limit strategy, failover, transaction indexing, alerting, or stream event monitoring is configured.

## Important But Non-Blocking

- [Important] Escrow and stream accounts are not closed on cancel.
  - Cancel refunds stream funds but leaves escrow rent reserve and `StreamState` rent locked.
  - This is not a fund-loss exploit, but it is a mainnet cost and lifecycle issue.
- [Important] Frontend uses `confirmed` commitment only.
  - Good for speed, but mainnet UX should distinguish submitted, confirmed, finalized, and state-refreshed.
- [Important] Fetching all program accounts by wallet memcmp is acceptable for MVP, but not enough for production scale.
  - Add indexing or RPC provider-backed account queries before real user growth.
- [Important] Tests cover happy paths well, but not enough hostile/boundary cases.
  - See `TEST_GAPS.md`.
- [Important] Compliance export is useful, but tax/accounting copy must stay conservative.
  - It currently computes flat-rate estimates. This must not be presented as filing advice.
- [Important] There are two Next config files.
  - `next.config.js` and `next.config.mjs` both exist. Build passed, but production config ownership should be unambiguous.

## Nice To Have

- [Nice to Have] Add compute-unit profiling per instruction.
- [Nice to Have] Add fuzz/property tests for stream accounting invariants.
- [Nice to Have] Add an explicit close/reclaim instruction after cancellation.
- [Nice to Have] Add generated IDL/type drift checks in CI.
- [Nice to Have] Add browser E2E tests for connect, create, withdraw, pause, resume, cancel.

## Smart Contract Assessment

### Arithmetic Safety

Status: Mostly good, with one issue fixed during this audit.

- `checked_add`, `checked_sub`, and `checked_mul` are used for value-sensitive logic.
- `Cargo.toml` enables release `overflow-checks = true`.
- `calculate_unlocked_amount` caps unlocked funds by deposit, optional max budget, expiration, and pause state.
- Fixed risk: pause duration is now capped at expiration during resume.

Remaining concern:

- [Important] Add tests for extreme `u64` values, tiny rates, and max-budget boundary values.

### Escrow Safety

Status: Good core model, incomplete lifecycle.

- Escrow is a PDA derived from `["escrow", stream_state]`.
- All escrow outgoing transfers are signed by PDA seeds.
- Only the System Program is called.
- Available stream funds subtract rent reserve before transfer.

Remaining concern:

- [Important] Cancel does not close escrow or stream state. Rent stays locked.

### Withdraw Edge Cases

Status: Basic path is covered.

- Receiver must sign.
- Receiver key must match stream state.
- Paused and cancelled streams reject withdraw.
- Withdrawable amount is computed as unlocked minus already withdrawn.
- Duplicate immediate withdraw generally hits `NothingToWithdraw`.

Missing tests:

- [Critical] Repeated withdrawals across multiple time windows.
- [Important] Tiny lamport-rate streams and rounding behavior.
- [Important] Withdraw after max budget is reached.

### Pause/Resume

Status: Improved during audit.

- Payer must sign.
- Double pause and resume-when-not-paused are rejected.
- Paused streams do not accrue.
- Fixed expiration interaction after pause/resume.

Missing tests:

- [Critical] Multiple pause/resume cycles.
- [Important] Pause after expiration.
- [Important] Cancel while paused and expired.

### Cancel Settlement

Status: Reasonable, but needs more exact balance tests.

- Payer must sign.
- Receiver account must match stored receiver pubkey.
- Receiver is paid unlocked but unwithdrawn funds first.
- Payer receives remaining unpaid stream funds after receiver settlement.
- Cancelled streams reject further actions.

Missing tests:

- [Critical] Cancel after partial withdrawal with exact receiver and payer deltas.
- [Important] Cancel after max budget has already been fully withdrawn.
- [Important] Cancel while paused before and after expiration.

### PDA / Authority Validation

Status: Good.

- Stream PDA seeds are consistent in program and frontend:
  - `["stream", payer, receiver, stream_id_le_u64]`
- Escrow PDA seeds are consistent:
  - `["escrow", stream_state]`
- Anchor account constraints re-derive PDAs.
- Payer and receiver roles are enforced with `Signer` where required.

### Re-entrancy Style Risk

Status: Low.

- No arbitrary external CPI.
- Only System Program transfer CPI is used.
- State is updated after successful transfers. Failed transfers abort the instruction.
- Solana does not have EVM-style re-entrancy, and this program does not call untrusted programs.

## Frontend Production Readiness

### Good

- Wallet connection is explicit through Jupiter wallet adapter.
- Program ID and cluster are visible in the create-stream drawer.
- Real on-chain stream fetch exists.
- Per-stream action guard blocks duplicate clicks in the UI.
- Explorer links use the configured cluster.
- Basic Anchor error mapping exists for common cases.

### Mainnet Risks

- [Critical] Devnet/demo copy is still mixed into the production dashboard.
- [Critical] Yield/Raydium UI copy implies routing and APY behavior that is not implemented.
- [Important] Transaction UX treats `.rpc()` success as enough. It should verify state after confirmation and expose finalization/pending states clearly.
- [Important] Error messages still expose raw wallet/RPC text in some paths.
- [Important] Amount conversions use JavaScript `number` in UI. This is acceptable for small MVP values, but should be bounded before mainnet.
- [Important] `fetchStreamsForWallet` uses program account scans. This can become slow or rate-limited on mainnet.

## Infrastructure Readiness

- [Critical] Mainnet environment separation is not complete.
  - `.env.example` and `.env.local` are devnet.
  - `Anchor.toml` lacks mainnet program mapping.
- [Critical] No production RPC provider or failover is configured.
- [Critical] No monitoring of create/withdraw/pause/resume/cancel events.
- [Important] No documented upgrade authority custody.
- [Important] No deployment checklist for program verification, IDL publishing, or post-deploy smoke tests.
- [Important] Build passed, but emitted `MaxListenersExceededWarning`.

## Recommended Execution Order

1. [Critical] Add the remaining critical tests from `TEST_GAPS.md`.
2. [Critical] Push and confirm the GitHub Actions validation workflow is green.
3. [Critical] Decide mainnet program ID, upgrade authority, and deployment process.
4. [Critical] Configure mainnet env, RPC provider, and monitoring.
5. [Critical] Remove or hard-gate demo/yield/agent overclaim copy in mainnet builds.
6. [Important] Add transaction finalization/state-verification UX.
7. [Important] Add account indexing or provider-backed stream queries.
8. [Important] Decide whether account rent is intentionally locked or add close/reclaim lifecycle.
9. [Nice to Have] Add fuzz/property tests and compute profiling.

## Validation Performed

- `npm ci`: Passed in WSL, but reported `8 vulnerabilities` in the JS dependency tree.
- `npm run preflight:solana`: Passed in WSL.
- `npm run build`: Passed in WSL.
- `anchor idl build -p drip`: Passed in WSL.
- `anchor build`: Passed in WSL.
- `anchor test --skip-build`: Passed in WSL validation copy with `29 passing`.
- `npm run test:anchor:full`: Passed in WSL validation copy with `29 passing`.
- WSL toolchain versions detected:
  - Node `v20.20.2`
  - Rust `1.75.0`
  - Cargo `1.75.0`
  - Solana CLI `1.18.26`
  - `cargo build-sbf` `1.18.26`
  - Anchor CLI `0.30.1`
  - `Cargo.lock` version `3`
- Fixed blocker classes:
  - Missing Solana/SBF tools.
  - Lockfile/dependency drift.
  - Anchor `0.30.1` IDL generation failure in `proc_macro::SourceFile` / `Span::source_file`.
- Remaining validation blockers:
  - No CI executes the green local path yet.
  - Critical money-path gaps in `TEST_GAPS.md` still need additional tests.
