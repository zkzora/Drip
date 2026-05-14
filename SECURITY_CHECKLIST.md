# DRIP Security Checklist

Date: 2026-05-14

## Summary

The Anchor program has a good security baseline for a native SOL MVP: signer checks are explicit, PDA constraints are consistent, checked math is used, and escrow transfers are PDA-signed System Program transfers. Phase 2.7 restored local reproducible Anchor validation, Phase 3A expanded money-path coverage to 29 passing tests, and Phase 3B added a pinned GitHub Actions workflow. The main unresolved security-readiness issues are observing CI green remotely, remaining critical edge tests, account lifecycle/rent handling, mainnet deployment controls, and frontend copy/config safety.

## Critical Before Mainnet

| Severity | Area | Status | Evidence | Required Action |
| --- | --- | --- | --- | --- |
| Critical | Reproducible security tests | Local pass / remote CI pending | WSL `npm run test:anchor:full` passes with `29 passing`; `.github/workflows/validation.yml` has been added but needs a green GitHub run | Require CI green on every PR before mainnet work proceeds |
| Critical | Mainnet upgrade authority | Missing | No mainnet entry in `Anchor.toml`; no custody policy | Define upgrade authority, multisig/timelock, rotation, and emergency pause process |
| Critical | Production RPC/monitoring | Missing | No production RPC provider, indexer, alerts, or event monitoring | Add RPC provider, failover, logs, transaction/event alerts |
| Critical | Mainnet UX safety | Open | Dashboard contains devnet/demo/yield/agent overclaiming copy | Gate or remove non-live claims before mainnet |

## Program Security Checks

| Severity | Check | Status | Notes |
| --- | --- | --- | --- |
| Critical | Payer signer validation | Pass | `InitializeStream`, `PauseStream`, `ResumeStream`, and `CancelStream` use payer signer where needed |
| Critical | Receiver signer validation | Pass | `Withdraw` requires receiver signer and stored receiver match |
| Critical | PDA validation | Pass | Stream and escrow accounts are constrained with deterministic seeds and stored bumps |
| Critical | Arithmetic safety | Pass after fixes | Checked math is used in deposit funding, withdrawal, pause duration, and cancel settlement; unlock math saturates at cap before high-rate multiplication can overflow |
| Critical | Escrow authorization | Pass | Escrow funds move only through PDA-signed System Program transfers |
| Critical | Reinitialization protection | Pass | Stream account uses Anchor `init`; duplicate stream PDA cannot be reinitialized |
| Critical | Account type validation | Pass | `StreamState` uses Anchor account discriminator |
| Important | Receiver unchecked account | Acceptable | Receiver is only stored or used as a lamport recipient; key equality is checked on cancel |
| Important | Escrow unchecked account | Acceptable | Escrow is a native SOL PDA with no data; PDA seeds validate it |
| Important | Rent reserve protection | Partial | Withdraw/cancel preserve rent reserve, but rent is not reclaimed |
| Important | Account close safety | Open | No close path exists for escrow or stream state after cancellation |
| Important | Duplicate action behavior | Improved | Double pause/resume/cancel are rejected; repeated withdraw now has direct coverage |
| Important | State monotonicity | Improved | Pause-after-expiration resume bug was fixed; more property tests needed |
| Nice to Have | Compute profiling | Missing | No CU profiling output or budget documentation |
| Nice to Have | Formal/fuzz testing | Missing | No Trident/property tests for accounting invariants |

## Authority Model

- Payer controls creation, pause, resume, and cancel.
- Receiver controls withdraw.
- Receiver does not need to sign cancel because cancel sends earned funds to the stored receiver and refund to payer.
- No admin authority exists in the program.
- No global config PDA exists.

Risk:

- [Important] No emergency admin means bugs can only be fixed by program upgrade while upgrade authority exists. This is acceptable for MVP, but mainnet needs an explicit upgrade authority plan.

## Escrow And Rent

Good:

- Escrow PDA is unique per stream.
- Escrow transfer uses signer seeds.
- Withdrawable funds subtract `Rent::minimum_balance(escrow.data_len())`.
- Tests verify escrow balance equals deposit plus rent reserve on creation and rent reserve remains after cancel.

Risk:

- [Important] Stream state rent and escrow rent reserve are not reclaimed.
- [Important] There is no test that maliciously drains escrow below rent reserve and verifies expected failure.

Recommended action:

1. Decide whether locked rent is an intentional MVP tradeoff.
2. If not intentional, add a close/reclaim lifecycle after cancel.
3. Add tests for rent reserve preservation and post-cancel account lifecycle.

## Arithmetic And Accounting Invariants

Expected invariants:

- `withdrawn_amount <= deposited_amount`
- If `max_budget > 0`, `withdrawn_amount <= max_budget`
- Receiver due on cancel equals `min(unlocked - withdrawn_amount, available)`
- Payer refund on cancel equals remaining unpaid deposited funds, bounded by available escrow funds
- Paused time should only subtract time before stream expiration
- Unlocked amount should never decrease under normal state transitions

Status:

- [Important] The pause/expiration invariant had a real bug and was fixed.
- [Critical] These invariants still need additional boundary-matrix and property-style tests before mainnet.

## Frontend Security Checks

| Severity | Check | Status | Notes |
| --- | --- | --- | --- |
| Critical | Program ID fail-closed | Fixed | Missing/invalid `NEXT_PUBLIC_DRIP_PROGRAM_ID` no longer counts as configured |
| Important | Cluster parsing | Fixed | Invalid cluster strings fall back to devnet instead of being blindly cast |
| Important | Wallet env | Fixed | Jupiter wallet env now follows `mainnet-beta` when configured |
| Important | Transaction confirmation | Partial | Uses Anchor `.rpc()` with confirmed commitment; no finalized/state-verified phase |
| Important | Error mapping | Partial | Common Anchor errors mapped; raw errors still leak in create path |
| Important | Duplicate clicks | Partial | UI has an in-flight guard per stream; chain-level duplicate tests still needed |
| Important | Real-money warning | Missing | Mainnet build should warn users before locking real SOL |
| Nice to Have | Simulation before send | Missing | No explicit transaction simulation UX |

## Secrets And Key Material

- `.env.local` is not tracked.
- `.env.example` only contains public devnet values.
- `target/deploy/drip-keypair.json` exists locally but is not tracked by git.

Required action:

- [Critical] Do not reuse local/devnet key material for mainnet.
- [Important] Document deploy key custody and rotation.

## Recommended Execution Order

1. [Critical] Add missing critical accounting and authorization tests.
2. [Critical] Push and confirm CI test execution for the now-green local validation path.
3. [Critical] Define mainnet upgrade authority and deploy-key custody.
4. [Critical] Add production RPC, indexer, and event monitoring.
5. [Critical] Remove or gate demo/yield/agent claims in mainnet builds.
6. [Important] Decide account close/rent reclaim policy.
7. [Important] Add finalized transaction/state refresh UX.
8. [Nice to Have] Add fuzz/property tests and CU profiling.
