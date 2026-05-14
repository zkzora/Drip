# DRIP Production Blockers

Date: 2026-05-14

## Critical Blockers Before Mainnet

### [Critical] CI workflow exists but has not yet proven the green local validation path remotely

Observed:

- WSL Ubuntu now has the required validation toolchain:
  - Node `v20.20.2`
  - Rust/Cargo `1.75.0`
  - Solana CLI `1.18.26`
  - `cargo build-sbf` `1.18.26`
  - Anchor CLI `0.30.1`
- `Cargo.lock` has been regenerated from WSL with Cargo `1.75.0` and is now lockfile version `3`.
- The known incompatible dependency drift has been removed or pinned to Solana `1.18` compatible versions:
  - no `block-buffer 0.12.0`
  - no `toml_datetime 1.1.1+spec-1.1.0`
  - no `indexmap 2.14.0`
  - no `borsh 1.6.1`
  - no `unicode-segmentation 1.13.2`
- `proc-macro2 1.0.106` works after the local `anchor-syn 0.30.1` IDL patch.
- `anchor idl build -p drip`, `anchor build`, and `anchor test --skip-build` pass in WSL.
- `npm ci`, `npm run preflight:solana`, `npm run build`, and `npm run test:anchor:full` pass in WSL.
- The Anchor suite currently reports `29 passing`.
- `.github/workflows/validation.yml` now defines the same validation path for GitHub Actions.
- A remote GitHub Actions pass is still pending until the workflow is pushed and run.

Why it blocks mainnet:

- The full validation path is green locally, but has not yet been observed green in GitHub Actions.
- Mainnet deploys need a clean path that builds SBF, generates IDL, starts a validator, deploys the program, and runs the Anchor suite in automation.
- Without CI, future dependency/toolchain drift can silently reintroduce the same class of blocker.

Required action:

1. Push the workflow and confirm GitHub Actions installs Node `20.20.2`, Rust `1.75.0`, Solana `1.18.26`, and Anchor CLI `0.30.1`.
2. Confirm the remote workflow runs `npm ci`, `npm run preflight:solana`, `npm run build`, and `npm run test:anchor:full`.
3. Confirm SBF, IDL, validator, and test outputs are uploaded as non-secret artifacts.
4. Do not deploy mainnet until the same path passes in CI.

### [Critical] Mainnet deployment configuration is missing

Observed:

- `Anchor.toml` has `[programs.devnet]` and `[programs.localnet]`, but no mainnet program mapping.
- Production env examples exist, but no real mainnet program ID or RPC provider has been chosen.
- README and deployment docs still treat the project as pre-mainnet.

Required action:

1. Decide final mainnet program ID.
2. Add `[programs.mainnet]` or documented equivalent deployment command.
3. Create production env values:
   - `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`
   - `NEXT_PUBLIC_SOLANA_RPC_URL=<production RPC>`
   - `NEXT_PUBLIC_DRIP_PROGRAM_ID=<mainnet program ID>`
4. Add a post-deploy smoke test for create, withdraw, pause, resume, and cancel with tiny SOL.

### [Critical] Upgrade authority and deploy key custody are undefined

Observed:

- No documented deploy authority.
- No multisig/timelock policy.
- Local `target/deploy/drip-keypair.json` exists but is not tracked.

Required action:

1. Do not use devnet/local key material for mainnet.
2. Define upgrade authority custody.
3. Prefer a multisig for upgrade authority before public mainnet usage.
4. Document emergency upgrade and rollback procedure.

### [Critical] Production RPC and observability are missing

Observed:

- No mainnet RPC provider is selected.
- No mainnet RPC failover, indexer, or event monitor exists.
- No alerting exists for failed transactions, stuck streams, high error rates, or RPC degradation.

Required action:

1. Pick a production RPC provider.
2. Add RPC failover or at least provider status monitoring.
3. Subscribe/index `StreamCreated`, `Withdrawn`, `StreamPaused`, `StreamResumed`, and `StreamCancelled`.
4. Alert on transaction failure spikes and stream/account fetch failures.

### [Critical] Mainnet UX still contains demo and non-live claims

Observed:

- Dashboard side nav and balances still say devnet/demo in several places.
- Yield page says funds are routed into Raydium concentrated liquidity vaults, but program has no Raydium logic.
- Agent page includes demo simulation and future autopilot concepts.
- Compliance PDF is shown as a product surface but is not implemented.

Required action:

1. Gate demo pages/copy out of mainnet builds or keep them explicitly disabled.
2. Remove any claim that escrow funds earn Raydium yield.
3. Keep CSV export as live; keep PDF as coming soon or hide it.
4. Add real-money warnings to create/cancel/withdraw flows.

## Important Non-Blocking Issues

### [Important] JS dependency audit is not clean

`npm ci` passed but reported `8 vulnerabilities` in the current JS dependency tree. Do not run blind `npm audit fix --force`; review whether fixes are transitive wallet-adapter issues or direct dependency updates.

### [Important] Account rent is not reclaimed

Cancel leaves the stream state account and escrow rent reserve in place.

Impact:

- Users permanently spend rent unless a future close/reclaim path is added.
- This is a lifecycle and UX issue, not an immediate exploit.

Required action:

- Decide whether this is acceptable for first mainnet.
- If not, add close/reclaim after cancellation and test it thoroughly.

### [Important] Transaction UX needs finalization/state verification

Current flow:

- Anchor `.rpc()` returns a signature at confirmed commitment.
- UI refreshes streams after action.

Risk:

- Users may see success before finality.
- RPC delays can leave UI state stale.
- Failed refresh can make a successful transaction look uncertain.

Required action:

- Show submitted, confirmed, finalized, and refreshed states.
- After each action, fetch the stream account and verify the expected state.

### [Important] Stream fetching will not scale indefinitely

Current flow:

- `fetchStreamsForWallet` uses program account scans with payer/receiver memcmp filters.

Risk:

- Mainnet RPC providers may rate limit scans.
- UX may degrade as account count grows.

Required action:

- Add an indexer or provider-backed query path before broad launch.

### [Important] Frontend amount handling needs explicit bounds

Current flow:

- UI converts several lamport and SOL values through JavaScript `number`.

Risk:

- Fine for small MVP values.
- Unsafe for very large deposits/rates or long-lived streams.

Required action:

- Enforce UI input bounds.
- Keep on-chain amounts as `BN`.
- Add tests for formatting tiny and large amounts.

### [Important] Duplicate Next config files should be consolidated

Observed:

- Both `next.config.js` and `next.config.mjs` exist.
- Build passed, but config ownership is ambiguous.

Required action:

- Keep one Next config file and merge required options into it.

## Nice To Have

- [Nice to Have] Add compute-unit profiling.
- [Nice to Have] Add fuzz/property tests for stream accounting.
- [Nice to Have] Add browser E2E against local validator.
- [Nice to Have] Add health endpoint or status dashboard for production RPC/indexer.
- [Nice to Have] Add structured client-side telemetry for transaction failures.

## Recommended Execution Order

1. [Critical] Add the remaining critical tests from `TEST_GAPS.md`.
2. [Critical] Add CI for the now-green local validation path.
3. [Critical] Investigate the `npm ci` audit output and decide whether any high vulnerabilities affect production.
4. [Critical] Define mainnet program ID and upgrade authority custody.
5. [Critical] Configure production env and RPC provider.
6. [Critical] Add event monitoring and alerts.
7. [Critical] Remove or gate demo/yield/agent overclaim UX for mainnet.
8. [Important] Add finalized transaction/state verification UX.
9. [Important] Decide rent close/reclaim policy.
10. [Nice to Have] Add fuzz/property tests and compute profiling.
