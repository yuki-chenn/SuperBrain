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

## Known Limitations (MVP)

- No real-time multiplayer
- No anti-bot detection beyond server-side replay validation
- No admin dashboard
- No SSR (pure SPA)
