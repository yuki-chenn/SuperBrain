# Proposal — redesign-leaderboard-pipeline

## Why

Change 1 introduced the three-table leaderboard pipeline (`ScoreRecord`, `LeaderboardBest`, `LeaderboardRankCache`) and `LeaderboardPeriod`. Change 3 wired `POST /api/challenges/:id/finish` to invoke the `GameRuntimeAdapter` and write `AttemptValidationReport`, but did **not** write any rows to the new leaderboard tables — the call returns success without recording a score.

This change closes the loop:

- Inside the same transaction that completes a `GameAttempt`, the system writes one `ScoreRecord` per eligible `LeaderboardDefinition` and upserts the corresponding `LeaderboardBest` (BEST_PER_USER) or appends (ALL_ATTEMPTS).
- A `LeaderboardRefreshWorker` runs on a schedule + after writes to recompute `LeaderboardRankCache` (top-N display materialisation) per board.
- New player-facing `/api/leaderboards/*` endpoints serve the cached top-N quickly without hitting `LeaderboardBest` joins on the hot path.
- New admin endpoints under `/api/admin/leaderboards/*` allow CRUD on `LeaderboardDefinition`, period management (create/lock current period for daily/weekly/monthly), and `ScoreRecord.revoke` for moderation.
- An `AttemptValidationReport.scoreAccepted` flag (already on schema) is the gating boolean — only `passed=true && scoreAccepted=true` writes scores.
- Period resolution (which `LeaderboardPeriod` row a brand-new score belongs to) is computed from `(periodType, periodKey, timezone)` using the leaderboard's configured timezone.

This change makes the platform actually useful again: players see their rank.

## What Changes

- **BREAKING** `POST /api/challenges/:id/finish` (Change 3) now ALSO writes `ScoreRecord` and upserts `LeaderboardBest` inside the same transaction. The `FinishChallengeResponse` gains a `leaderboards: { leaderboardSlug, currentRank?, recorded }[]` field.
- Add `apps/api/src/leaderboards/` module: `leaderboards.module.ts`, `leaderboards.service.ts` (player-side read), `leaderboards.controller.ts`, `score-recording.service.ts` (called from `ChallengesService.finish`), `period-resolver.service.ts`, `rank-cache.service.ts`, `leaderboard-refresh.worker.ts`.
- Add `apps/api/src/admin/admin-leaderboards.controller.ts` + service for definition CRUD, period management, `ScoreRecord.revoke`, and force-refresh-cache trigger.
- Update `apps/api/tsconfig.json` to **remove** `src/leaderboards` from `exclude`.
- Wire `LeaderboardsModule` into `AppModule`.
- Add new player endpoints:
  - `GET /api/leaderboards?gameId=&difficultyId=&mode=&periodType=` — list visible boards for a game/difficulty.
  - `GET /api/leaderboards/:slug?periodKey=&offset=&limit=` — top-N rank cache plus the requester's own rank.
- Add `LeaderboardRefreshWorker` (`@nestjs/schedule`, every 60s + on-write trigger) that recomputes `LeaderboardRankCache` per `(leaderboardId, periodId)`. Worker upgrades to BullMQ in Change 6.
- Update `@brain-games/shared/src/schemas/leaderboards.ts` to the new shape (`ScoreRecordResponse`, `LeaderboardBestResponse`, `LeaderboardRankCacheItem`, `LeaderboardPeriodResponse`, `LeaderboardListResponse`, `LeaderboardDetailResponse`).
- Update player web (`apps/web/src/features/leaderboard/`) to consume the new shapes; replace `LeaderboardEntry` references.
- Update admin SPA `apps/admin/src/features/leaderboards/` and routes `leaderboards.tsx`, `leaderboard-detail.tsx` to use the new endpoints.
- Update `ChallengeResultPage` (Change 3) to show the recorded leaderboard rank(s) inline if available.

## Capabilities

### New Capabilities

- `leaderboard-pipeline`: Write-side (ScoreRecord → LeaderboardBest → RankCache), read-side (player query endpoints), admin-side (CRUD + revoke + refresh).

### Modified Capabilities

- `leaderboards`: The legacy capability is superseded by `leaderboard-pipeline`. The old `LeaderboardEntry` query shape is REMOVED; the new shape uses `ScoreRecord` / `LeaderboardBest` joins.
- `challenges`: `FinishChallengeResponse` adds the `leaderboards[]` field listing every board the score was recorded into.

## Impact

- `apps/api/src/leaderboards/*` (new — module, services, controller, worker).
- `apps/api/src/admin/admin-leaderboards.{controller,service}.ts` (new).
- `apps/api/src/challenges/challenges.service.ts` — `finish()` extended to call `ScoreRecordingService.recordScores(attemptId)` inside the txn.
- `apps/api/src/app.module.ts` (import LeaderboardsModule).
- `apps/api/tsconfig.json` (drop `src/leaderboards` from exclude).
- `packages/shared/src/schemas/leaderboards.ts` (rewrite).
- `apps/web/src/features/leaderboard/*` (rewrite).
- `apps/admin/src/features/leaderboards/*` (rewrite).
- `apps/admin/src/app/routes/leaderboards.tsx`, `leaderboard-detail.tsx` (rewrite).
- `apps/web/src/challenge/components/ChallengeResultPage.tsx` (extend).
- `docs/Overview-Leaderboard.md` (new).

**Out of scope**: BullMQ workers proper (Change 6), Redis rank cache (deferred — `LeaderboardRankCache` table is sufficient for current scale), social/friends leaderboard scope (deferred), per-puzzle leaderboard auto-creation tools (existing seed handles AC; manual via admin UI for others).
