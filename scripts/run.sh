#!/usr/bin/env bash
# Start the Talent Matcher (API + web UI) as a single process.
#   PORT=8765 HOST=127.0.0.1 scripts/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8765}"
HOST="${HOST:-127.0.0.1}"
if [ ! -f data/profiles.parquet ]; then
  echo "data/profiles.parquet is missing — see README (Data)." >&2
  exit 1
fi
if [ ! -f web/dist/index.html ]; then
  (cd web && npm ci && npm run build)
fi
exec uv run uvicorn matcher.main:app --host "$HOST" --port "$PORT" --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 30
