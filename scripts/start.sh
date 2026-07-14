#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"

if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  HEALTH=$(curl -s "http://127.0.0.1:${PORT}/api/health")
  echo "Archive backend is already running on http://127.0.0.1:${PORT}"
  echo "$HEALTH"
  echo ""
  echo "To restart: ./scripts/stop.sh && ./scripts/start.sh"
  exit 0
fi

echo "Starting Archive backend on http://127.0.0.1:${PORT}"
cd "$BACKEND"
exec python3 main.py
