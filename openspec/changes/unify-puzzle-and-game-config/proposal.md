# Proposal — unify-puzzle-and-game-config

## Why

Change 1 collapsed `LifePuzzle`, `PreciseCharacterPuzzle`, `AbsoluteCommandPuzzle`, `AbsoluteCommandPuzzleVersion` into the generic `Puzzle + PuzzleVersion.content` substrate, and introduced `GameRuleSetVersion`, `GameDifficulty`, `GameContentPolicy`, `GameChallengePolicy` as the new versioned configuration tables. Seeds populate these but **the admin UI still has no editor** for them — the legacy admin pages (`ac-maze-editor.tsx`, `ac-puzzle-edit.tsx`, `ac-puzzle-list.tsx`, the Life/PCB editors, the difficulty levels JSON on `Game`) all reference removed Prisma types and cannot compile.

This change builds the admin-side editor surface so operators can:

- Manage `Game` catalog entries (publish/archive, edit metadata, sort order).
- Create new `GameRuleSetVersion` (DRAFT → VALIDATING → VALID → ACTIVE), and activate one.
- Create `GameDifficulty` versions with config JSON, validate them against the engine, activate one per `(gameId, key)`.
- Create `GameContentPolicy` and `GameChallengePolicy` revisions, activate one per `(gameId, difficultyId, mode)`.
- Create / edit / publish `Puzzle` + `PuzzleVersion` rows with engine-specific content editors (Life region builder, PCB board designer, 3D maze editor) saving into `PuzzleVersion.content` JSON.
- Schedule curated puzzles via `PuzzleSchedule` (daily/weekly/monthly).
- Manage `PuzzleTag` taxonomy and tag bindings.
- Upload `PuzzleAsset` files (images / audio) and bind them to puzzle versions.

Once this change lands, all four games can be fully managed through the admin SPA without raw DB edits.

## What Changes

- **BREAKING** Delete the legacy admin route files under `apps/admin/src/app/routes/`: `ac-maze-editor.tsx`, `ac-puzzle-edit.tsx`, `ac-puzzle-list.tsx`, plus any life/PCB-specific editors that talk to removed Prisma types.
- **BREAKING** Replace `admin-games.controller.ts` + `admin-games.service.ts` with a CRUD-style controller backed by the new versioned tables. Operations now mutate `GameRuleSetVersion`, `GameDifficulty`, `GameContentPolicy`, `GameChallengePolicy` rather than `Game.difficultyLevels` JSON.
- **BREAKING** Add `admin-puzzles.controller.ts` + `admin-puzzles.service.ts` exposing the generic `Puzzle` + `PuzzleVersion` CRUD endpoints. Each endpoint accepts an `engineKey` and validates the content JSON via the engine's content-schema (Zod schema living in `packages/shared/src/games/<slug>/content-schema.ts`).
- **BREAKING** Add `admin-puzzle-versions.controller.ts` for the version lifecycle: create DRAFT, run validate (calls engine), set PUBLISHED (only one per puzzle via `uq_published_puzzle_version`), archive.
- Add `admin-puzzle-schedules.controller.ts`, `admin-puzzle-tags.controller.ts`, `admin-puzzle-assets.controller.ts`.
- Add a new `apps/admin/src/features/catalog/` directory hosting React Query + components for the game catalog (`GameList`, `GameDetail`, `RuleSetVersionDialog`, `DifficultyEditor`, `ContentPolicyEditor`, `ChallengePolicyEditor`).
- Add `apps/admin/src/features/puzzles/` directory hosting `PuzzleList`, `PuzzleDetail`, `PuzzleVersionDiff`, `PuzzleVersionEditor`. Editor delegates to a per-engine `PuzzleContentEditor` component (`SlidingPuzzleContentEditor` is trivial since GENERATED; `LifeGameContentEditor`, `PCBContentEditor`, `AbsoluteCommandContentEditor` are real editors).
- Move existing `apps/admin/src/components/game/AbsoluteCommandMaze3D.tsx` into `apps/admin/src/features/puzzles/absolute-command/` and refactor so it reads/writes the `PuzzleVersion.content` shape.
- Add `apps/admin/src/features/puzzles/<game>/<game>-content-editor.tsx` for each curated game; sliding-puzzle gets a placeholder explaining "this game is GENERATED — no puzzle editor".
- Add per-engine `validateContent(content)` exports in `@brain-games/game-engine/<game>/index.ts` returning `{ valid, errors? }`. Used by both the admin UI (preflight) and the API `admin-puzzle-versions.validate()` endpoint.
- Add zod schemas in `@brain-games/shared/src/games/<game>/content-schema.ts` to type the `PuzzleVersion.content` JSON for each game. The runtime `GameRuntimeAdapter.startAttempt` (Change 3) will use the same schema to parse on read.
- Update `apps/admin/src/app/router.tsx` with new routes: `/catalog`, `/catalog/$gameSlug`, `/catalog/$gameSlug/rule-sets`, `/catalog/$gameSlug/difficulties`, `/catalog/$gameSlug/policies`, `/puzzles`, `/puzzles/$puzzleId`, `/puzzles/$puzzleId/versions/$versionId/edit`, `/puzzles/$puzzleId/schedule`, `/puzzle-tags`.
- Update `Permission` catalog (Change 2's `permissions.ts`) IF new permission keys are needed (e.g. `game-config:activate-ruleset`); seed migration via `seed/permissions.ts` upsert is idempotent so adding keys is safe.

## Capabilities

### New Capabilities

- `puzzle-catalog`: Generic puzzle management surface (Puzzle/PuzzleVersion/PuzzleSchedule/PuzzleTag/PuzzleAsset) plus per-engine content editors.

### Modified Capabilities

- `games-catalog`: Game management endpoints now mutate versioned tables (`GameRuleSetVersion` / `GameDifficulty` / `GameContentPolicy` / `GameChallengePolicy`); legacy `Game.difficultyLevels` JSON path REMOVED.

## Impact

- `apps/api/src/admin/admin-games.{controller,service}.ts` (rewrite).
- `apps/api/src/admin/admin-puzzles.{controller,service}.ts` (new).
- `apps/api/src/admin/admin-puzzle-versions.{controller,service}.ts` (new).
- `apps/api/src/admin/admin-puzzle-schedules.{controller,service}.ts` (new).
- `apps/api/src/admin/admin-puzzle-tags.{controller,service}.ts` (new).
- `apps/api/src/admin/admin-puzzle-assets.{controller,service}.ts` (new — local file upload only; object-storage deferred).
- `apps/api/src/admin/admin.module.ts` (register new controllers).
- `packages/shared/src/games/<game>/content-schema.ts` (new, 4 files).
- `packages/game-engine/src/<game>/content-validator.ts` (new, 4 files) exporting `validateContent(content)`.
- `apps/admin/src/features/catalog/*` (new).
- `apps/admin/src/features/puzzles/*` (new).
- `apps/admin/src/components/game/AbsoluteCommandMaze3D.tsx` → moved to `features/puzzles/absolute-command/` and refactored.
- `apps/admin/src/app/router.tsx` and route files (delete old, add new).
- `apps/admin/src/app/routes/games.tsx` and `game-detail.tsx`: rewrite to call the new versioned endpoints.
- `apps/admin/src/app/routes/puzzles.tsx`: rewrite to call generic Puzzle endpoints.
- `docs/Overview-Game-Catalog.md` (new).

**Out of scope**: leaderboard pipeline (Change 5), workers (Change 6), runtime engine adaptations (Change 7 wires `verifySubmission` for mid-game submissions which use the same `content` JSON), object-storage backend for `PuzzleAsset` (deferred).
