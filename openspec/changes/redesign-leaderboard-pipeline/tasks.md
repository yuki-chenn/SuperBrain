# Tasks — redesign-leaderboard-pipeline

## 1. Preparation

- [x] 1.1 Confirm Changes 1–4 merged; `pnpm api -- pnpm build` succeeds with `leaderboards` still in `tsconfig.json` `exclude`.
- [x] 1.2 Remove `src/leaderboards` from `apps/api/tsconfig.json` `exclude`.

## 2. Shared schemas

- [x] 2.1 Rewrite `packages/shared/src/schemas/leaderboards.ts`:
  - `LeaderboardSummarySchema` (id, slug, name, scope, periodType, mode?, difficultyKey?, rankMetric, rankDirection, displayLimit, status).
  - `LeaderboardPeriodSchema` (id, periodType, periodKey, periodStart?, periodEnd?, timezone?).
  - `LeaderboardRankCacheItemSchema` (rankPosition, userId, displayName, avatarUrl?, rankValue, metrics).
  - `LeaderboardDetailResponseSchema` ({ leaderboard, period, items[], currentUserRank?, total }).
  - `LeaderboardListResponseSchema` ({ items: LeaderboardSummary[] }).
  - `LeaderboardFinishRecordingSchema` ({ leaderboardSlug, recorded: boolean, currentRank?, reason? }).
- [x] 2.2 Rebuild shared; verify the rest of the workspace still compiles.

## 3. PeriodResolverService

- [x] 3.1 Create `apps/api/src/leaderboards/period-resolver.service.ts` with `resolve(periodType, completedAt, timezone): { periodKey, periodStart?, periodEnd? }`.
- [x] 3.2 Unit tests: midnight rollover for DAILY in Asia/Shanghai and UTC; week boundary on Sunday→Monday; DST transitions for any IANA zone (skip if Asia/Shanghai only).
- [x] 3.3 `getOrCreatePeriod(leaderboardId, periodType, completedAt, timezone, tx)` upserts a `LeaderboardPeriod` row.

## 4. ScoreRecordingService

- [x] 4.1 Create `apps/api/src/leaderboards/score-recording.service.ts` with `recordScores(attemptId, validationReportData, tx)`.
- [x] 4.2 Logic per design D2:
  - Query applicable boards (game/mode/difficulty/puzzle match).
  - For each board: resolve period; compute rankValue + tieValues from `attempt.scoreValue` and `attempt.metricsSummary`; insert `ScoreRecord`; upsert `LeaderboardBest` (direction-aware); schedule refresh hint.
- [x] 4.3 Add `RankComputerService` helper that reads `LeaderboardDefinition.rankMetric` + `tieBreakers` and projects values from a `metrics` JSON object.

## 5. RankCacheService + Refresh worker

- [x] 5.1 Create `apps/api/src/leaderboards/rank-cache.service.ts` with `refreshCache(leaderboardId, periodId)` and `scheduleRefresh(leaderboardId, periodId)` (in-memory debounce 5s).
- [x] 5.2 Implement refresh logic: DELETE existing cache rows; INSERT top-N from LeaderboardBest joined with User; assign rankPosition via window function (`RANK()` via raw SQL).
- [x] 5.3 Create `apps/api/src/leaderboards/leaderboard-refresh.worker.ts` (`@Cron('*/60 * * * * *')`).
- [x] 5.4 Worker logic: SELECT boards where newest score after last cache `generatedAt`; refresh each. Flush the debounce queue.
- [x] 5.5 Add `ScheduleModule.forRoot()` if not already registered by Change 3.

## 6. Player-side controllers

- [x] 6.1 Create `apps/api/src/leaderboards/leaderboards.controller.ts`:
  - `GET /api/leaderboards?gameId=&...` → list.
  - `GET /api/leaderboards/:slug?periodKey=&offset=&limit=` → detail with cache → fallback inline refresh; include currentUserRank.
  - `GET /api/leaderboards/:slug/periods?limit=30` → historic periods.
- [x] 6.2 Annotate endpoints with `@RequirePermission('leaderboard:read')` (allow anonymous? — TBD: allow anonymous per design D4; if so use Public decorator). For this change require auth to simplify; relax later.

## 7. Admin endpoints

- [x] 7.1 Create `apps/api/src/admin/admin-leaderboards.controller.ts` with:
  - List / get / create / update `LeaderboardDefinition`.
  - List `LeaderboardPeriod` for a board; `POST .../periods/:periodId/lock` (sets `lockedAt=now`).
  - `POST /api/admin/score-records/:id/revoke { reason }` — runs Revoke flow per design D6.
  - `POST /api/admin/leaderboards/:id/refresh-cache?periodId=` — force refresh.
- [x] 7.2 Apply `@RequirePermission('leaderboard:*')` / `score-record:revoke`.

## 8. ChallengesService — wire score recording

- [x] 8.1 Inject `ScoreRecordingService` into `ChallengesService`.
- [x] 8.2 In `finish(...)`, inside the existing transaction, AFTER the `SUBMITTING → COMPLETED` CAS, call `recordScores(attemptId, validationReportData, tx)`.
- [x] 8.3 Extend `FinishChallengeResponse` to include `leaderboards[]`.
- [x] 8.4 If `recordScores` throws, the whole transaction rolls back — verify behaviour.

## 9. AppModule

- [x] 9.1 Import `LeaderboardsModule` in `apps/api/src/app.module.ts`.
- [x] 9.2 Verify `pnpm api -- pnpm build` passes for entire backend (no more excludes apart from intentional ones).
- [x] 9.3 Boot API; smoke `/api/leaderboards` returns the 13 seeded board summaries.

## 10. Web — player leaderboard UI

- [x] 10.1 Rewrite `apps/web/src/features/leaderboard/` to consume the new shapes.
- [x] 10.2 Add period selector for boards with `periodType != ALL_TIME`.
- [x] 10.3 Highlight current user's row; show their rank even if outside top-N.
- [x] 10.4 Update existing `apps/web/src/app/routes/` leaderboard route (if any) or wait until it's added — verify the SPA can navigate to the leaderboard from `ChallengeResultPage`.

## 11. Web — ChallengeResultPage extension

- [x] 11.1 Update `apps/web/src/challenge/components/ChallengeResultPage.tsx` to read `result.leaderboards[]` from `FinishChallengeResponse` and render: "Your rank on <board name>: #N (top X%)". Link to the board.

## 12. Admin SPA — leaderboards

- [x] 12.1 Rewrite `apps/admin/src/features/leaderboards/` to use the new endpoints.
- [x] 12.2 Update `apps/admin/src/app/routes/leaderboards.tsx` and `leaderboard-detail.tsx`:
  - List: show definitions + status + last refreshedAt.
  - Detail: show top-N cache + period selector + revoke action per row + force-refresh-cache button.
- [x] 12.3 Add CRUD form for `LeaderboardDefinition` (slug, name, scope, periodType, rankMetric, rankDirection, tieBreakers, entryPolicy, displayLimit, visible).

## 13. End-to-end smoke

- [x] 13.1 Complete a sliding-puzzle easy/RANKED attempt as `demo` user; verify `FinishChallengeResponse.leaderboards` has the matching board with `recorded=true` and `currentRank=1`.
- [x] 13.2 GET `/api/leaderboards/sliding-puzzle-easy-fastest`; verify demo user appears at rank 1.
- [x] 13.3 Complete a second slower attempt; verify LeaderboardBest stays on the faster score.
- [x] 13.4 Complete a faster attempt; verify LeaderboardBest updates and cache reflects within 60s (or immediately via on-write debounce).
- [x] 13.5 Revoke the top ScoreRecord as super_admin; verify demo user's rank drops or disappears.
- [x] 13.6 Verify `LeaderboardRankCache` row count is ≤ `displayLimit` for each board.
- [x] 13.7 Cross midnight in Asia/Shanghai: complete an attempt on a (mocked or real) DAILY board on each side; verify two distinct periodKeys.

## 14. Documentation

- [x] 14.1 Create `docs/Overview-Leaderboard.md`: pipeline diagram (ScoreRecord → LeaderboardBest → RankCache), period resolver rules, revoke flow, refresh worker, endpoint table.
- [x] 14.2 Update `docs/Overview-Framework.md` "过渡说明": mark Leaderboard stream complete.
- [x] 14.3 Add a "define-a-leaderboard" snippet (will become `rule-define-leaderboard.md`).

## 15. Handoff to Change 6 / 7

- [x] 15.1 Verify cache refresh worker still uses `@nestjs/schedule` — Change 6 will promote to BullMQ.
- [x] 15.2 Verify revoke flow does not yet write to `AdminReviewTask` — that's a Change 6 follow-up for the REVIEW_REQUIRED flow.
- [x] 15.3 Communicate: leaderboards are live; remaining work is concurrency hardening (Change 6) and removing per-game endpoints (Change 7).
