#!/usr/bin/env bash
# Deploy this folder to the Beelink and rebuild the containers.
# Data (Postgres + uploaded photos) lives in Docker volumes on the Beelink and is
# untouched by deploys. Schema changes: edit lib/db/src/schema, run
# `pnpm --filter @workspace/db run generate`, commit the new migration — the app
# applies pending migrations on startup.
set -euo pipefail
cd "$(dirname "$0")"
HOST="${1:-beelink}"
echo "==> Deploying to $HOST"
rsync -az --delete --exclude node_modules --exclude .git --exclude .env ./ "$HOST":~/flogg/
ssh "$HOST" 'cd ~/flogg && docker compose up -d --build && sleep 5 && docker compose ps'
echo "==> Live: https://flogg.shelbyklein.com"
