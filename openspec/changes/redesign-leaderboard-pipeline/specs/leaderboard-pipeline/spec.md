# leaderboard-pipeline Capability (delta for change `redesign-leaderboard-pipeline`)

## ADDED Requirements

### Requirement: Score recording on attempt finish

When `ChallengesService.finish` transitions an attempt to `COMPLETED` with `scoreEligibility = ELIGIBLE`, the system SHALL insert one `ScoreRecord` per applicable `LeaderboardDefinition` and upsert the corresponding `LeaderboardBest` (for `entryPolicy = BEST_PER_USER`) inside the same transaction.

#### Scenario: Eligible finish writes scores
- **GIVEN** a `GameAttempt` for `sliding-puzzle/easy/RANKED` with `validationReport.scoreAccepted=true`, `policy.eligibleForLeaderboard=true`
- **WHEN** the finish transaction commits
- **THEN** at least one `ScoreRecord` exists for `(leaderboardId=sliding-puzzle-easy-fastest, attemptId)`
- **AND** the corresponding `LeaderboardBest` exists or has been updated

#### Scenario: NOT_ELIGIBLE finish writes no scores
- **GIVEN** an attempt with `scoreEligibility='NOT_ELIGIBLE'`
- **WHEN** finish commits
- **THEN** no `ScoreRecord` rows are inserted for this attempt

#### Scenario: Failed adapter (passed=false) leaves boards untouched
- **GIVEN** an attempt where the adapter returned `passed=false`
- **WHEN** finish commits
- **THEN** the attempt is `COMPLETED` with `validationStatus='INVALID'` but no `ScoreRecord` is inserted

### Requirement: BEST_PER_USER upsert is direction-aware

For boards with `entryPolicy = BEST_PER_USER`, the system SHALL only update `LeaderboardBest` if the new `(rankValue, tieValue1, tieValue2, tieValue3)` beats the existing row's values per the board's `rankDirection` and tieBreakers; otherwise the existing row stays.

#### Scenario: Better score replaces best
- **GIVEN** user U has `LeaderboardBest.rankValue=120000` on a board with `rankDirection=ASC`
- **WHEN** U finishes an attempt with `rankValue=90000`
- **THEN** `LeaderboardBest` for `(board, period, U)` is updated to point at the new `ScoreRecord`, `rankValue=90000`

#### Scenario: Worse score keeps best
- **GIVEN** same setup
- **WHEN** U finishes an attempt with `rankValue=150000`
- **THEN** `LeaderboardBest` is unchanged
- **AND** a new `ScoreRecord` IS still inserted (write history is complete)

### Requirement: Period resolution deterministic

The system SHALL compute `periodKey` from `(periodType, completedAt, timezone)` per the formulas defined in `PeriodResolverService`. Periods SHALL be upserted lazily on first score by `(leaderboardId, periodKey)`.

#### Scenario: Daily period rolls at local midnight
- **GIVEN** a leaderboard with `periodType=DAILY, timezone='Asia/Shanghai'`
- **WHEN** an attempt completes at 2026-06-15T15:59:00Z (23:59 local) and another at 2026-06-15T16:00:00Z (00:00 next-day local)
- **THEN** the first ScoreRecord's `LeaderboardPeriod.periodKey = '2026-06-15'` and the second's `periodKey = '2026-06-16'`

#### Scenario: ALL_TIME has single fixed period
- **WHEN** any attempt completes on an ALL_TIME leaderboard
- **THEN** the period row has `periodKey = 'all-time'`

### Requirement: ScoreRecord uniqueness per (board, attempt)

The system SHALL NOT insert two `ScoreRecord` rows for the same `(leaderboardId, attemptId)` pair. Idempotent retries (e.g. a re-issued finish) SHALL succeed without duplicating rows.

#### Scenario: Replay finish does not duplicate score
- **WHEN** the SPA POSTs `/api/challenges/:id/finish` twice
- **THEN** the `ScoreRecord` count for `(leaderboardId, attemptId)` stays 1

### Requirement: Player leaderboard endpoints

The system SHALL expose:
- `GET /api/leaderboards?gameId=&difficultyId=&mode=&periodType=` — list visible boards
- `GET /api/leaderboards/:slug?periodKey=&offset=&limit=` — top-N + current user rank
- `GET /api/leaderboards/:slug/periods?limit=30` — historical periods for the board

The detail endpoint SHALL serve from `LeaderboardRankCache` and SHALL include `currentUserRank` for the authenticated user (computed from `LeaderboardBest`).

#### Scenario: Detail returns cached top-N
- **GIVEN** a board with 100 cached rank entries
- **WHEN** a client GETs `/api/leaderboards/<slug>?offset=0&limit=10`
- **THEN** the response is `{ leaderboard, period, items: [10 entries], currentUserRank?, total: 100 }`

#### Scenario: Detail triggers inline refresh when cache empty
- **GIVEN** a brand new leaderboard with no cache rows but with ScoreRecord rows present
- **WHEN** a client GETs the detail
- **THEN** the API runs `refreshCache(...)` inline and returns the freshly-computed top-N

### Requirement: RankCache refresh is idempotent

`RankCacheService.refreshCache(leaderboardId, periodId)` SHALL produce a deterministic top-N from `LeaderboardBest` (or `ScoreRecord` for ALL_ATTEMPTS). Re-running it without new scores SHALL produce the same row set with possibly-updated `generatedAt`.

#### Scenario: Repeated refresh yields same rows
- **GIVEN** no new scores written
- **WHEN** `refreshCache` is called twice in a row
- **THEN** both runs produce the same `(rankPosition, userId, rankValue)` tuples

### Requirement: LeaderboardRefreshWorker schedule

A scheduled worker SHALL run every 60 seconds and refresh every leaderboard period whose most recent score arrived after the period's cache `generatedAt`.

#### Scenario: Worker picks up writes
- **GIVEN** a score was inserted at T0 and last cache refresh was at T0 - 30s
- **WHEN** the worker next runs (T0 + ≤60s)
- **THEN** the cache is refreshed and `generatedAt > T0`

### Requirement: Admin score revoke triggers refresh

`POST /api/admin/score-records/:id/revoke` SHALL set `ScoreRecord.status='REVOKED'`, update or delete the affected `LeaderboardBest` row (using next-best ScoreRecord for the user in that period), and trigger an inline cache refresh.

#### Scenario: Revoke removes from board
- **GIVEN** user U has `ScoreRecord(rankValue=90000)` as their current best on board B/period P, and another `ScoreRecord(rankValue=120000)` for the same `(U, B, P)`
- **WHEN** an admin revokes the 90000 record
- **THEN** the 90000 record is `status=REVOKED`
- **AND** `LeaderboardBest(B, P, U)` now points at the 120000 record
- **AND** `LeaderboardRankCache` for B/P is refreshed
