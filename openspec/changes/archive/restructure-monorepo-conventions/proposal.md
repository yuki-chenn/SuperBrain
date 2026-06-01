## Why

Four small frictions block the project from being a clean Turborepo monorepo:

1. **`game-modules/*` parallel to `games/*`** muddles "where do new games go". Both directories hold game code; nothing in the names tells a new contributor which is "the registry" vs "the implementations".
2. **`turbo.json` exists but root scripts call `pnpm -r`** — turbo is installed and configured but bypassed, so the project gets none of turbo's value (topological build order, remote cache, affected-graph detection).
3. **`turbo.json` has no `inputs` declared** so its build cache key is "every file under each package" — any unrelated change invalidates everything.
4. **`prisma/` exists at both `apps/api/prisma/` (Prisma artifacts) and `apps/api/src/prisma/` (Nest service)** — same name, two meanings, recurring confusion source.

These are pure structural improvements; runtime behavior is unchanged.

## What Changes

- **Rename** `apps/api/src/game-modules/<slug>/` → `apps/api/src/games/<slug>/` and update all imports / `app.module.ts`.
- **Rename** `apps/api/src/prisma/` → `apps/api/src/database/` and update all imports. The Prisma schema/migration directory at `apps/api/prisma/` is left untouched (Prisma CLI requires it).
- **Refactor** root `package.json` scripts to call `turbo run …` instead of `pnpm -r …`.
- **Tighten** `turbo.json` build task with explicit `inputs` so cache keys reflect actual dependencies; add cache configuration for `test` and `lint`.

## Capabilities

### New Capabilities
- `monorepo-conventions`: codifies the directory layout, build-pipeline routing, and module-naming rules every contributor MUST follow. This capability is the place future structural decisions (e.g. "should new shared packages go under `packages/` or `apps/internal/`?") are recorded.

### Modified Capabilities
*(none — no runtime requirement changes; existing capability specs' Architecture Notes will go slightly stale and may be refreshed via `openspec sync-specs` later)*

## Impact

- **Touched (file moves + import updates)**:
  - `apps/api/src/games/{sliding-puzzle,life-game,precise-character-building}/` (new homes)
  - `apps/api/src/database/` (was `apps/api/src/prisma/`)
  - `apps/api/src/app.module.ts` (import paths for game modules + database module)
  - `apps/api/src/games/games.service.ts` (relative paths to adapters)
  - All NestJS files importing `prisma/prisma.service` → `database/prisma.service`
  - `package.json` (root) — script bodies
  - `turbo.json` — task definitions
- **Untouched**:
  - All public API endpoints, request/response shapes, Zod schemas, Prisma schema, migrations, env vars, ports.
  - `apps/web/**`, `packages/**`.
  - Existing OpenSpec capability specs (`openspec/specs/**`) — paths in their architecture notes will be slightly stale until the next sync; that's acceptable because OpenSpec specs deliberately stay coarse-grained.
- **Risk**: low. Failure mode is "API fails to build" — caught immediately by `tsc --noEmit` and `nest build`.
- **Rollback**: trivial git revert, no schema/data migration involved.
