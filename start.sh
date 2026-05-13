#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

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
pnpm --filter api exec prisma migrate deploy

echo "==> Building workspace packages..."
pnpm --filter @brain-games/shared build
pnpm --filter @brain-games/game-engine build

echo ""
echo "==> All services are up. Starting dev server..."
echo "    API  → http://localhost:3000"
echo "    Web  → http://localhost:5173"
echo ""
pnpm dev
