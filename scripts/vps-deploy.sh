#!/usr/bin/env bash
# Production-style: build the SPA and run API + static UI on one port.
# For day-to-day “API only” on the VPS, use instead: npm run vps:dev
#
# Usage: chmod +x scripts/vps-deploy.sh && ./scripts/vps-deploy.sh
# Open: http://YOUR_VPS_IP:5000 — allow TCP on API_PORT (5000).

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"

npm run build:web
echo ""
echo "Starting API + web UI (NODE_ENV=$NODE_ENV)."
echo "Set CLIENT_ORIGIN in .env to your public URL (e.g. http://YOUR_IP:5000)."
exec npm start --prefix server
