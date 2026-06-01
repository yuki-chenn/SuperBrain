# Tasks — unify-puzzle-and-game-config

## 1. Preparation

- [x] 1.1 Confirm Changes 1/2/3 merged; `pnpm api -- pnpm build` succeeds with `auth/users/admin/common/games/attempts/challenges` enabled, `leaderboards` excluded.
- [x] 1.2 Inventory remaining `admin-*.controller.ts` references to removed Prisma types (especially `admin-games.service.ts`) and capture in commit message.

## 2. Shared — engine content schemas

- [x] 2.1 Create `packages/shared/src/games/sliding-puzzle/content-schema.ts` — minimal (since GENERATED). Exports `SlidingPuzzleContentSchema` describing `{ engine, schemaVersion, size, scrambleMoves }` (admin won't normally edit this).
- [x] 2.2 Create `packages/shared/src/games/life-game/content-schema.ts` — describes `{ engine, schemaVersion, width, height, boundary, initialState, stableState, targetRegionIds, targetAnswers, stableGeneration }`.
- [x] 2.3 Create `packages/shared/src/games/precise-character-building/content-schema.ts` — describes `{ engine, schemaVersion, boardSize, radicalPool, cells, solutionRounds, runtimeConfig }`.
- [x] 2.4 Create `packages/shared/src/games/absolute-command/content-schema.ts` — describes `{ engine, schemaVersion, size, startCoord, cells, optimalCommandCount, difficultyLabel?, season?, episode? }`.
- [x] 2.5 Export all 4 from `packages/shared/src/index.ts`.

## 3. Engine — content validators

- [x] 3.1 Create `packages/game-engine/src/sliding-puzzle/content-validator.ts` exporting `validateContent(content)`.
- [x] 3.2 Same for `life-game`, `precise-character-building`, `absolute-command`.
- [x] 3.3 Each validator imports its sibling `validator.ts` (the runtime checker) where applicable; performs a Zod parse + structural checks specific to authoring (e.g. life-game checks that `targetAnswers` is consistent with `stableState`).
- [x] 3.4 Export from each engine's `index.ts` and re-export from `packages/game-engine/src/index.ts`.

## 4. API — admin-games rewrite

- [x] 4.1 Rewrite `apps/api/src/admin/admin-games.service.ts` to expose:
  - `list(filter)`, `get(id)`, `create(input)`, `update(id, input)`, `publish(id)`, `archive(id)`.
- [x] 4.2 Rewrite `apps/api/src/admin/admin-games.controller.ts` to expose `/api/admin/games[/:id][/publish|/archive]`.
- [x] 4.3 All endpoints decorated with appropriate `@RequirePermission`.

## 5. API — admin-rule-sets, admin-difficulties, admin-policies controllers

- [x] 5.1 Create `apps/api/src/admin/admin-rule-sets.controller.ts` + service: list/create/activate for `GameRuleSetVersion`.
- [x] 5.2 Create `apps/api/src/admin/admin-difficulties.controller.ts` + service: list/create/activate for `GameDifficulty` with version-bump semantics.
- [x] 5.3 Create `apps/api/src/admin/admin-content-policies.controller.ts` + service.
- [x] 5.4 Create `apps/api/src/admin/admin-challenge-policies.controller.ts` + service.
- [x] 5.5 All activate endpoints run inside `prisma.$transaction` and demote prior ACTIVE before promoting target.

## 6. API — admin-puzzles, admin-puzzle-versions

- [x] 6.1 Create `apps/api/src/admin/admin-puzzles.service.ts` + controller with the endpoints from `puzzle-catalog/spec.md`.
- [x] 6.2 Create `apps/api/src/admin/admin-puzzle-versions.service.ts` + controller:
  - Create: compute `contentHash`, validate engineKey matches game's ruleSet engineKey, persist DRAFT.
  - Update: only if `status IN (DRAFT, VALIDATING)`; recompute hash.
  - Validate: invoke `validateContent` from engine, persist `validationStatus + validationReport`.
  - Publish: in txn, ARCHIVE prior PUBLISHED (if any), set target PUBLISHED, update `Puzzle.currentVersionId`.
  - Archive: status='ARCHIVED'.

## 7. API — admin-puzzle-schedules, admin-puzzle-tags, admin-puzzle-assets

- [x] 7.1 Create `apps/api/src/admin/admin-puzzle-schedules.controller.ts` + service with overlap detection.
- [x] 7.2 Create `apps/api/src/admin/admin-puzzle-tags.controller.ts` + service.
- [x] 7.3 Create `apps/api/src/admin/admin-puzzle-assets.controller.ts` + service using local-disk storage under `apps/api/uploads/`; serve with `app.useStaticAssets`.

## 8. API — admin module wiring

- [x] 8.1 Register all new controllers in `apps/api/src/admin/admin.module.ts`.
- [x] 8.2 Run `pnpm api -- pnpm build` — admin module compiles.
- [x] 8.3 Boot API; smoke list endpoints return seeded data (4 games, 4 active rule-sets, 10 active difficulties, etc).

## 9. Admin SPA — features/catalog

- [x] 9.1 Create `apps/admin/src/features/catalog/api/catalog-api.ts` with React Query hooks for all `/api/admin/games`, `/rule-sets`, `/difficulties`, `/policies` endpoints.
- [x] 9.2 Create `apps/admin/src/features/catalog/components/GameList.tsx`, `GameDetail.tsx`.
- [x] 9.3 Create `RuleSetVersionList.tsx`, `RuleSetVersionDialog.tsx` (create + activate).
- [x] 9.4 Create `DifficultyList.tsx`, `DifficultyEditor.tsx` (auto-form from engine difficulty schema).
- [x] 9.5 Create `ContentPolicyEditor.tsx`, `ChallengePolicyEditor.tsx`.

## 10. Admin SPA — features/puzzles

- [x] 10.1 Create `apps/admin/src/features/puzzles/api/puzzle-api.ts`.
- [x] 10.2 Create `PuzzleList.tsx` (filter by game + status + tag).
- [x] 10.3 Create `PuzzleDetail.tsx` showing version history with status badges.
- [x] 10.4 Create `PuzzleVersionEditor.tsx` (shell with Save Draft / Validate / Publish actions).
- [x] 10.5 Create per-engine `PuzzleContentEditor` components:
  - `apps/admin/src/features/puzzles/sliding-puzzle/SlidingPuzzleContentEditor.tsx` — read-only placeholder explaining GENERATED.
  - `apps/admin/src/features/puzzles/life-game/LifeGameContentEditor.tsx` — initial-state board editor + simulate-to-stable preview + target-region picker.
  - `apps/admin/src/features/puzzles/precise-character-building/PCBContentEditor.tsx` — board cell grid (root key per cell) + radical pool picker + solution rounds reviewer.
  - `apps/admin/src/features/puzzles/absolute-command/AbsoluteCommandContentEditor.tsx` — wraps the moved `AbsoluteCommandMaze3D.tsx`.
- [x] 10.6 Move `apps/admin/src/components/game/AbsoluteCommandMaze3D.tsx` to `apps/admin/src/features/puzzles/absolute-command/maze3d/` and refactor props to read/write `PuzzleVersion.content` shape.
- [x] 10.7 Create `PuzzleVersionDiff.tsx` (text-diff of two `content` JSON blobs).
- [x] 10.8 Create `PuzzleScheduleManager.tsx` and `PuzzleTagsManager.tsx`.
- [x] 10.9 Create `PuzzleAssetUploader.tsx` (drag-drop, sha256 client-side, calls multipart endpoint).

## 11. Admin SPA — routes + nav

- [x] 11.1 Delete `apps/admin/src/app/routes/ac-maze-editor.tsx`, `ac-puzzle-edit.tsx`, `ac-puzzle-list.tsx`.
- [x] 11.2 Replace `games.tsx` and `game-detail.tsx` with versions calling the new catalog APIs.
- [x] 11.3 Rewrite `puzzles.tsx` to render `PuzzleList` from the new feature.
- [x] 11.4 Add new routes: `puzzles.$puzzleId.tsx` (PuzzleDetail), `puzzles.$puzzleId.versions.$versionId.edit.tsx` (PuzzleVersionEditor), `puzzle-schedules.tsx`, `puzzle-tags.tsx`.
- [x] 11.5 Update `AdminSidebar.tsx` nav: Games / Catalog / Puzzles / Schedules / Tags / Users / Roles / Audit.

## 12. End-to-end smoke

- [x] 12.1 Admin: create a new Life puzzle DRAFT via the new editor; validate → expect `VALID`; publish → prior PUBLISHED demoted.
- [x] 12.2 Player (Change 3 flow): start a Life RANKED challenge → server picks the new PUBLISHED puzzle version; play to completion.
- [x] 12.3 Admin: create a new GameDifficulty v2 with modified config; activate; verify prior v1 → INACTIVE.
- [x] 12.4 Try to insert a second PUBLISHED PuzzleVersion via raw SQL → expect `uq_published_puzzle_version` violation.
- [x] 12.5 Try to activate two ACTIVE difficulties for the same `(gameId, key)` → expect `uq_active_game_difficulty` violation.

## 13. Documentation

- [x] 13.1 Create `docs/Overview-Game-Catalog.md` covering: catalog model, rule-set / difficulty / policy lifecycle, puzzle/version lifecycle, content schemas, asset storage, scheduling, tags.
- [x] 13.2 Update `docs/Overview-Framework.md` "过渡说明": mark Catalog stream complete.
- [x] 13.3 Add per-game content-shape examples to `Overview-Game-Catalog.md` (life-game JSON, PCB JSON, AC JSON) — will become `rule-define-puzzle-content.md` later.

## 14. Handoff to Change 5 / 6 / 7

- [x] 14.1 Verify per-game adapters (Change 3) now reliably resolve to the published versions written via the admin UI.
- [x] 14.2 Communicate: operators can now manage everything in admin UI; leaderboard config editor will arrive with Change 5; bulk content tools and S3 asset storage deferred.
