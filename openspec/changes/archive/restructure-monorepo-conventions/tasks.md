## 1. Move game-modules into games

- [x] 1.1 `git mv apps/api/src/game-modules/sliding-puzzle apps/api/src/games/sliding-puzzle`
- [x] 1.2 `git mv apps/api/src/game-modules/life-game apps/api/src/games/life-game`
- [x] 1.3 `git mv apps/api/src/game-modules/precise-character-building apps/api/src/games/precise-character-building`
- [x] 1.4 Remove the now-empty `apps/api/src/game-modules/` directory
- [x] 1.5 Inside the moved files, replace `from '../../games/game-adapter.interface'` with `from '../game-adapter.interface'` (now sibling)
- [x] 1.6 In `apps/api/src/games/games.service.ts`, replace `from '../game-modules/<slug>/...'` with `from './<slug>/...'`
- [x] 1.7 In `apps/api/src/app.module.ts`, replace each `from './game-modules/<slug>/...'` with `from './games/<slug>/...'`
- [x] 1.8 `grep_search` for any remaining `game-modules` reference in `apps/api/**`; resolve all hits
- [x] 1.9 Verify `cd apps/api && npx tsc --noEmit` is clean

## 2. Rename src/prisma → src/database

- [x] 2.1 `git mv apps/api/src/prisma apps/api/src/database`
- [x] 2.2 `grep_search` for `from '.*prisma/prisma\.(service|module)'` under `apps/api/src/**` and replace each with the corresponding `database/` path; ensure relative depth stays correct
- [x] 2.3 Specifically check `apps/api/src/games/games.module.ts`, `apps/api/src/attempts/attempts.module.ts`, `apps/api/src/leaderboards/leaderboards.module.ts`, `apps/api/src/auth/*.ts`, `apps/api/src/users/*.ts`, `apps/api/src/games/<slug>/*.ts`
- [x] 2.4 Confirm `apps/api/prisma/` (Prisma CLI directory) is **untouched**; `prisma:migrate` and `prisma:seed` scripts still resolve their schema correctly
- [x] 2.5 Verify `cd apps/api && npx tsc --noEmit` is clean

## 3. Route root scripts through turbo

- [x] 3.1 In root `package.json`, replace:
  - `"dev": "pnpm -r --parallel dev"` → `"dev": "turbo run dev"`
  - `"build": "pnpm -r build"` → `"build": "turbo run build"`
  - `"test": "pnpm -r test"` → `"test": "turbo run test"`
  - `"lint": "pnpm -r lint"` → `"lint": "turbo run lint"`
- [x] 3.2 Leave `db:migrate`, `db:seed`, `db:studio` unchanged (they target a single package via `pnpm --filter`)
- [x] 3.3 Add `turbo` to the root `devDependencies` if it is not already declared at the root (check `pnpm list turbo` from the repo root) *(was missing; installed `turbo@^2.9.14`)*

## 4. Tighten turbo.json with explicit inputs

- [x] 4.1 Update `turbo.json` `build` task to declare `inputs`: `["src/**", "tsconfig*.json", "package.json", "vite.config.ts", "nest-cli.json", "prisma/schema.prisma", "prisma/migrations/**", "prisma/seed.ts", "prisma/seed/**"]`
- [x] 4.2 Update `test` task: `dependsOn: ["^build"]` (was `["build"]`) and `inputs: ["src/**", "tsconfig*.json", "package.json", "jest.config.ts", "vitest.config.ts"]`
- [x] 4.3 Add `inputs: ["src/**", ".eslintrc*", "eslint.config.*"]` to `lint` task
- [x] 4.4 Keep `dev` as `{ persistent: true, cache: false }`
- [x] 4.5 Keep the `$schema` reference at the top so editors validate the file

## 5. Verification

- [x] 5.1 `pnpm --filter @brain-games/shared build` succeeds
- [x] 5.2 `cd apps/api && npx tsc --noEmit` succeeds
- [x] 5.3 `cd apps/web && npx tsc --noEmit` succeeds
- [x] 5.4 `pnpm --filter api build` (Nest build) succeeds
- [x] 5.5 `pnpm build` at the repo root succeeds (via turbo) and prints turbo's task summary, confirming routing works *(4/4 successful first run, 4/4 cache hits + `>>> FULL TURBO` on second run, confirming `inputs` work)*
- [x] 5.6 `npx openspec validate restructure-monorepo-conventions --strict` passes
- [x] 5.7 Sanity grep: `grep -R "game-modules" apps/api/src/` returns zero hits; `grep -R "src/prisma" apps/api/src/` returns zero hits
