#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/mnt/c/Drip}"
VALIDATION_ROOT="${VALIDATION_ROOT:-/root/drip-validation}"

case "$VALIDATION_ROOT" in
  /root/drip-validation|/root/drip-validation/*|/tmp/drip-validation|/tmp/drip-validation/*) ;;
  *)
    echo "Refusing to clear unexpected validation path: $VALIDATION_ROOT" >&2
    exit 1
    ;;
esac

export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"

rm -rf "$VALIDATION_ROOT"
mkdir -p "$VALIDATION_ROOT"

cd "$REPO_ROOT"
tar \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./target' \
  --exclude='./test-ledger' \
  --exclude='./grant-application/Screenshot and Video' \
  -cf - . | tar -C "$VALIDATION_ROOT" -xf -

cd "$VALIDATION_ROOT"

if [ ! -f "$HOME/.config/solana/id.json" ]; then
  mkdir -p "$HOME/.config/solana"
  solana-keygen new --no-bip39-passphrase --silent --force -o "$HOME/.config/solana/id.json"
fi

npm ci
npm run preflight:solana
npm run build
npm run test:anchor:full
