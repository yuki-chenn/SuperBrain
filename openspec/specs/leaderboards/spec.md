# leaderboards Specification

## Purpose

Generic leaderboard framework. Each game can declare zero or more `LeaderboardDefinition` rows describing how its attempts are ranked (metric + direction + tie-breakers + entry policy). Completed attempts feed entries through `LeaderboardsService.recordAttemptResult`. Two strategies are supported today: per-user best record (`BEST_PER_USER`) and rolling-window stats (e.g. average of last 10 completions). Read endpoints return paginated entries joined with the user record.

## Architecture Notes

- `LeaderboardDefinition` columns: `gameId`, `slug` (globally unique), `name`, `scope` (default `GLOBAL`; only `GLOBAL` is implemented), `difficultyKey?`, `rankMetric`, `rankDirection` (`ASC`/`DESC`), `tieBreakers` JSON, `entryPolicy` (default `BEST_PER_USER`), `metadata` JSON.
- `LeaderboardEntry` is unique on `(leaderboardDefinitionId, userId)`. Stores `bestAttemptId`, `rankValue` (Decimal), `metrics` JSON.
- Strategy selection: `definition.metadata.type === 'stats'` triggers the rolling-stats strategy; otherwise the best-per-user strategy is used.
- Stats strategy: rolling window = 10 most recent `COMPLETED` attempts of the same user, game, and difficulty; `rankValue` is the integer mean of `metrics.durationMs` across that window; entry metrics include `avgTimeLast10` and cumulative `completionCount`.
- A definition only fires for an attempt if `definition.difficultyKey` matches `attempt.difficultyKey` (string equality; current code does `where: { gameId, difficultyKey }`).

## Requirements

### Requirement: Leaderboard definitions describe ranking shape

The system SHALL store per-game leaderboard configurations capturing the rank metric, direction, tie-breakers, entry policy, and scope.

#### Scenario: Definition uniqueness
- **WHEN** a `LeaderboardDefinition` is persisted
- **THEN** `slug` is globally unique across all games
- **AND** the row is indexed by `(gameId, difficultyKey)`

#### Scenario: Tie-breaker shape
- **WHEN** `tieBreakers` is consumed
- **THEN** it is interpreted as an array of `{ metric: string, direction: 'ASC'|'DESC' }` evaluated in order

### Requirement: Best-per-user record strategy

The system SHALL, when a `COMPLETED` attempt is recorded against a definition without `metadata.type === 'stats'`, retain only the user's best attempt according to the definition's metric and tie-breakers.

#### Scenario: First entry for user
- **WHEN** the user has no existing entry on the definition and `attempt.metrics[rankMetric]` is defined
- **THEN** a `LeaderboardEntry` is created with `bestAttemptId=attempt.id`, `rankValue=metrics[rankMetric]`, `metrics=attempt.metrics`

#### Scenario: New attempt strictly improves primary metric
- **WHEN** the user has an existing entry and the new attempt's `rankValue` is better according to `rankDirection` (`ASC` ⇒ smaller is better; `DESC` ⇒ larger is better)
- **THEN** the entry is overwritten with the new `bestAttemptId`, `rankValue`, and `metrics`

#### Scenario: Tie on primary metric, broken by tie-breakers
- **WHEN** the new attempt ties on the primary metric but a tie-breaker (in declared order) declares the candidate strictly better
- **THEN** the entry is overwritten

#### Scenario: Strictly worse attempt
- **WHEN** the new attempt is strictly worse on the primary metric, or ties throughout
- **THEN** the existing entry is left unchanged

#### Scenario: Missing rank metric
- **WHEN** the attempt's `metrics` does not contain the definition's `rankMetric`
- **THEN** the definition is skipped (no entry created or updated) and no error is raised

### Requirement: Rolling-stats strategy (last 10 completions)

The system SHALL, for definitions whose `metadata.type === 'stats'`, recompute the user's average duration across the most recent 10 completed attempts at the matching game + difficulty after every successful completion.

#### Scenario: Rolling average computation
- **WHEN** the user completes another attempt for a stats definition
- **THEN** the most recent 10 `COMPLETED` attempts (for that user, game, difficulty) ordered by `completedAt desc` are loaded
- **AND** `avgTimeLast10` is computed as `round(mean(metrics.durationMs))` over rows whose `metrics.durationMs` is numeric
- **AND** the entry's `rankValue=avgTimeLast10`, `metrics={ avgTimeLast10, completionCount }`, and `bestAttemptId=attempt.id`
- **AND** `completionCount` is incremented by 1 from any prior value (or starts at 1)

#### Scenario: First stats entry
- **WHEN** the user has no existing stats entry for the definition
- **THEN** a new entry is created with the values above

### Requirement: Difficulty-keyed routing of completed attempts

The system SHALL only update definitions whose `difficultyKey` equals `attempt.difficultyKey`.

#### Scenario: Routing to matching definitions
- **WHEN** `recordAttemptResult(attempt)` runs
- **THEN** only `LeaderboardDefinition` rows with `gameId = attempt.gameId AND difficultyKey = attempt.difficultyKey` are considered
- **AND** the `updated` boolean returned aggregates whether any matching definition's entry changed

### Requirement: Read API exposes leaderboards per game and entries per leaderboard

The system SHALL provide unauthenticated read endpoints to list a game's leaderboards and to fetch ranked entries with pagination.

#### Scenario: Listing leaderboards by game
- **WHEN** `GET /games/:slug/leaderboards` is called
- **THEN** the response is the array of `LeaderboardDefinition` rows for that game ordered by `createdAt asc`
- **AND** unknown slug returns `404 Not Found`

#### Scenario: Fetching entries
- **WHEN** `GET /leaderboards/:leaderboardSlug/entries?limit=&offset=` is called
- **THEN** entries are ordered by `rankValue` according to `definition.rankDirection`
- **AND** pagination is clamped: `limit ∈ [1, 100]` (default 50), `offset ≥ 0` (default 0)
- **AND** the response is `{ leaderboard, items }` where each item is `{ rank, user: { id, username }, metrics, completedAt }`
- **AND** unknown slug returns `404 Not Found`

#### Scenario: Rank ordering
- **WHEN** entries are returned for an `ASC` definition
- **THEN** lower `rankValue` ranks higher (`rank=1` is smallest); the inverse holds for `DESC`

### Requirement: Seeded canonical leaderboards

The system SHALL seed the canonical leaderboard set for each game (best-time per difficulty plus stats variants where defined) via the seed pipeline.

#### Scenario: Seed idempotency
- **WHEN** `pnpm db:seed` runs against a database where definitions already exist
- **THEN** definitions are upserted by `slug` and not duplicated

### Requirement: Entries store contextual metrics for display

The system SHALL persist, alongside each entry, the metrics blob the UI uses for context (moves, errorCount, etc.) so the listing endpoint can render rich rows without re-reading attempt rows.

#### Scenario: Entry metrics persisted
- **WHEN** a best-per-user entry is created or replaced
- **THEN** `entry.metrics` is the full `attempt.metrics` object at completion time

#### Scenario: Stats entry metrics
- **WHEN** a stats entry is updated
- **THEN** `entry.metrics` contains `{ avgTimeLast10, completionCount }`
