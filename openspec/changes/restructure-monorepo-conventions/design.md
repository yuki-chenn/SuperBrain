## Context

The project follows the dominant `apps/* + packages/*` Turborepo shape with `pnpm` workspaces, but four internal details deviate from community convention without a corresponding payoff:

- NestJS schematics generate per-feature folders directly under `src/`. The current repo has every feature there (`auth/`, `users/`, `attempts/`, `leaderboards/`, `games/`) **except** the three concrete games, which were carved into a parallel `game-modules/` sibling. The split exists for organizational intent but obscures the obvious "games live in `games/`" mental model.
- `turbo` is wired in `turbo.json` and installed in dependencies, yet root scripts call `pnpm -r`. The team gets the cost of turbo (config, install size) without the upside (topological order, cache, affected detection).
- The `inputs` field on `turbo.json` build task is absent, so cache hashing falls back to "everything in the package", crippling the cache benefit even if scripts are routed through turbo.
- Two folders named `prisma` (one is the Prisma CLI's `schema.prisma` home, the other is a Nest module wrapping `PrismaClient`) recurringly confuses readers — every time someone says "the prisma folder" they have to disambiguate.

## Goals / Non-Goals

**Goals:**
- Land the four community-aligned restructures in one atomic change with zero behavior delta.
- Keep diffs readable (rename + import updates, no class/api renames).
- Verify with `tsc --noEmit` for both `apps/api` and `apps/web`, and `pnpm shared build`.

**Non-Goals:**
- Not renaming `PrismaService` → `DatabaseService`. The class name still accurately describes what it wraps. We're disambiguating directories, not abstractions.
- Not splitting `attempts/` into per-game submodules — the current generic-attempt-controller-plus-game-specific-controller split is intentional and stays.
- Not touching `apps/web/` structure — already idiomatic.
- Not changing `apps/api/prisma/` (the Prisma CLI directory). That's a Prisma convention we don't fight.
- Not adding remote turbo cache (`TURBO_TOKEN`, etc.) — outside scope.

## Decisions

### D1. `game-modules/<slug>/` → `games/<slug>/` (sibling structure inside `games/`)

**Decision:** Move each game's NestJS module folder into `apps/api/src/games/<slug>/`. The total `src/games/` directory then mixes registry-level files (`games.module.ts`, `games.service.ts`, `games.controller.ts`, `game-adapter.interface.ts`, `attempt-timeout.ts`) with three subfolders (`sliding-puzzle/`, `life-game/`, `precise-character-building/`).

**Why:**
- Mirrors how the web side already organizes feature sub-features (`apps/web/src/features/games/<slug>/`). Symmetric mental model across the stack.
- Eliminates the "where do I add a new game?" ambiguity. Answer becomes: copy `games/<existing>/` into `games/<new>/` and register in `games.module.ts`.
- Path depth is preserved (`src/game-modules/<slug>/foo.ts` is also 2 levels deep, so existing relative imports inside each game folder stay byte-identical: `../../prisma/prisma.service` still resolves correctly).

**Alternative considered:** keep `game-modules/` and rename it to `game-implementations/` for clarity. Rejected — still two parallel "games" trees and worse, longer name.

### D2. `apps/api/src/prisma/` → `apps/api/src/database/`

**Decision:** Rename the Nest-side directory only. Do not rename the file inside (`prisma.service.ts` stays), do not rename the class (`PrismaService` stays), and do not touch the Prisma CLI directory at `apps/api/prisma/`.

**Why:**
- The collision is at the directory name level — once you see `src/database/` next to `apps/api/prisma/`, the IDE breadcrumb instantly tells you which is which.
- Renaming the class to `DatabaseService` would touch every injection site (~15+ files) for cosmetic gain. Dropping the class rename keeps the diff small and reversible.
- "database" is a Nest community-standard module name (NestJS docs use both `database/` and `prisma/` interchangeably; we pick the disambiguating one).

**Alternative considered:** rename the *Prisma CLI* directory to something exotic. Rejected — fighting Prisma conventions creates worse surprises.

### D3. Root scripts route through turbo

**Decision:** Replace the `pnpm -r` invocations with `turbo run`. Map:

```
"dev":   "turbo run dev"      // uses turbo.json's persistent + cache:false
"build": "turbo run build"    // honors ^build dep + outputs cache
"test":  "turbo run test"     // honors dependsOn: ["build"]
"lint":  "turbo run lint"
```

The persistent `dev` task is already configured. `pnpm -r --parallel dev` had the side effect of giving each app its own log stream; turbo does the same with prettier output.

**Why:**
- Turbo is already a dependency. Either use it or remove it. Using it is the cheaper path.
- Future opportunities (remote cache, affected detection in CI, `--filter='[origin/main]'`) become trivial after this.

### D4. `turbo.json` gets explicit `inputs` and consistent cache settings

**Decision:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "tsconfig*.json",
        "package.json",
        "vite.config.ts",
        "nest-cli.json",
        "prisma/schema.prisma",
        "prisma/migrations/**",
        "prisma/seed.ts",
        "prisma/seed/**"
      ],
      "outputs": ["dist/**"]
    },
    "dev":  { "persistent": true, "cache": false },
    "test": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "tsconfig*.json",
        "package.json",
        "jest.config.ts",
        "vitest.config.ts"
      ]
    },
    "lint": {
      "inputs": ["src/**", ".eslintrc*", "eslint.config.*"]
    }
  }
}
```

**Why:**
- Globs are intentionally over-inclusive (we list both Vite & Nest config, both Jest & Vitest configs) so a single `turbo.json` works for every package without per-package overrides.
- `test` uses `^build` instead of `build` so a downstream package's tests don't force its own rebuild — they only require its dependencies to be built. Today both forms are equivalent (no inter-app tests), but `^build` future-proofs.
- Lint stays cheap-and-cached because the inputs are small.

**Alternative considered:** per-package `turbo.json` overrides. Rejected — adds files for no current benefit; we can add overrides later when one package actually needs different inputs.

## Risks / Trade-offs

- **[Risk]** Missing an import update somewhere → API won't compile.
  → **Mitigation:** rely on `tsc --noEmit` + `nest build` as the gate. Use `grep_search` for `from '../game-modules/'`, `from '../../game-modules/'`, and similar variants for both renames before committing. The chains are short — fewer than ~20 sites total.
- **[Risk]** Existing OpenSpec capability specs (`openspec/specs/auth/spec.md`, etc.) mention the old paths in "Architecture Notes". They'll go slightly stale.
  → **Mitigation:** the architecture notes are deliberately coarse ("Service: `LifeGameService`"); they don't lock to file paths. We accept minor drift. Sync can happen in a follow-up if it bothers anyone.
- **[Trade-off]** We don't rename `PrismaService` to `DatabaseService`. Pro: tiny diff; con: someone will still type "PrismaService" in the IDE and find it under `database/`. Acceptable — the directory disambiguation is what was actually painful.
- **[Risk]** `turbo run` output might differ from `pnpm -r --parallel`. In particular, `dev` might silently buffer one app's logs while another is initializing.
  → **Mitigation:** `turbo run dev` honors `persistent: true` and streams concurrently by default; if buffering bites, add `--ui=stream` (turbo ≥ 2.0).
- **[Risk]** `pnpm db:migrate` in root scripts uses `pnpm --filter api ...` — those keep working unchanged because we're only retargeting `dev/build/test/lint`.

## Migration Plan

1. Move `apps/api/src/game-modules/<slug>` → `apps/api/src/games/<slug>` (three folders).
2. Inside each moved file, replace `from '../../games/game-adapter.interface'` → `from '../game-adapter.interface'` (same for any other `../../games/...` import that's now a sibling).
3. In `apps/api/src/app.module.ts`, replace `from './game-modules/<slug>/...'` → `from './games/<slug>/...'`.
4. In `apps/api/src/games/games.service.ts`, replace `from '../game-modules/<slug>/...'` → `from './<slug>/...'`.
5. Move `apps/api/src/prisma/` → `apps/api/src/database/`.
6. Replace `from '.../prisma/prisma.service'` and `from '.../prisma/prisma.module'` → corresponding `database/...` paths across all `apps/api/src/**/*.ts`.
7. Update root `package.json` scripts.
8. Update `turbo.json`.
9. Verify: `pnpm --filter @brain-games/shared build && (cd apps/api && npx tsc --noEmit) && (cd apps/web && npx tsc --noEmit) && pnpm --filter api build`.
10. Smoke `turbo run build` end-to-end.

**Rollback:** `git revert <commit>`. No data layer touched; no migrations to roll back.

## Open Questions

- Do we want to lift the per-package `tsconfig.json` references into root `tsconfig.base.json` paths so editors auto-resolve `@brain-games/*` to source instead of `dist`? That's a separate quality-of-life improvement and not part of this change.
