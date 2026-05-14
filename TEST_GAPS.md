# DRIP Test Gaps

Date: 2026-05-14

Current Anchor test file: `tests/drip.ts`

After Phase 3A, the suite contains 29 test cases and `npm run test:anchor:full` passes in the official WSL validation copy. The added regression coverage includes authority checks, PDA mismatch checks, repeated withdrawals, partial-withdraw cancel settlement, max-budget cancel settlement, tiny lamport streams, and huge-rate overflow protection.

## Already Covered Well

- [Important] Stream creation stores payer, receiver, stream ID, deposit, and initial state.
- [Important] Escrow receives deposited amount plus rent reserve.
- [Important] Rejects zero deposit.
- [Important] Rejects zero flow rate.
- [Important] Rejects receiver equal to payer.
- [Important] Rejects max budget greater than deposit.
- [Important] Rejects expiration in the past.
- [Important] Receiver can withdraw after time passes.
- [Important] Unauthorized receiver cannot withdraw.
- [Important] Unauthorized payer cannot pause, resume, or cancel.
- [Important] Withdraw with a mismatched escrow PDA is rejected.
- [Important] Immediate second withdraw can fail with `NothingToWithdraw`.
- [Important] Repeated withdrawals increase monotonically and stay below elapsed/deposit caps.
- [Important] Payer can pause.
- [Important] Withdraw while paused is rejected.
- [Important] Payer can resume.
- [Important] Stream does not accrue while paused.
- [Important] Multiple pause/resume cycles do not accrue during pauses.
- [Important] Payer can cancel.
- [Important] Cancel settles receiver due.
- [Important] Cancel after partial withdrawal pays only newly unlocked funds.
- [Important] Cancel with a mismatched receiver account is rejected.
- [Important] Cancel refunds remaining escrow to payer.
- [Important] Actions after cancellation are rejected.
- [Important] Expiration caps accrual.
- [Important] Max budget caps accrual.
- [Important] Max budget reached then cancel refunds unused deposit.
- [Important] Tiny one-lamport streams withdraw integer lamports only.
- [Important] Huge flow rate saturates at the stream cap instead of overflowing.
- [Important] Regression test: resume after expiration while paused does not brick cancellation.

## Critical Missing Before Mainnet

| Severity | Missing Test | Why It Matters |
| --- | --- | --- |
| Critical | Exact balance tests with transaction fees accounted for | Current tests verify receiver deltas exactly where no signer fee applies, but payer refund tests are still directional because payer pays fees |
| Critical | Expiration plus pause matrix | Need pause before expiration, pause after expiration, cancel while paused, withdraw after expired resume |
| Critical | Max budget boundary matrix | Need `max_budget == deposit`, `max_budget == flow_rate`, `max_budget < flow_rate`, and cap reached then cancel |
| Critical | Duplicate/repeated action risk | Need same/adjacent-slot repeat pause/resume/cancel in addition to existing repeat withdraw/double cancel coverage |
| Critical | Escrow/rent tamper or low-balance edge | If escrow is underfunded below expected available funds, instruction should fail safely |
| Critical | Extreme arithmetic values beyond huge-rate cap | Huge-rate overflow is covered; still need large deposit/rate/max-budget combinations |

## Important Missing

- [Important] Duplicate `stream_id` for same payer/receiver should fail due existing PDA.
- [Important] Same `stream_id` with different receiver should produce a different PDA.
- [Important] Receiver as non-system account/program account on cancel should be intentionally accepted or rejected by test.
- [Important] Withdraw after max budget fully reached should return `NothingToWithdraw`.
- [Important] Cancel immediately after create should refund nearly all deposited stream funds.
- [Important] Pause immediately after create then cancel should not pay receiver unexpectedly.
- [Important] Resume after very short pause in same Unix second should not underflow.
- [Important] Expired stream with zero unlocked amount should fail withdraw cleanly.
- [Important] Frontend client PDA derivation should be tested against program seeds.
- [Important] CSV compliance export should have tests for real on-chain mapped records, not only manual UI behavior.
- [Important] Error mapping should be unit tested for Anchor errors.

## Nice To Have

- [Nice to Have] Property tests for `calculate_unlocked_amount`.
- [Nice to Have] Fuzzing with random pause/resume/withdraw/cancel timelines.
- [Nice to Have] Compute-unit snapshots per instruction.
- [Nice to Have] Browser E2E tests against local validator.
- [Nice to Have] Snapshot tests for explorer URL generation per cluster.

## Suggested Test Cases To Add First

1. [Critical] `payer refund exactness net of transaction fees`
   - Create stream.
   - Withdraw partially.
   - Cancel.
   - Compute payer refund from escrow/state deltas rather than raw wallet delta alone.

2. [Critical] `pause and cancel around expiration matrix`
   - Pause before expiration then cancel while still paused after expiration.
   - Pause after expiration.
   - Withdraw after expired resume.

3. [Critical] `max budget boundary matrix`
   - Cover `max_budget == deposit`, `max_budget == flow_rate`, and `max_budget < flow_rate`.

4. [Critical] `repeat lifecycle actions in adjacent slots`
   - Repeat pause, resume, and cancel immediately after a successful action.
   - Assert expected errors and unchanged money state.

5. [Critical] `escrow low-balance failure`
   - If a test harness can safely create an underfunded escrow condition, assert withdraw/cancel fails closed.

6. [Important] `duplicate stream ID for same payer receiver fails`
   - Initialize same payer/receiver/stream_id twice.
   - Expect Anchor account already in use failure.

## Recommended Execution Order

1. [Critical] Add exact fee-aware payer/refund balance tests.
2. [Critical] Add expiration/pause/cancel matrix tests.
3. [Critical] Add max-budget boundary matrix tests.
4. [Critical] Add same-slot/adjacent-slot repeated action tests.
5. [Important] Add PDA and duplicate stream ID tests.
6. [Important] Add frontend unit tests for error mapping, formatting, and explorer URLs.
7. [Nice to Have] Add fuzz/property tests once deterministic coverage is solid.

## Current Validation Status

- `npm ci`: Passed in WSL, but reported `8 vulnerabilities` in the JS dependency tree.
- `npm run preflight:solana`: Passed in WSL with Rust/Cargo `1.75.0`, Solana CLI `1.18.26`, `cargo build-sbf` `1.18.26`, Anchor CLI `0.30.1`, and Cargo.lock version `3`.
- `npm run build`: Passed in WSL.
- `anchor idl build -p drip`: Passed in WSL.
- `anchor build`: Passed in WSL.
- `anchor test --skip-build`: Passed in WSL validation copy with `29 passing`.
- `npm run test:anchor:full`: Passed in WSL validation copy with `29 passing`.

Mainnet readiness requires these tests to pass in CI, not only on one developer machine.

The validation pipeline is now unblocked and Phase 3A closed several money-path gaps. The remaining gaps above should be handled before mainnet or before accepting meaningful real funds.
