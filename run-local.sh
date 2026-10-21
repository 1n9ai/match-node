#!/usr/bin/env bash
# Run match on this machine without Docker.
# Needs: Python 3.11+ and Node.js 20+. A Qdrant is needed for documents (use --start-qdrant if Docker is installed,
# or set QDRANT_URL to one you already run).
#   ./run-local.sh                 # http://127.0.0.1:8081
#   ./run-local.sh --start-qdrant  # also start Qdrant in Docker on 127.0.0.1:6336
#   ./run-local.sh --rebuild       # rebuild the web pages after changing frontend/
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8081}"
QDRANT_URL="${QDRANT_URL:-http://127.0.0.1:6336}"
START_QDRANT=0; REBUILD=0
for a in "$@"; do
  case "$a" in
    --start-qdrant) START_QDRANT=1 ;;
    --rebuild) REBUILD=1 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Fill in LICENSE_KEY / NODE_PASSWORD there, or set things up in the browser."
fi
[ -d .venv ] || python3 -m venv .venv
.venv/bin/python -m pip install -q --disable-pip-version-check -r requirements.txt

if [ "$REBUILD" = 1 ] || [ ! -d frontend/out ]; then
  (cd frontend && npm ci --no-audit --no-fund && npm run build)
fi

if [ "$START_QDRANT" = 1 ]; then
  if docker ps -a --format '{{.Names}}' | grep -qx 'match-qdrant'; then docker start match-qdrant >/dev/null
  else docker run -d --name match-qdrant -p 127.0.0.1:6336:6333 -v match-qdrant-data:/qdrant/storage qdrant/qdrant:v1.19.2 >/dev/null; fi
fi

export NODE_DATA_DIR="$PWD/data" NODE_FRONTEND_DIR="$PWD/frontend/out" QDRANT_URL
echo "match: http://127.0.0.1:$PORT   (data: $NODE_DATA_DIR)"
exec .venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port "$PORT"
