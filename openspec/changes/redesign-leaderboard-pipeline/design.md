# Design — redesign-leaderboard-pipeline

## Context

The schema redesign in Change 1 deliberately split leaderboard storage into three tables to separate concerns:

- **`ScoreRecord`** — append-only write side. One row per (leaderboardId, attemptId). Holds the raw `rankValue` + tie values. Never overwritten; revocation marks `status='REVOKED'`.
- **`LeaderboardBest`** — read-optimised per-user materialisation. One row per `(leaderboardId, periodId, userId)`. Holds the user's best score (per `BEST_PER_USER` policy) or is absent (for `ALL_ATTEMPTS` boards, where `ScoreRecord` is queried directly).
- **`LeaderboardRankCache`** — top-N display cache for hot reads. One row per `(leaderboardId, periodId, rankPosition)`. Snapshots `displayName/avatarUrl` so player avatars don't change retroactively after a rename.

Change 3's `finish()` opens a transaction (`UPDATE GameAttempt`, INSERT `AttemptValidationReport`) but does not touch any of the three. This change extends that transaction to fan out scores to every applicable `LeaderboardDefinition`.

## Goals / Non-Goals

**Goals**
- Score fan-out runs in the same DB transaction as `GameAttempt.complete`.
- `BEST_PER_USER` boards correctly keep the user's best (no duplicate per user per period).
- `ALL_ATTEMPTS` boards write a new ScoreRecord every time; LeaderboardBest is not used (reads query ScoreRecord directly).
- Period resolution is deterministic: `periodKey` is computed from `(periodType, completedAt, timezone)` using a documented formula.
- LeaderboardRankCache refresh is idempotent and runs both on schedule (60s) and on-write (debounced).
- Admin can revoke a `ScoreRecord` causing both `LeaderboardBest` and `LeaderboardRankCache` recomputation for that board+period.
- Player read endpoint hits `LeaderboardRankCache` first (cheap) and falls back to `LeaderboardBest` only if cache is stale (rare).

**Non-Goals**
- No Redis caching layer. The `LeaderboardRankCache` table already serves the hot path; Redis lookup is a Change 6 optimisation if needed.
- No friends/social scope (`LeaderboardScope.FRIENDS`) — table supports it but query/UI deferred.
- No streaming updates (websockets) — refresh remains poll-based.
- No automatic per-puzzle leaderboard creation for new puzzles — admin manually creates as needed (script can be added later).
- No anti-cheat post-processing — that's signalled via `AttemptValidationReport.antiCheatFlags` and gated by `scoreAccepted=false`.

## Decisions

### D1 — Score fan-out happens inside finish() transaction

Pseudo:

```ts
await prisma.$transaction(async (tx) => {
  // (1) CAS PLAYING→SUBMITTING
  // (2) adapter.finishAttempt(...)
  // (3) INSERT AttemptValidationReport
  // (4) CAS SUBMITTING→COMPLETED (sets durationMs, scoreValue, validationStatus, scoreEligibility)
  // (5) scoreRecording.recordScores(attempt, validationReport)   ← THIS CHANGE
});
```

If step (5) throws, the whole transaction rolls back. Net effect: a player either sees their score on the board OR the attempt was not marked COMPLETED — never an inconsistency.

`scoreEligibility` is `ELIGIBLE` only if `validationReport.scoreAccepted === true && challengePolicy.eligibleForLeaderboard === true`. If `NOT_ELIGIBLE`, step (5) is a no-op.

### D2 — Per-board fan-out

`ScoreRecordingService.recordScores(attempt, reportData, tx)`:

1. Compute the set of applicable `LeaderboardDefinition` rows: `(gameId = attempt.gameId) AND (status = ACTIVE) AND (mode IS NULL OR mode = attempt.mode) AND (difficultyId IS NULL OR difficultyId = attempt.difficultyId) AND (puzzleId IS NULL OR puzzleId = attempt.puzzleId)`.
2. For each board: resolve the matching `LeaderboardPeriod` (create on demand if periodType != ALL_TIME and the period doesn't yet exist).
3. Compute `rankValue + tieValue1..3` from `attempt.scoreValue + attempt.metricsSummary` using the board's `rankMetric` and `tieBreakers` config.
4. INSERT `ScoreRecord` (uses `@@unique([leaderboardId, attemptId])` — idempotent if retried).
5. If `entryPolicy = BEST_PER_USER`: upsert `LeaderboardBest` keyed `(leaderboardId, periodId, userId)`. New row when first score; UPDATE only if new `rankValue` beats existing (direction-aware).
6. Enqueue a refresh hint for `RankCacheService.scheduleRefresh(leaderboardId, periodId)` (in-memory debounce; flushes via worker).

### D3 — Period resolver

```ts
periodResolver.resolve(periodType, completedAt, timezone): { periodKey, periodStart?, periodEnd? }
```

Mapping:
- `ALL_TIME` → `periodKey = 'all-time'`, no start/end.
- `DAILY` → `periodKey = 'YYYY-MM-DD'` in the given timezone (default Asia/Shanghai). `periodStart` = local midnight, `periodEnd` = next-day local midnight.
- `WEEKLY` → ISO week `'YYYY-Www'`.
- `MONTHLY` → `'YYYY-MM'`.
- `SEASONAL` → `'YYYY-Sn'` where n in 1..4 (Q1..Q4).
- `CUSTOM` → admin-supplied; the resolver returns `null` and the application MUST find an existing `LeaderboardPeriod` whose `[periodStart, periodEnd]` covers `completedAt`.

The matching `LeaderboardPeriod` is upserted on first score in that period: `upsert({where: {leaderboardId_periodKey: {...}}, create: {...}})`.

### D4 — Read path uses LeaderboardRankCache first

`GET /api/leaderboards/:slug?periodKey=&offset=&limit=`:

1. Resolve `(leaderboardSlug, periodKey)` → `LeaderboardDefinition.id, LeaderboardPeriod.id`.
2. Query `LeaderboardRankCache` ordered by `rankPosition` with `LIMIT/OFFSET`.
3. If cache is empty or stale (>5 min old), trigger an inline refresh (synchronous) and re-read.
4. Additionally, query the current user's `LeaderboardBest` row for `(leaderboardId, periodId, userId=current)`; if present, compute their rank by counting how many bests beat theirs (using the same ordering) — return in response as `currentUserRank`.

### D5 — RankCacheService idempotent refresh

`refreshCache(leaderboardId, periodId)`:

1. SELECT top `displayLimit` (e.g. 100) rows from `LeaderboardBest` joined with `User` (for displayNameSnapshot/avatarUrlSnapshot), ordered by `(rankValue, tieValue1, tieValue2, tieValue3) (ASC or DESC per board)`.
2. DELETE existing cache rows for `(leaderboardId, periodId)`.
3. INSERT new cache rows with assigned `rankPosition = 1..N`.

Steps 2+3 run inside a savepoint; on conflict (race with another refresh), retry once.

### D6 — Revoke flow

Admin POSTs `/api/admin/score-records/:id/revoke { reason }`:

1. UPDATE the `ScoreRecord.status = 'REVOKED', revokedAt = now, revokedByUserId, revokedReason`.
2. If the revoked record IS the user's current `LeaderboardBest` (compare `scoreRecordId`):
   - Find the next best ScoreRecord for that user in the same `(leaderboardId, periodId)` (status=ACTIVE).
   - If found, UPDATE `LeaderboardBest` to point at it.
   - If not, DELETE the `LeaderboardBest` row.
3. Trigger `refreshCache(leaderboardId, periodId)`.
4. Emit `AdminAuditLog` row.

### D7 — Periods are pre-created lazily

We do NOT pre-generate every DAILY period for every leaderboard at midnight. Instead, on each score fan-out, `periodResolver` ensures the row exists via `upsert`. The worker's hourly sweep can pre-warm periods for popular boards (deferred).

### D8 — ALL_ATTEMPTS boards skip LeaderboardBest

For `EntryPolicy.ALL_ATTEMPTS` boards, the player read endpoint queries `ScoreRecord` directly (ordered + paginated). `LeaderboardBest` is never written. `LeaderboardRankCache` is still populated for the top-N, materialised from the same ordered ScoreRecord query.

### D9 — RankCache TTL

Cached rows carry `generatedAt`. Reads compute staleness against the leaderboard's `metadata.cacheTtlSec` (default 300). The worker refreshes any board whose newest score was written after its `generatedAt`. On-write debounce: 5 seconds.

### D10 — Hot-path query optimisation

`LeaderboardBest_leaderboardId_periodId_rankValue_tieValue1_tieValue2_tieValue3_idx` (already in schema) backs the cache-refresh `SELECT ORDER BY rankValue, tie...`. Player `currentUserRank` query uses a count via the same index. No extra indexes needed.

## Risks / Trade-offs

- **[Risk]** Cache refresh contention under high load (many simultaneous finishes on the same board). → **Mitigation**: in-process debounce (5s) + DB savepoint retry. If still problematic at scale, Change 6 wraps refresh with a Redis lock.
- **[Risk]** Period resolver bugs (timezone DST edge) drop scores into wrong period. → **Mitigation**: unit tests for DST transitions; use `Intl.DateTimeFormat({timeZone})` rather than DIY math.
- **[Risk]** Revoke after a long time leaves stale `LeaderboardRankCache` until next refresh. → **Mitigation**: revoke synchronously triggers refresh.
- **[Trade-off]** Inline cache refresh on read (when stale) adds latency to the first request after a gap. → **Accepted**; the worker normally keeps cache warm.
- **[Trade-off]** `ScoreRecordingService` runs inside `finish` transaction so finish takes longer. → **Accepted**; eligible-leaderboard count per game is typically ≤ 3.

## Migration Plan

1. Implement `PeriodResolverService`, `ScoreRecordingService`, `RankCacheService` under `apps/api/src/leaderboards/`.
2. Extend `ChallengesService.finish()` to call `ScoreRecordingService.recordScores` inside the existing transaction.
3. Implement `LeaderboardsController` (player) + `AdminLeaderboardsController`.
4. Add `LeaderboardRefreshWorker` (`@Cron('*/60 * * * * *')`) plus an on-write hint queue (in-memory `Map<leaderboardId, lastWriteTs>`).
5. Wire `LeaderboardsModule` into `AppModule`. Remove from `tsconfig.exclude`.
6. Update `@brain-games/shared` schemas. Rebuild.
7. Update web + admin SPAs.
8. Backfill: for any pre-existing `GameAttempt(status=COMPLETED)` from manual testing during Change 3, run a one-off script that calls `recordScores`; not needed if dev DB was reset.

**Verification gate**:
- E2E: complete a sliding-puzzle RANKED attempt → `/api/leaderboards/sliding-puzzle-easy-fastest` returns the attempt in top-N within 60s; if attempt is the user's first, their `currentUserRank` is set.
- Revoke a ScoreRecord via admin → board recomputes; revoked entry no longer appears; user's LeaderboardBest updates to the next-best record (or disappears).
- Idempotent finish: re-POSTing `finish` does NOT create a duplicate ScoreRecord (`@@unique([leaderboardId, attemptId])` enforces).
- Daily period rolls at local midnight (Asia/Shanghai) — first score after midnight lands in the new periodKey row.

## Open Questions

1. Should we expose `GET /api/leaderboards/:slug/periods` for the player to browse historic periods? **Adopted**: yes; read-only, returns up to 30 most recent periods.
2. Should a tied rank receive same `rankPosition` in `LeaderboardRankCache` ("competition ranking" 1, 2, 2, 4)? **Adopted**: yes; use `RANK()` window function in the refresh query. Default tieBreakers (which include `completedAt ASC`) push exact ties to be rare.
3. Should `scoreEligibility=NOT_ELIGIBLE` attempts ever appear on `ALL_ATTEMPTS` boards? **Adopted**: no — ALL_ATTEMPTS boards still respect eligibility (otherwise practice runs would pollute them).
