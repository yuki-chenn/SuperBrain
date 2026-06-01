#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# ── Optional destructive reset ───────────────────────────────────────────
# Set RESET_DB=1 to drop the local Postgres schema and reseed from scratch.
# CI / non-interactive: also set OPSX_DB_RESET_CONFIRM=1 to skip the prompt.
if [ "${RESET_DB:-}" = "1" ]; then
  echo ""
  echo "############################################################"
  echo "# WARNING: about to RESET the local PostgreSQL database.    #"
  echo "# All rows in apps/api/prisma will be dropped and reseeded. #"
  echo "############################################################"
  if [ "${OPSX_DB_RESET_CONFIRM:-}" != "1" ]; then
    read -r -p "Type RESET to confirm: " __confirm
    if [ "${__confirm}" != "RESET" ]; then
      echo "Aborted."; exit 1
    fi
  else
    echo "    OPSX_DB_RESET_CONFIRM=1 set, proceeding non-interactively."
  fi
fi

echo "==> Starting Docker containers..."
docker compose up -d

echo "==> Waiting for PostgreSQL to be ready..."
until docker exec brain-games-postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo "    PostgreSQL is ready."

echo "==> Waiting for Redis to be ready..."
until docker exec brain-games-redis redis-cli ping > /dev/null 2>&1; do
  sleep 1
done
echo "    Redis is ready."

echo "==> Running pending migrations..."
if [ "${RESET_DB:-}" = "1" ]; then
  pnpm --filter api exec prisma migrate reset --force --skip-seed
  pnpm --filter api exec prisma migrate deploy
  pnpm --filter api exec prisma db seed
else
  pnpm --filter api exec prisma migrate deploy
fi

echo "==> Building workspace packages..."
pnpm --filter @brain-games/shared build
pnpm --filter @brain-games/game-engine build

echo ""
echo "==> All services are up. Starting dev server..."
echo "    API  → http://localhost:3000"
echo "    Web  → http://localhost:5173"
echo ""
pnpm dev
