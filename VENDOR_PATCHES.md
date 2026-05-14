# DRIP Vendor Patches

Date: 2026-05-14

This file tracks local crate patches that are required for validation. Treat every entry here as temporary technical debt, not a product feature.

## anchor-syn 0.30.1

Severity: Important

Status: Active temporary patch

Patched crate:

- `anchor-syn 0.30.1`
- Local path: `vendor/anchor-syn-0.30.1`
- Activated by root `Cargo.toml`:

```toml
[patch.crates-io]
anchor-syn = { path = "vendor/anchor-syn-0.30.1" }
```

## Why This Patch Exists

Anchor CLI/library version is pinned to `0.30.1` for the Solana `1.18.26` toolchain. During Phase 2.7, SBF build succeeded but Anchor IDL generation failed in the host macro build path.

Root cause:

- Anchor IDL build uses `anchor-syn 0.30.1`.
- `anchor-syn` attempted to locate the source file through `proc_macro2::Span::call_site().source_file().path()`.
- Anchor IDL build sets `RUSTFLAGS=--cfg procmacro2_semver_exempt`.
- On the pinned stable Rust toolchain, that path hits unavailable `proc_macro::SourceFile` / `Span::source_file` APIs.

Impact without patch:

- `cargo build-sbf` can complete.
- `anchor idl build -p drip` fails.
- `anchor test` cannot reach the TypeScript money-path tests.

## What Changed

Patched file:

- `vendor/anchor-syn-0.30.1/src/idl/defined.rs`

Behavioral change:

- Replaced the unstable `proc_macro2::Span::source_file()` source-path lookup.
- Uses Anchor's `ANCHOR_IDL_BUILD_PROGRAM_PATH` environment variable and appends `src/lib.rs`.

This does not change the DRIP program logic or IDL contents intentionally. It only makes Anchor `0.30.1` IDL source discovery work on the pinned stable host toolchain.

## How To Verify

Run the official WSL validation path from the Windows repo root:

```powershell
wsl.exe -d DripUbuntu -u root -- bash /mnt/c/Drip/scripts/run-wsl-validation.sh
```

Expected result:

- `npm ci`: pass, with current audit warnings
- `npm run preflight:solana`: pass
- `npm run build`: pass
- `npm run test:anchor:full`: pass
- Anchor test suite: `29 passing`

For a narrower check:

```bash
anchor idl build -p drip
anchor build
anchor test --skip-build
```

## When This Patch Can Be Removed

Remove this vendor patch only when all of the following are true:

1. Anchor is intentionally upgraded or upstream `anchor-syn` no longer requires the unstable source-file lookup.
2. Root `Cargo.toml` no longer needs `[patch.crates-io] anchor-syn`.
3. `Cargo.lock` remains version `3` or the Solana/SBF toolchain is intentionally upgraded to support the new lockfile format.
4. These commands still pass:
   - `npm run preflight:solana`
   - `npm run build`
   - `anchor idl build -p drip`
   - `anchor build`
   - `npm run test:anchor:full`

Do not remove the patch just because SBF build passes. The original failure was specifically in IDL generation.
