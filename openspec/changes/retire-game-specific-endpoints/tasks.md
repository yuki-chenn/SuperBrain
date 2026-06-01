# Tasks — retire-game-specific-endpoints

## 1. Preparation

- [x] 1.1 Confirm Changes 1–6 merged; full backend builds; all current games end-to-end playable through `/api/challenges/*` (start+finish) and game-specific endpoints (mid-game).
- [x] 1.2 grep the codebase for legacy endpoint paths: `/life-game/`, `/precise-character/`, `/absolute-command/` → list files to delete or modify.

## 2. Backend — SubmissionsController + Service

- [x] 2.1 Create `apps/api/src/challenges/submissions.controller.ts` exposing `POST /api/challenges/:attemptId/submissions`.
- [x] 2.2 Create `apps/api/src/challenges/submissions.service.ts` with `submit({userId, attemptId, type, payload, idempotencyKey, playSessionId, hints})`.
- [x] 2.3 Validate ownership / playSession / status / non-empty idempotencyKey.
- [x] 2.4 Compute `payloadHash = sha256(JSON.stringify(payload))`; idempotency check via `(attemptId, idempotencyKey)`.
- [x] 2.5 Call adapter's `verifySubmission`; persist `GameSubmission` row with `validationPassed`, `validationResult`, `errorReason`.
- [x] 2.6 Merge `metricsDelta` into `attempt.metricsSummary`; write `AttemptSnapshot` if returned.
- [x] 2.7 Return `SubmitChallengeResponse { accepted, submission, finalReady? }`.
- [x] 2.8 Decorate with `@RequireIdempotency()` (from Change 6).

## 3. Adapters — verifySubmission

- [x] 3.1 `apps/api/src/games/sliding-puzzle/sliding-puzzle.adapter.ts`: `verifySubmission(type)` — only accept `FINAL`, otherwise `submission-type-not-supported`.
- [x] 3.2 `apps/api/src/games/life-game/life-game.adapter.ts`: implement REGION verification using `@brain-games/game-engine/life-game` validator.
- [x] 3.3 `apps/api/src/games/precise-character-building/precise-character-building.adapter.ts`: implement ROUND verification.
- [x] 3.4 `apps/api/src/games/absolute-command/absolute-command.adapter.ts`: implement COMMAND verification using simulator; return `snapshot: { type: 'CHECKPOINT', state }` per step.

## 4. Delete legacy controllers/services

- [x] 4.1 Delete `apps/api/src/games/life-game/life-game.controller.ts`, `life-game.service.ts`.
- [x] 4.2 Delete `apps/api/src/games/precise-character-building/precise-character-game.controller.ts`, `*.service.ts`.
- [x] 4.3 Delete `apps/api/src/games/absolute-command/absolute-command.controller.ts`, `*.service.ts`.
- [x] 4.4 Slim each game's `*.module.ts` to only `providers: [<Game>Adapter]` and `imports: [PrismaModule, GamesModule]`.

## 5. Shared schemas cleanup

- [x] 5.1 Edit `packages/shared/src/schemas/life-game.ts` to keep only the submission payload shape (`SubmitLifeRegionPayloadSchema`, `LifeBoardStateSchema`) and remove request/response wrappers tied to the dead endpoints.
- [x] 5.2 Same for `precise-character-building.ts` and `absolute-command.ts`.
- [x] 5.3 Add `SubmitChallengeRequestSchema` and `SubmitChallengeResponseSchema` to `packages/shared/src/schemas/attempts.ts` (or new `submissions.ts`).
- [x] 5.4 Rebuild shared; verify both apps still compile.

## 6. Frontend — per-game store rewrite

- [x] 6.1 Identify per-game stores: `apps/web/src/features/games/life-game/store.ts`, `precise-character-building/store.ts`, `absolute-command/store.ts` (or equivalent location).
- [x] 6.2 Replace per-endpoint hooks (`useSubmitLifeRegion`, etc.) with `useChallengeSubmission(attemptId)` that calls `POST /api/challenges/:id/submissions` and returns React Query mutation state.
- [x] 6.3 Each adapter under `apps/web/src/challenge/adapters/<game>.adapter.ts` adds `buildSubmissionPayload(localState, intent): { type, payload, hints? }`.
- [x] 6.4 Update game components to call `submitSubmission(adapter.buildSubmissionPayload(...))`.
- [x] 6.5 Remove dead helpers (old API client functions, old query keys).

## 7. Admin generic submission viewer

- [x] 7.1 Update `apps/admin/src/features/attempts/AttemptDetail.tsx` to add a "Submissions" tab.
- [x] 7.2 Implement a paginated list filter by `submissionType`.
- [x] 7.3 Create per-engine `SubmissionPreview` components:
  - `apps/admin/src/features/attempts/previews/LifeGameSubmissionPreview.tsx`
  - `apps/admin/src/features/attempts/previews/PCBSubmissionPreview.tsx`
  - `apps/admin/src/features/attempts/previews/AbsoluteCommandSubmissionPreview.tsx`
  - Sliding-puzzle: JSON fallback.
- [x] 7.4 Add `SubmissionPreviewRegistry` that resolves the preview by `game.slug`.

## 8. End-to-end smoke

- [x] 8.1 Life-game: start RANKED attempt → submit each REGION via `/submissions` → finish → score recorded.
- [x] 8.2 PCB: start → submit 9 ROUND payloads → finish.
- [x] 8.3 Absolute-command: start → submit each COMMAND with directional payload → finish.
- [x] 8.4 Verify access log shows zero hits to `/api/life-game/*`, `/api/precise-character/*`, `/api/absolute-command/*` (or the legacy paths are configured to return 404).
- [x] 8.5 Replay a `POST /submissions` with the same `Idempotency-Key` → returns original `GameSubmission` row.
- [x] 8.6 Admin Submissions tab shows 9 ROUND rows for a PCB attempt; payload preview renders correctly.

## 9. Documentation — Overview docs

- [x] 9.1 Create `docs/Overview-Frontend.md`: SPA layout, routes, challenge runtime layer, adapters, query keys, design system pointers.
- [x] 9.2 Update `docs/Overview-Framework.md`: remove the "过渡说明" block (all streams complete); add a "Status: complete" section near the top listing the 7 changes that landed and their archive paths.
- [x] 9.3 Update `docs/Overview-Challenge-Runtime.md`: add the submissions endpoint to the endpoint table; cross-link to `Overview-Game-Catalog.md` and `Overview-Frontend.md`.

## 10. Documentation — Rules

- [x] 10.1 Create `docs/rules/rule-add-new-game.md` — top-level recipe with the file-by-file checklist; cross-links to all other rule files.
- [x] 10.2 Create `docs/rules/rule-define-game-difficulty.md` — Zod schema requirements, version bump rules, ACTIVE row management, seed example.
- [x] 10.3 Create `docs/rules/rule-define-game-policy.md` — GameContentPolicy + GameChallengePolicy fields, mode mapping, activate atomicity.
- [x] 10.4 Create `docs/rules/rule-implement-game-engine.md` — package layout under `packages/game-engine/src/<game>/`, required exports (`generate`, `simulate`, `validate`, `validateContent`), test conventions.
- [x] 10.5 Create `docs/rules/rule-implement-runtime-adapter.md` — `GameRuntimeAdapter` interface, `startAttempt`, `finishAttempt`, `verifySubmission` semantics, registration in module.
- [x] 10.6 Create `docs/rules/rule-define-puzzle-content.md` — content JSON shape, schemaVersion, contentHash, sample for each engine.
- [x] 10.7 Create `docs/rules/rule-define-leaderboard.md` — LeaderboardDefinition fields, rankMetric + tieBreakers shape, period lifecycle.
- [x] 10.8 Create `docs/rules/rule-write-prisma-migration.md` — when adding net-new tables (rare after greenfield), Prisma + partial-index pattern, NULLS NOT DISTINCT usage, raw SQL handling.

## 11. Final verification

- [x] 11.1 `pnpm api -- pnpm build && pnpm --filter web build && pnpm --filter admin build` all pass.
- [x] 11.2 Confirm `apps/api/tsconfig.json` has NO `exclude` entries beyond `node_modules` and `dist`.
- [x] 11.3 Run the full smoke from Change 6's verification gate plus the additional submission smokes here.
- [x] 11.4 Walk through `rule-add-new-game.md` with a stub new game (e.g. "tic-tac-toe") to prove the recipe; either fully implement and discard, or document gaps found.

## 12. Project completion

- [x] 12.1 Archive Changes 1–7 in OpenSpec (`openspec archive ...` for each in dependency order).
- [x] 12.2 Tag the repo with a `v0.2.0-refactor-complete` (or appropriate) version.
- [x] 12.3 Announce completion to the team with the updated `Overview-*` doc set as the entry point.
