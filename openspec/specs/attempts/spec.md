# attempts Specification

## Purpose

Generic game-attempt lifecycle. Every play session is materialized as a `GameAttempt` row owned by a user, scoped to a game slug + difficulty key, started and validated server-side. The capability defines the shared protocol all games plug into via the `GameAdapter` interface; per-game-specific submission semantics live in their own capability specs but reuse this lifecycle and timeout machinery.

## Architecture Notes

- Storage: `GameAttempt` Prisma model with `status: STARTED | COMPLETED | INVALID | ABANDONED`.
- Authority: `startedAt` and `completedAt` are server clocks. `durationMs` is computed as `completedAt - startedAt`. Client-supplied durations are not authoritative.
- Two-phase start: `start` provisions the attempt server-side seed/initial state; `start-playing` is called when the client finishes its countdown so the timer reflects actual playable time.
- Adapter contract: `GameAdapter { slug, startAttempt(input) -> { seed, initialState }, finishAttempt(input) -> { valid, ... metrics, rankValue } }`.
- Generic `finish/abandon/timeout` endpoints exist under `/games/:slug/attempts/...`; `life-game` and `precise-character-building` reject the generic `finish`/`abandon` and require their game-specific endpoints (region submission / round submission / dedicated abandon route).
- Timeout: per-game `getGameMaxDurationMs(slug, difficultyKey)` lookup from `@brain-games/shared`; an attempt past its limit becomes `INVALID` with `invalidReason = 'TIMEOUT'`.

## Requirements

### Requirement: Authenticated attempt ownership

The system SHALL require a JWT-authenticated user for every attempt-mutating endpoint and isolate attempts so a user can only act on attempts they own.

#### Scenario: Unauthenticated attempt access
- **WHEN** any `/games/:slug/attempts/...` mutation endpoint is called without a valid access token
- **THEN** the response is `401 Unauthorized`

#### Scenario: Cross-user access
- **WHEN** an authenticated user calls a `/games/.../attempts/:attemptId/...` endpoint for an `attemptId` belonging to another user
- **THEN** the response is `404 Not Found` with message `Attempt not found` (the attempt is not disclosed)

### Requirement: Start attempt provisions server-controlled seed and initial state

The system SHALL, on start, validate the requested difficulty against the game's `difficultyLevels`, delegate to the game's adapter for seed + initial state, and persist a `GameAttempt` row in `STARTED` status.

#### Scenario: Successful start
- **WHEN** `POST /games/:slug/attempts/start` is called with `{ difficultyKey }` validated by `StartAttemptRequestSchema`
- **THEN** the matching `Game` is loaded and the difficulty key is verified against `game.difficultyLevels`
- **AND** the slug's `GameAdapter.startAttempt` produces `{ seed, initialState }`
- **AND** a `GameAttempt` is created with `status='STARTED'`, the user/game/difficulty/seed/initialState set, and game-specific subtype links established (e.g. `lifePuzzleId`, `pcbPuzzleId`) and metadata bootstrapped
- **AND** the response includes `attemptId`, `gameSlug`, `difficultyKey`, `seed`, `initialState`, `maxDurationMs`, `startedAt`

#### Scenario: Unknown game
- **WHEN** the slug does not match any `Game.slug`
- **THEN** the response is `404 Not Found` (`Game '<slug>' not found`)

#### Scenario: Unknown difficulty
- **WHEN** `difficultyKey` is not present in the game's `difficultyLevels`
- **THEN** the response is `404 Not Found` with message `Difficulty '<key>' not found for game '<slug>'`

#### Scenario: Game-specific bootstrap for life-game
- **WHEN** the slug is `life-game`
- **THEN** `lifePuzzleId` is the adapter-returned puzzle id and `metadata` is bootstrapped with `targetRegionIds`, `correctRegionIds: []`, `errorCount: 0`, `boundary`, `width`, `height`, `puzzleId`
- **AND** the response also includes `targetRegionIds`, `boundary`, `width`, `height`

#### Scenario: Game-specific bootstrap for precise-character-building
- **WHEN** the slug is `precise-character-building`
- **THEN** `pcbPuzzleId` is set and metadata is bootstrapped with `currentRoundIndex: 0`, `currentPosition: null`, `litCellIndices: []`, `disabledRadicalKeys: []`, `errorCount: 0`, `litResults: []`, `puzzleId`
- **AND** the response includes `state`, `boardSize`, `cells`, `radicalPool`, `config` (with `adjacencyMode: 'ORTHOGONAL_4'`)

### Requirement: Start-playing resets the timing baseline

The system SHALL provide a `start-playing` endpoint that resets `startedAt` to "now" so the authoritative duration begins after the client-side countdown.

#### Scenario: Resetting startedAt
- **WHEN** `POST /games/:slug/attempts/:attemptId/start-playing` is called for an attempt in `STARTED` status that has not timed out
- **THEN** `GameAttempt.startedAt` is updated to the current server time
- **AND** the response is `{ startedAt }` (ISO string)

#### Scenario: Already-finished attempt
- **WHEN** the attempt's status is not `STARTED`
- **THEN** the response is `409 Conflict` with message `Attempt already finished`

#### Scenario: Timed-out attempt
- **WHEN** the attempt has exceeded `getGameMaxDurationMs(slug, difficultyKey)` since `startedAt`
- **THEN** the attempt is updated to `status='INVALID'`, `invalidReason='TIMEOUT'`, `completedAt=now`
- **AND** the response is `{ attemptId, status: 'INVALID', reason: 'TIMEOUT' }`

### Requirement: Finish attempt is server-authoritative

The system SHALL validate every finish via the game's adapter, compute server-side duration, and only on `valid=true` mark the attempt `COMPLETED`, persist metrics, and update leaderboards.

#### Scenario: Successful finish
- **WHEN** `POST /games/:slug/attempts/:attemptId/finish` is called for the owner with a payload accepted by the adapter
- **THEN** the adapter returns `valid=true` plus `finalState`, `moveTrace`, `metrics`, `rankValue`
- **AND** the attempt is updated to `status='COMPLETED'`, `completedAt=now`, with `finalState`, `moveTrace`, `metrics`, `rankValue`
- **AND** `LeaderboardsService.recordAttemptResult` is invoked
- **AND** the response is `{ attemptId, status: 'COMPLETED', metrics, leaderboardUpdated, personalBest }`

#### Scenario: Invalid finish
- **WHEN** the adapter returns `valid=false` with an `invalidReason`
- **THEN** the attempt is updated to `status='INVALID'`, `invalidReason=<reason>`, `completedAt=now`
- **AND** no leaderboard entry is created or updated
- **AND** the response is `{ attemptId, status: 'INVALID', reason }`

#### Scenario: Already-finished attempt
- **WHEN** the attempt's status is not `STARTED`
- **THEN** the response is `409 Conflict` with message `Attempt already finished`

#### Scenario: Generic finish blocked for life-game
- **WHEN** the slug is `life-game` and `POST /games/life-game/attempts/:attemptId/finish` is called
- **THEN** the response is `400 Bad Request` directing the client to the region-submission endpoint

#### Scenario: Generic finish blocked for PCB
- **WHEN** the slug is `precise-character-building`
- **THEN** the response is `400 Bad Request` directing the client to the round-submission endpoint

### Requirement: Abandon attempt

The system SHALL allow the owner to mark a still-running attempt as `ABANDONED`. Game-specific endpoints handle life-game and PCB.

#### Scenario: Generic abandon
- **WHEN** `POST /games/:slug/attempts/:attemptId/abandon` is called for an owned attempt in `STARTED` status (slug other than `life-game` / `precise-character-building`)
- **THEN** `status='ABANDONED'`, `completedAt=now`
- **AND** the response is `{ success: true }`
- **AND** no leaderboard entry is updated

#### Scenario: Already-finished abandon
- **WHEN** the attempt's status is not `STARTED`
- **THEN** the response is `409 Conflict`

#### Scenario: Generic abandon blocked for life-game / PCB
- **WHEN** the slug is `life-game` or `precise-character-building` and the generic abandon endpoint is hit
- **THEN** the response is `400 Bad Request` directing to the game-specific abandon route

### Requirement: Server-authoritative timeout enforcement

The system SHALL invalidate any `STARTED` attempt that has exceeded its per-game max duration whenever the attempt is touched, and SHALL expose a dedicated timeout endpoint clients can call when their local timer expires.

#### Scenario: Implicit timeout on touch
- **WHEN** any attempt-mutating endpoint observes `now - startedAt >= maxDurationMs` for an attempt in `STARTED`
- **THEN** the attempt is updated to `status='INVALID'`, `invalidReason='TIMEOUT'`, `completedAt=now` before continuing or rejecting

#### Scenario: Explicit timeout
- **WHEN** `POST /games/:slug/attempts/:attemptId/timeout` is called and the attempt has indeed timed out
- **THEN** the attempt is set to `INVALID/TIMEOUT` and the response is `{ success: true, status: 'INVALID', reason: 'TIMEOUT' }`

#### Scenario: Premature timeout
- **WHEN** the explicit timeout endpoint is called but `now - startedAt < maxDurationMs`
- **THEN** the response is `400 Bad Request` with message `Attempt has not reached timeout yet`

#### Scenario: Idempotent timeout
- **WHEN** the explicit timeout endpoint is called for an attempt already in `INVALID/TIMEOUT`
- **THEN** the response is `{ success: true, status: 'INVALID', reason: 'TIMEOUT' }` without further mutation

### Requirement: Game adapter contract

The system SHALL require every per-game implementation to implement `GameAdapter`:

```ts
interface GameAdapter {
  slug: string;
  startAttempt(input: { userId; gameId; difficultyKey })
    : Promise<{ seed; initialState; metrics? }>;
  finishAttempt(input: { attempt: { id; seed; initialState; difficultyKey; startedAt }, payload, completedAt })
    : Promise<{ valid; invalidReason?; finalState?; moveTrace?; metrics?; rankValue? }>;
}
```

#### Scenario: Adapter slug uniqueness
- **WHEN** adapters are registered in `GamesService`
- **THEN** each adapter occupies its own slug entry; collisions are not expected

#### Scenario: Adapter as the only finishing authority
- **WHEN** the generic finish endpoint runs
- **THEN** the only path to `COMPLETED` is `adapter.finishAttempt({...}).valid === true`; the API never accepts client-supplied metrics directly without adapter validation

### Requirement: Attempt persistence shape

The system SHALL persist attempts with structured columns plus JSONB extension points.

#### Scenario: Attempt row fields
- **WHEN** an attempt is created
- **THEN** the row contains `id`, `userId`, `gameId`, `difficultyKey`, `status`, `seed`, `initialState` (JSON), `metrics` (JSON, default `{}`), `metadata` (JSON, default `{}`), and `startedAt`
- **AND** on completion, `finalState`, `moveTrace`, `completedAt`, `rankValue` are populated as appropriate
- **AND** `metrics.durationMs` reflects the server-computed duration

#### Scenario: Indexed access
- **WHEN** querying attempts for leaderboard updates and player history
- **THEN** the indices `(userId, gameId, difficultyKey, status)` and `(gameId, difficultyKey, status, rankValue)` are used
