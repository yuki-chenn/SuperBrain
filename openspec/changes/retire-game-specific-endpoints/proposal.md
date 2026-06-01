# Proposal — retire-game-specific-endpoints

## Why

The redesign promised: any new game ships with no schema edits AND no bespoke HTTP endpoints — just a `GameRuntimeAdapter` (server) + a SPA adapter + content schema. Change 3 set up the unified challenge endpoints but left game-specific endpoints behind for mid-game submissions (life region submit, PCB round submit, AC command submit). Change 7 closes the loop: every mid-game interaction goes through one unified endpoint `POST /api/challenges/:id/submissions { type, payload }`.

In addition, this change:

- Implements `GameRuntimeAdapter.verifySubmission` for all 4 game adapters (was stubbed `not_implemented` since Change 3).
- Removes the legacy `LifeGameModule`, `PreciseCharacterGameModule`, `AbsoluteCommandModule` HTTP surfaces — they keep only their adapter classes (which register into the registry).
- Refactors the per-game frontend stores (`apps/web/src/features/games/<game>/store.ts` and friends) to call the unified `POST /api/challenges/:id/submissions` instead of their custom endpoints.
- Polishes documentation: writes the per-engine `rule-*.md` onboarding files so a future LLM (or new engineer) can ship a new game without touching any of the platform code.
- Replaces the remaining legacy admin attempt-detail viewer (if any) with one that reads `GameSubmission` rows generically.

After Change 7 the platform is shape-stable: adding a 5th game is purely additive — new engine package, new content schema, new server adapter, new client adapter, new admin content editor.

## What Changes

- Add `POST /api/challenges/:id/submissions` endpoint (`SubmissionsController` + `SubmissionsService`) that:
  1. Loads `GameAttempt`, validates `playSessionId`, status `PLAYING`.
  2. Calls `adapter.verifySubmission({ attempt, submissionType, payload })`.
  3. Persists a `GameSubmission` row with `submissionType`, `payload`, `payloadHash`, `validationPassed`, `validationResult`, `idempotencyKey`.
  4. If validation passed AND submissionType requires a state update (e.g. life REGION submitted correctly), updates `GameAttempt.metricsSummary` and writes a checkpoint snapshot via `AttemptSnapshot`.
  5. Returns `SubmitChallengeResponse { accepted: boolean, submission: { id, validationPassed, result, errorReason? } }`.
- Implement `GameRuntimeAdapter.verifySubmission` per game:
  - `sliding-puzzle`: SubmissionType `FINAL` only — delegates to existing `validator`.
  - `life-game`: SubmissionType `REGION` — validates the user's predicted alive cells for a region against `referenceSolution.targetAnswers`. `FINAL` aggregates regions.
  - `precise-character-building`: SubmissionType `ROUND` — validates a 4-radical + 4-cell selection against `solutionRounds[roundIndex]`. `FINAL` aggregates.
  - `absolute-command`: SubmissionType `COMMAND` — applies the absolute-direction simulator step; `FINAL` checks all required passes completed.
- Delete legacy controllers: `apps/api/src/games/life-game/life-game.controller.ts`, `apps/api/src/games/life-game/life-game.service.ts`, `apps/api/src/games/precise-character-building/*.controller.ts`, `apps/api/src/games/absolute-command/absolute-command.controller.ts`, and any DTO/service files specific to those endpoints.
- Each game module retains only its adapter class and registration; no controllers/services unless the adapter needs a helper service.
- Update `apps/api/src/admin/admin-attempts.controller.ts` to render `GameSubmission` rows generically (filter by `submissionType`).
- Update web frontend stores:
  - `apps/web/src/features/games/life-game/store.ts` → calls `submissions` endpoint with `type='REGION'`, drops the LifeGame-specific API hooks.
  - Same for `precise-character-building` and `absolute-command`.
- Update web `apps/web/src/challenge/adapters/<game>.adapter.ts` to expose a `submitSubmission(type, payload)` helper that calls the unified endpoint.
- Update `@brain-games/shared/src/schemas/<game>.ts` files to export only the submission payload shapes; remove endpoint-specific request/response schemas.
- Write the `docs/rules/` set (one file per concept) so a 5th game can be added by following recipes:
  - `rule-add-new-game.md` (top-level checklist)
  - `rule-define-game-difficulty.md`
  - `rule-define-game-policy.md`
  - `rule-implement-game-engine.md`
  - `rule-implement-runtime-adapter.md`
  - `rule-define-puzzle-content.md`
  - `rule-define-leaderboard.md`
  - `rule-write-prisma-migration.md`
- Update `docs/Overview-Framework.md` to remove all "过渡说明" entries (every stream is now complete).
- Update `docs/Overview-Frontend.md` (new file) to describe the SPA architecture: routes, runtime gateway, adapters, query keys.

## Capabilities

### New Capabilities

- `submissions`: Unified mid-game submission endpoint + adapter verify contract + admin generic submission viewer.

### Modified Capabilities

- `challenges`: `FinishChallengeResponse` may now reference aggregated `GameSubmission` rows; `finish` may require certain submission counts before allowing transition (per policy).
- `life-game`, `precise-character-building`, `sliding-puzzle`, `absolute-command`: legacy HTTP surfaces REMOVED; per-game capabilities now describe ONLY the engine contract (which is itself stable since Change 1).

## Impact

- `apps/api/src/challenges/submissions.{controller,service}.ts` (new).
- `apps/api/src/games/<game>/*.adapter.ts` — extend `verifySubmission` implementation.
- `apps/api/src/games/<game>/*.controller.ts`, `*.service.ts` — delete.
- `apps/api/src/games/<game>/<game>.module.ts` — slim to adapter registration.
- `apps/api/src/admin/admin-attempts.controller.ts` — extend to render `GameSubmission`.
- `packages/shared/src/schemas/<game>.ts` — slim to submission payload schemas.
- `apps/web/src/features/games/<game>/store.ts` and related hooks/components — rewrite to call unified endpoint.
- `apps/web/src/challenge/adapters/<game>.adapter.ts` — add `submitSubmission` helper.
- `docs/Overview-Frontend.md` (new).
- `docs/Overview-Framework.md` (cleanup).
- `docs/rules/*` (8 new files).

**Out of scope**: net-new games, runtime engine optimisations, additional admin features beyond the generic submission viewer.
