#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
DB_NAME="archive"
DB_USER="${USER}"

echo "==> Archive setup"
echo "    Project: $ROOT"
echo "    DB user: $DB_USER"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Install PostgreSQL first."
  exit 1
fi

if ! psql -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  echo "==> Creating database: $DB_NAME"
  createdb "$DB_NAME" 2>/dev/null || psql -h localhost -d postgres -c "CREATE DATABASE $DB_NAME;"
else
  echo "==> Database already exists: $DB_NAME"
fi

echo "==> Enabling pgvector extension"
psql -h localhost -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"

if [ ! -f "$BACKEND/.env" ]; then
  echo "==> Writing backend/.env"
  cat > "$BACKEND/.env" <<EOF
DATABASE_URL=postgresql+psycopg2://${DB_USER}@localhost:5432/${DB_NAME}
USE_OPENAI=false
HOST=127.0.0.1
PORT=8000
EOF
else
  echo "==> backend/.env already exists (not overwritten)"
fi

echo "==> Installing Python dependencies"
pip3 install -r "$BACKEND/requirements.txt"

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. cd $BACKEND && python3 main.py"
echo "  2. Load extension from $ROOT/extension in chrome://extensions/"
