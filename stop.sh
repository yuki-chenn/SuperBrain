#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "==> Stopping dev servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "    Killed API server (port 3000)" || echo "    API server not running"
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "    Killed Web server (port 5173)" || echo "    Web server not running"

echo "==> Stopping Docker containers..."
docker compose down

echo "==> All stopped."
