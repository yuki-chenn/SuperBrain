# Proposal — introduce-challenge-runtime-gateway

## Why

Doc 7 prescribes a unified `Challenge Runtime Gateway`: every game's `/play` route must be reachable only via a server-authoritative `attemptId` + `entryToken` flow. Today (after Change 1 + 2) the database supports it (`GameAttempt` + `AttemptRuntimeSession` + `ChallengeAuditLog` + partial unique indexes) but no API or frontend code wires it up. Games modules are still excluded from compilation.

This change builds the canonical challenge lifecycle on top of the new schema and RBAC layer:

- Server-authoritative `POST /api/challenges/start | :id/claim | :id/heartbeat | :id/abandon | :id/finish | :id/status` endpoints.
- The 13-state `AttemptStatus` state machine enforced with **CAS conditional updates** so concurrent requests cannot double-transition.
- `entryTokenHash` + `playSessionId` short-lived ownership tokens scoped per browser tab.
- `GameRuntimeAdapter` server-side interface + a `Registry` that resolves by `engineKey`. Four adapters built (sliding-puzzle, life-game, precise-character-building, absolute-command) but only the `startAttempt` + `finishAttempt` paths; mid-game `verifySubmission` is fleshed out in Change 7.
- Front-end `Challenge Runtime` layer in `apps/web`: `ChallengeNavigationManager`, `ChallengeRouteGuard`, `ChallengeBlocker`, `ChallengeHeartbeat`, `ChallengeBroadcast`, `ChallengeRuntimeStore`.
- New routes `/games/$slug/start`, `/games/$slug/attempts/$attemptId/play|result|expired`. Old `/games/$slug/play` routes redirect to `/start`.
- Each `ChallengeAuditLog` row records every status transition (action + from/to + reason + requestId + playSessionId).

This is the foundation Changes 5 (`redesign-leaderboard-pipeline`) and 6 (`harden-concurrency-stack`) build on. Without it the API server cannot serve any game endpoint.

## What Changes

- **BREAKING** Replace the old `AttemptsController` (`POST /api/attempts/*`) with `ChallengesController` (`POST /api/challenges/*`). The new shape uses `attemptId` path params and the version-locked `GameAttempt` fields.
- **BREAKING** Remove direct game-specific `/start` endpoints from `GamesController`; game start always flows through `POST /api/challenges/start`.
- Add `apps/api/src/challenges/` module with: `challenges.controller.ts`, `challenges.service.ts`, `challenge-state-machine.ts` (encodes the legal `AttemptStatus` transitions and emits `ChallengeAuditLog` entries), `entry-token.service.ts` (generates and hashes single-use entry tokens), `runtime-session.service.ts` (manages `AttemptRuntimeSession` lifecycle).
- Add `apps/api/src/games/game-adapter.interface.ts` redefining the **server-side** `GameRuntimeAdapter` contract: `{ engineKey, startAttempt(input) → { seed, initialState, expiresAt, contentResolvedType, puzzleId?, puzzleVersionId?, generatedContentHash? }, finishAttempt(input) → { passed, scoreValue, durationMs, metrics, antiCheatFlags } }`.
- Add `apps/api/src/games/game-adapter-registry.service.ts` that resolves an adapter by `engineKey`. Adapters live under `apps/api/src/games/<slug>/<slug>.adapter.ts` — four minimal implementations created here (start + finish only).
- Add `ChallengeReaperWorker` placeholder (cron + setInterval, no BullMQ yet — that's Change 6): scans `(status, expiresAt)` and `(status, lastHeartbeatAt)` partial indexes, transitions stuck attempts to `TIMEOUT` or `INTERRUPTED`.
- Add `ChallengeAuditLog` writer integrated into the state machine.
- Update `apps/api/tsconfig.json` to **remove** `src/games` and `src/attempts` from `exclude`; keep `src/leaderboards` excluded (Change 5).
- Wire `ChallengesModule` and the rebuilt `GamesModule` into `AppModule`.
- Update `@brain-games/shared` with new attempt schemas (`StartChallengeRequest/Response`, `ClaimChallengeRequest/Response`, `ChallengeHeartbeatRequest/Response`, `AbandonChallengeRequest/Response`, `FinishChallengeRequest/Response`, `ChallengeStatusResponse`, `ChallengeMode` enum, `AttemptStatus` enum, `ChallengeInvalidReason` enum).
- Add `apps/web/src/challenge/` directory with `core/` (navigation manager, route guard, blocker, heartbeat, broadcast, runtime store, policy resolver, types, errors), `adapters/` (4 client-side `GameRuntimeAdapter`s + registry), `components/` (`ChallengeStartPage`, `ChallengePlayHost`, `ChallengeResultPage`, `ChallengeExpiredPage`, `LeaveChallengeDialog`, `ChallengeStatusBoundary`), `api/` (`challenge-api.ts`, `challenge-query-keys.ts`).
- Add new TanStack Router routes `games.$gameSlug.start.tsx`, `games.$gameSlug.attempts.$attemptId.play.tsx`, `games.$gameSlug.attempts.$attemptId.result.tsx`, `games.$gameSlug.attempts.$attemptId.expired.tsx`.
- Update existing player routes `games.$gameSlug.play.tsx` (and game-specific `practice`/`puzzles/$slug/play` variants) to **redirect** to `/start` when no `attemptId` query param is present.
- Add `BroadcastChannel`-based tab conflict detection in `ChallengeBroadcast` (one active tab per attempt).

## Capabilities

### New Capabilities

- `challenges`: Server-side challenge lifecycle (start/claim/heartbeat/abandon/finish/status), CAS state machine, runtime session, entry tokens, adapter registry.
- `challenge-runtime`: Client-side runtime gateway (navigation manager, route guard, blocker, heartbeat, broadcast, runtime store) and the new `/start | /play | /result | /expired` route shape.

### Modified Capabilities

- `attempts`: Existing capability is replaced by the `challenges` capability; the old spec's requirements are superseded. We mark them REMOVED with migration notes pointing to `challenges`.
- `games-catalog`: Continues to expose `/api/games` catalog endpoints but no longer owns attempt creation; `start` field on each game now reads ACTIVE `GameChallengePolicy` and `GameDifficulty` for the SPA.

## Impact

- `apps/api/src/challenges/*` (new)
- `apps/api/src/games/game-adapter.interface.ts` (rewrite)
- `apps/api/src/games/game-adapter-registry.service.ts` (new)
- `apps/api/src/games/sliding-puzzle/` (rewrite to adapter shape)
- `apps/api/src/games/life-game/`, `precise-character-building/`, `absolute-command/` (minimal adapter shells; verifySubmission stubs return `not_implemented` and rely on Change 7 to flesh out)
- `apps/api/src/attempts/*` (delete; functionality moved to `challenges`)
- `apps/api/src/games/games.controller.ts` (remove `/start` shortcut)
- `apps/api/src/games/attempt-timeout.ts` (delete; replaced by `ChallengeReaperWorker`)
- `apps/api/src/games/games.module.ts` (rewrite imports)
- `apps/api/src/app.module.ts` (import ChallengesModule, GamesModule re-enabled)
- `apps/api/tsconfig.json` (remove games/attempts from exclude)
- `packages/shared/src/schemas/attempts.ts` (rewrite into challenge-shape)
- `apps/web/src/challenge/*` (new)
- `apps/web/src/app/router.tsx` and route files (add 4 new routes, update 3 old ones to redirect)
- `docs/Overview-Challenge-Runtime.md` (new)

**Out of scope**: leaderboard write pipeline (Change 5 wires `finishAttempt` to ScoreRecord+LeaderboardBest), BullMQ workers and Redis locks (Change 6), per-game mid-game submission endpoints (Change 7), admin attempt-detail UI changes (deferred).
