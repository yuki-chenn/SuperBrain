# Brain Games Platform

A web-based puzzle game platform inspired by "最强大脑" (Super Brain). Features a sliding puzzle (数字华容道) as the first game, with an extensible architecture for adding more games.

## Tech Stack

- **Frontend**: React 19, Vite, TanStack Router/Query, Zustand, Tailwind CSS v4
- **Backend**: NestJS, Prisma ORM, PostgreSQL, Redis, JWT auth
- **Shared**: TypeScript strict mode, Zod schemas, pnpm workspaces

## Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL and Redis)

## Quick Start

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Services

| Service | URL |
|---------|-----|
| Web (Frontend) | http://localhost:5173 |
| API (Backend) | http://localhost:3000/api |
| Swagger Docs | http://localhost:3000/api/docs |

## Project Structure

```
apps/
  web/          # React SPA frontend
  api/          # NestJS backend API
packages/
  shared/       # Shared Zod schemas, types, constants
  game-engine/  # Reusable game logic (sliding puzzle)
```

## Testing

```bash
pnpm test                    # Run all tests
pnpm --filter @brain-games/game-engine test  # Game engine tests only
```

## Adding a New Game

1. Add game metadata in `apps/api/prisma/seed.ts`
2. Add leaderboard definitions in the seed
3. Implement game engine in `packages/game-engine/src/<game>/`
4. Create a `GameAdapter` in `apps/api/src/games/adapters/<game>.adapter.ts`
5. Create frontend components in `apps/web/src/features/games/<game>/`
6. Register in `apps/web/src/features/games/game-registry.ts`

## Adjusting Game Timeouts

Each game enforces a per-difficulty time budget; exceeding it ends the
attempt with `INVALID/TIMEOUT` server-side and surfaces a "挑战超时" modal
on the client. The attempt is recorded as INVALID for audit but is **not**
counted toward any leaderboard.

The single source of truth for these timeouts lives in the shared package:

| Game | Config file |
|------|-------------|
| Sliding puzzle | `packages/shared/src/games/sliding-puzzle/config.ts` |
| Life game | `packages/shared/src/games/life-game/config.ts` |
| Precise character building | `packages/shared/src/games/precise-character-building/config.ts` |

Edit the `maxDurationMs` field on the difficulty entry you want to change,
then rebuild the shared package so both apps pick up the new value:

```bash
pnpm --filter @brain-games/shared build
```

No database migration is required. The same constant feeds the API
(`getGameMaxDurationMs(slug, difficultyKey)`), the `startAttempt` response,
and the in-game `GameCountdown` HUD on the web client.

## Known Limitations (MVP)

- No real-time multiplayer
- No anti-bot detection beyond server-side replay validation
- No admin dashboard
- No SSR (pure SPA)
