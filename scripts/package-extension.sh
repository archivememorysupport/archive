#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/archive-extension.zip"

rm -f "$OUT"
cd "$ROOT/extension"
zip -r "$OUT" . -x "*.DS_Store"

echo "Created $OUT"
echo "Upload this ZIP to the Chrome Web Store."
