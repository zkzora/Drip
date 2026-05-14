# DRIP Validation Runbook

Last updated: 2026-05-14

Goal: make validation reproducible before any mainnet work.

## Clean Checkout Commands

Run these from the repo root:

```bash
npm ci
npm run preflight:solana
npm run build
npm run test:anchor:full
```

If a local validator is already running and the program has already been built/deployed by `anchor test`, the Anchor client tests can still be run directly:

```bash
npm run anchor:test
```

## What Each Command Proves

| Command | Purpose | Required Before Mainnet |
| --- | --- | --- |
| `npm ci` | Reproducible JS dependencies from `package-lock.json` | Critical |
| `npm run preflight:solana` | Confirms Node, Rust, Cargo, Solana CLI, Anchor CLI, `cargo build-sbf`, and Cargo.lock compatibility | Critical |
| `npm run build` | Builds the production Next.js app and runs TypeScript | Critical |
| `npm run test:anchor:full` | Builds/deploys the Anchor program on local validator and runs `tests/**/*.ts` | Critical |
| `npm run anchor:test` | Runs the TypeScript Anchor tests only | Important |

## Expected Toolchain

- Node.js: `v20.20.2`
- Anchor CLI: `0.30.1`
- Solana CLI: `1.18.26`
- Cargo SBF subcommand: `solana-cargo-build-sbf 1.18.26`
- Rust/Cargo host toolchain: project-pinned Rust `1.75.0`
- `Cargo.lock`: version `3`

`npm run preflight:solana` enforces these exact versions. A different installed version should be treated as a blocked validation environment, not a soft warning.

Rust `1.79.0` was tested first, but regenerating a lockfile with that Cargo line produces lockfile version `4`. Before the Phase 2.7 IDL fix, Rust `1.78.0` kept lockfile version `3` but hit the same `proc_macro::SourceFile` error. The project is pinned to Rust `1.75.0` because it matches the Solana `1.18.26` SBF platform Rust line and keeps lock generation reproducible.

Phase 2.7 resolved the Anchor IDL blocker while keeping Rust `1.75.0` and lockfile version `3`.

## WSL Validation Path

Windows native remains fragile for Solana SBF. Use WSL Ubuntu for the official validation path.

From the Windows repo root:

```powershell
wsl.exe -d DripUbuntu -u root -- bash /mnt/c/Drip/scripts/run-wsl-validation.sh
```

That helper copies the current workspace into `/root/drip-validation`, excluding `.git`, `node_modules`, `.next`, `target`, `test-ledger`, and large grant media, then runs:

```bash
npm ci
npm run preflight:solana
npm run build
npm run test:anchor:full
```

Run the official path from the WSL ext4 copy, not directly from `/mnt/c/Drip`, when validating Anchor tests. The Windows-mounted filesystem can make `solana-test-validator` startup and RocksDB ledger operations slow enough to produce misleading timeouts.

## GitHub Actions Validation

Workflow path:

- `.github/workflows/validation.yml`

Triggers:

- Pull requests
- Pushes to `main`
- Manual `workflow_dispatch`

Pinned CI toolchain:

- Node.js `20.20.2` via `actions/setup-node@v4`
- Rust `1.75.0` via `rustup toolchain install`
- Solana CLI `1.18.26` via the Anza release installer
- `cargo build-sbf 1.18.26` from the same Solana release
- Anchor CLI `0.30.1` via `cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked --force`

CI command sequence:

```bash
npm ci
npm run preflight:solana
npm run build
npm run test:anchor:full
```

Additional CI checks:

- Verifies all pinned toolchain versions before dependency install.
- Verifies `anchor-syn 0.30.1` resolves from `vendor/anchor-syn-0.30.1`.
- Keeps `Cargo.lock` version `3` enforcement active through `npm run preflight:solana`.
- Uploads non-secret validation artifacts on every run:
  - Anchor program logs
  - local validator test-ledger log
  - generated IDL
  - built `.so` program artifact

Current CI status:

- Workflow is added locally.
- A remote GitHub Actions pass is still pending until these changes are pushed and the workflow runs on GitHub.
- Do not count CI as source-of-truth until the remote workflow is green.

## Current Local Status

- Windows native `npm run preflight:solana`: expected to fail unless Solana CLI and `cargo build-sbf` are installed on Windows.
- WSL `DripUbuntu` toolchain detected on 2026-05-14:
  - Node: `v20.20.2`
  - Rust: `rustc 1.75.0`
  - Cargo: `cargo 1.75.0`
  - Solana CLI: `solana-cli 1.18.26`
  - SBF: `solana-cargo-build-sbf 1.18.26`
  - Anchor CLI: `anchor-cli 0.30.1`
- `Cargo.lock`: regenerated from WSL with Cargo `1.75.0`; lockfile version is `3`.
- WSL `npm ci`: passed, but reported `8 vulnerabilities` from the current JS dependency tree.
- WSL `npm run preflight:solana`: passed.
- WSL `npm run build`: passed.
- WSL `anchor idl build -p drip`: passed.
- WSL `anchor build`: passed.
- WSL `anchor test --skip-build`: passed with `29 passing`.
- WSL `npm run test:anchor:full`: passed with `29 passing`.
- `Anchor.toml` sets `[test] startup_wait = 10000` to avoid validator readiness races in WSL.

## Dependency Stabilization

Phase 2.6 fixed lockfile/toolchain drift and Phase 2.7 fixed Anchor IDL generation.

Resolved dependency drift:

- `Cargo.lock` is now version `3`.
- `block-buffer 0.12.0` is no longer present; resolved versions are `0.9.0` and `0.10.4`.
- `toml_datetime 1.1.1+spec-1.1.0` is no longer present; resolved version is `0.6.11`.
- `indexmap 2.14.0` is no longer present; resolved version is `2.7.1`.
- `borsh 1.6.1` is no longer present; resolved versions are `0.9.3`, `0.10.4`, and `1.3.1`.
- `unicode-segmentation 1.13.2` is no longer present; resolved version is `1.10.1`.
- `proc-macro2 1.0.106` is present and now works because the local `anchor-syn 0.30.1` patch removes Anchor's unstable `Span::source_file()` usage.
- `rayon-core` is pinned to `1.12.1` because `1.13.0` requires Rust `1.80`.

## Anchor IDL Fix

Root cause:

- Anchor `0.30.1` IDL build uses `anchor-syn 0.30.1`.
- `anchor-syn` attempted to derive the program source path with `proc_macro2::Span::call_site().source_file().path()`.
- Anchor's IDL builder sets `RUSTFLAGS=--cfg procmacro2_semver_exempt`, which pushes `proc-macro2` through an unstable `proc_macro::SourceFile` path on stable Rust.
- Result: SBF build completed, but IDL generation failed before tests could run.

Fix:

- `anchor-syn 0.30.1` is vendored at `vendor/anchor-syn-0.30.1`.
- Root `Cargo.toml` uses `[patch.crates-io]` to point `anchor-syn` to the local patch.
- The patch uses Anchor's stable `ANCHOR_IDL_BUILD_PROGRAM_PATH` environment variable and `src/lib.rs` instead of `proc_macro2::Span::source_file()`.
- No IDL artifacts are faked or checked in to bypass validation.

Validation after fix:

- `anchor idl build -p drip`: passed.
- `anchor build`: passed.
- `anchor test --skip-build`: passed with `29 passing`.
- `npm run test:anchor:full`: passed with `29 passing`.

Remaining caution:

- The vendor patch is intentionally narrow, but it is still a local patch to Anchor's macro stack.
- Revisit and remove it when the project intentionally upgrades Anchor beyond `0.30.1`.
- Current tests now run, so closing `TEST_GAPS.md` is unblocked.

## Failure Policy

- If `npm run preflight:solana` fails, do not treat Anchor test results as valid.
- If `npm run build` fails, do not deploy the frontend.
- If `npm run test:anchor:full` fails or cannot run, do not deploy the program to mainnet.
- If `Cargo.lock` is rewritten by a newer desktop Cargo and bumps to lockfile version `4`, treat validation as blocked until it is restored to an SBF-compatible lock.

## Regression Tests Added In Phase 2 And 3A

The suite includes the Phase 1 bug regression:

- `resume after expiration while paused does not brick cancellation`

Phase 3A added critical money-path tests:

- `rejects unauthorized payer actions`
- `rejects withdraw with a mismatched escrow PDA`
- `withdraws repeatedly without exceeding unlocked amount`
- `multiple pause resume cycles only count active time`
- `cancel after partial withdrawal pays only remaining unlocked funds`
- `rejects cancel with a mismatched receiver account`
- `max budget reached then cancel refunds unused deposit`
- `tiny one-lamport stream withdraws only integer lamports`
- `huge flow rate saturates at deposit instead of overflowing`

## Recommended CI Shape

1. Install Node and run `npm ci`.
2. Install Rust `1.75.0`, Solana CLI/SBF tools `1.18.26`, and Anchor `0.30.1`.
3. Run `npm run preflight:solana`.
4. Run `npm run build`.
5. Run `npm run test:anchor:full`.
6. Upload logs for build, SBF build, local validator, and test output.
