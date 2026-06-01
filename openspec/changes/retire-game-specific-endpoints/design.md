# Design — retire-game-specific-endpoints

## Context

After Change 6 the platform has unified challenge endpoints (`start/claim/heartbeat/abandon/finish/status`) under `/api/challenges`, but each game still ships its own endpoints for mid-game state transitions:

- `POST /api/life-game/attempts/:id/regions/:regionId/submit`
- `POST /api/precise-character/attempts/:id/rounds/:round/submit`
- `POST /api/absolute-command/attempts/:id/commands`

These violate the "zero-new-endpoints per new game" promise. Change 7 collapses them into one polymorphic endpoint backed by `SubmissionType` enum and `GameRuntimeAdapter.verifySubmission`.

## Goals / Non-Goals

**Goals**
- One mid-game endpoint: `POST /api/challenges/:id/submissions { type, payload, idempotencyKey }`.
- Each adapter implements `verifySubmission` returning structured pass/fail + result.
- Per-game frontends call the unified endpoint; no `/api/<game>/...` endpoints remain.
- Admin attempt-detail viewer reads `GameSubmission` rows generically, with a per-engine renderer plugin for the payload preview (mirror of the puzzle content editor architecture).
- Full `docs/rules/` set written so future game additions follow a clear recipe.
- All "过渡说明" entries removed from `Overview-Framework.md`.

**Non-Goals**
- No new game added.
- No runtime engine optimisations.
- No web SPA visual redesign beyond what's needed to wire the new submission flow.
- No additional admin views beyond the generic submission viewer + payload preview.

## Decisions

### D1 — SubmissionType drives backend dispatch

`POST /api/challenges/:id/submissions { type: SubmissionType, payload, idempotencyKey, playSessionId, roundIndex?, regionId?, seq? }`:

- Service loads attempt, validates ownership + playSession + status PLAYING.
- Service computes `payloadHash = sha256(JSON.stringify(payload))`.
- Service calls `adapter.verifySubmission({attempt, submissionType: type, payload, hints: {roundIndex, regionId, seq}})`.
- Service persists `GameSubmission` row with all fields.
- Service updates `attempt.metricsSummary` per adapter's `result.metricsDelta` (if returned).
- Service optionally writes `AttemptSnapshot` per adapter's `result.snapshot` (if returned).

`SubmissionType` values map to per-game semantics; the enum (defined in Change 1) provides `FINAL, STEP, ROUND, REGION, COMMAND, CHECKPOINT`. Each game adapter exposes which types it accepts; unknown types return HTTP 400.

### D2 — verifySubmission contract

```ts
interface VerifySubmissionInput {
  attempt: GameAttempt;
  ruleSetVersion: GameRuleSetVersion;
  difficulty: GameDifficulty;
  puzzleVersion?: PuzzleVersion;
  submissionType: SubmissionType;
  payload: unknown;
  hints?: { roundIndex?: number; regionId?: string; seq?: number };
}

interface VerifySubmissionResult {
  accepted: boolean;
  reason?: string;                  // rejection reason if !accepted
  result: Record<string, unknown>;  // engine-specific result (e.g. matched chars, alive cells)
  metricsDelta?: Record<string, number>;  // merged into attempt.metricsSummary
  snapshot?: { type: SnapshotType; state: unknown; metadata?: object };
  finalReady?: boolean;             // signals SPA that finish() can now be called
}
```

Adapters do NOT mutate the DB directly; they return a verdict and the service does the writes.

### D3 — Idempotency on submissions

Every `POST /submissions` MUST carry `Idempotency-Key`. Combined with `(attemptId, idempotencyKey)` unique constraint on `GameSubmission`, replays return the original `GameSubmission` row.

### D4 — Per-game submission semantics

- **sliding-puzzle**: no mid-game submissions; only `FINAL` (also accepted via `/finish`). If client posts non-FINAL → 400 `submission-type-not-supported`.
- **life-game**: `REGION` (payload: `{ regionId, predictedAliveCells: [{x,y}] }`). Validator compares against `referenceSolution.targetAnswers[regionId]`. Returns `accepted=true/false, result: { correct, expectedCount, providedCount }`. `metricsDelta: { regionsCorrect: +1 }`. When all targetRegions are submitted correctly, returns `finalReady=true`.
- **precise-character-building**: `ROUND` (payload: `{ roundIndex, radicalKeys[4], cellPath[4] }`). Validator checks against `solutionRounds[roundIndex]`. `metricsDelta: { roundsCompleted: +1, errorCount?: +1 }`. `finalReady=true` when all 9 rounds done.
- **absolute-command**: `COMMAND` (payload: `{ direction, seq }`). Validator advances the simulator state from `attempt.metricsSummary.currentCoord` + map, returns new coord + stop reason. `snapshot: { type: 'CHECKPOINT', state }`. `finalReady=true` when all NUMBER cells visited with required passes.

### D5 — Admin generic submission viewer

`apps/admin/src/features/attempts/AttemptDetail.tsx` (existing) gains a "Submissions" tab that lists `GameSubmission` rows (paginated, filterable by `submissionType`). Each row's payload is rendered by a per-engine `SubmissionPreview` component selected by `attempt.game.slug`. If no preview component is registered, fall back to JSON dump.

### D6 — Frontend submission flow

Per-game React hooks (`useLifeGameSubmitRegion`, etc.) are replaced by a shared `useChallengeSubmission(attemptId)` hook that wraps React Query mutation. The per-game adapter exposes a `buildSubmissionPayload(localState, intent)` helper so the hook does not need to know game-specific shapes.

### D7 — Engine packages stay clean

The four engines under `packages/game-engine/src/<game>/` already export their validators. No additional code is needed there for Change 7; the adapter classes in `apps/api/src/games/<game>/` reuse the existing validators.

### D8 — rule-*.md authoring guidelines

The `docs/rules/` files are written as prompts/recipes for either a human or an LLM-assisted contributor. Each rule file:

- Lists the files to add/modify.
- Provides templated snippets (Prisma model, Nest adapter class, React adapter, content schema).
- Describes the "definition of done" (acceptance criteria, smoke test).
- Cross-references the relevant `Overview-*.md`.

The 8 rule files cover the complete add-a-game path. Their order in `rule-add-new-game.md` is the recipe order.

## Risks / Trade-offs

- **[Risk]** Frontend regression: a game-specific endpoint removal could break a forgotten UI screen. → **Mitigation**: grep for legacy endpoint paths; CI test on each route after removal.
- **[Risk]** Admin generic viewer cannot show the rich domain payload (3D maze etc.) without a preview plugin. → **Accepted**: the JSON fallback covers correctness; rich preview adapters can ship as follow-ups.
- **[Trade-off]** Polymorphic endpoint requires runtime type-narrowing. → **Accepted**; `SubmissionType` enum + Zod discriminated union covers this.
- **[Trade-off]** All games now share the same Idempotency-Key requirements; PRACTICE mode generates one client-side. → **Accepted**.

## Migration Plan

1. Implement `SubmissionsController` + `SubmissionsService` under `apps/api/src/challenges/`.
2. Implement `verifySubmission` per adapter; reuse existing validators from `packages/game-engine`.
3. Update `apps/admin/src/features/attempts/AttemptDetail.tsx` to add Submissions tab.
4. Update per-game frontend stores/hooks/components to call unified endpoint via `useChallengeSubmission`.
5. Delete legacy controllers + services.
6. Update shared schemas: remove game-specific request/response schemas; keep submission payload schemas.
7. Smoke each game end-to-end.
8. Author `docs/rules/*` files.
9. Update `docs/Overview-Framework.md` to drop transition banner; add `docs/Overview-Frontend.md`.

**Rollback**: revert commits.

**Verification gate**:
- Each of the 4 games is end-to-end playable through `/api/challenges/*` only; no requests hit `/api/life-game/*`, `/api/precise-character/*`, `/api/absolute-command/*` (verified via access log).
- Posting a duplicate submission with the same `Idempotency-Key` returns the original `GameSubmission`.
- Admin Submissions tab lists rows correctly for a completed attempt.
- Following `rule-add-new-game.md` step-by-step produces a runnable stub game (proves the recipe).

## Open Questions

1. Should the SPA still call `/finish` separately or auto-trigger when `finalReady=true` on a submission response? **Adopted**: `finalReady=true` returned by a submission triggers the SPA to enable a "Finish" button; finish remains an explicit call.
2. Should sliding-puzzle accept STEP submissions for move-by-move replay capture? **Deferred**; can be enabled by changing `OperationLogMode` policy and wiring move events into `AttemptOperationLog`.
3. Should the admin Submissions tab support replaying submissions for debugging? **Deferred**; a future change adds a "replay" mode.
