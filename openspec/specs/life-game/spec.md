# life-game Specification

## Purpose

Conway's Game of Life puzzle module ("生命游戏"). The user observes a 120×15 wrap-around board with a known initial cell distribution that, under B3/S23 rules, eventually reaches a stable state. A subset of regions is marked as targets; the user must, for each target region, identify which local cells are alive at that stable state. Correct submissions accumulate; the attempt is `COMPLETED` when every target region is solved correctly. Per-region submission allows partial progress and bounded error budget.

## Architecture Notes

- Game slug: `life-game`. Adapter: `LifeGameAdapter`. Service: `LifeGameService` (per-region submissions); the generic `finish` endpoint is intentionally rejected.
- Storage:
  - `LifePuzzle` rows hold the seeded boards: `width=120`, `height=15`, `boundary` (`{ wrapX, wrapY }`), `initialState`, `stableState`, `targetRegionIds`, `targetAnswers` (each `{ regionId, aliveCells: [{x,y}] }` in region-local coordinates), `stableGeneration`.
  - `GameAttempt.lifePuzzleId` links to the puzzle. `GameAttempt.metadata` carries `{ targetRegionIds, correctRegionIds, errorCount, boundary, width, height, puzzleId }`.
  - Each region submission is persisted in `LifeRegionSubmission` (`attemptId`, `userId`, `regionId`, `aliveCells`, `correct`, `submittedAt`).
- Difficulty (from `LIFE_GAME_DIFFICULTIES`):
  - `easy`: 1 target region, `maxDurationMs` 8 min
  - `normal`: 2 target regions, 12 min
  - `hard`: 3 target regions, 16 min
- Engine (`@brain-games/game-engine`): `validateLocalCells({ cells, regionWidth, regionHeight })`, `isSameLocalCellSet(a, b)`, `getRegionById`. Constant `LIFE_MAX_ERROR_COUNT = 100`.
- Endpoints: under `/games/life-game/attempts`: `GET /:id`, `POST /:id/regions/:regionId/submit`, `GET /:id/answers` (admin+dev-only), `POST /:id/abandon`. Generic `finish` and `abandon` on `/games/life-game/attempts/...` are blocked with `400`.

## Requirements

### Requirement: Region-scoped submission flow

The system SHALL accept submissions one region at a time and only mark the attempt `COMPLETED` once every target region is correct.

#### Scenario: Submitting a region
- **WHEN** an authenticated owner calls `POST /games/life-game/attempts/:attemptId/regions/:regionId/submit` with `{ aliveCells: [{x,y}] }` matching `SubmitLifeRegionRequestSchema`
- **THEN** the system validates ownership, attempt status, timeout, region eligibility, cell validity, and compares the submitted set with the puzzle's stored answer
- **AND** a `LifeRegionSubmission` row is recorded with `correct = isSameLocalCellSet(submitted, expected)`

#### Scenario: Region not in target set
- **WHEN** `regionId` is not in `metadata.targetRegionIds`
- **THEN** the response is `400 Bad Request` with message `Region is not a target region`

#### Scenario: Region already correctly submitted
- **WHEN** `regionId` is already in `metadata.correctRegionIds`
- **THEN** the response is `409 Conflict` with message `Region already completed`

#### Scenario: Invalid local cells
- **WHEN** `validateLocalCells` rejects the submitted cells (out of region bounds, duplicates, etc.)
- **THEN** the response is `400 Bad Request` with message `Invalid cells: <reason>` and no attempt fields are mutated

### Requirement: Correct submission progresses the attempt

The system SHALL append correct region IDs to the attempt's `correctRegionIds` and check completion after each correct submission.

#### Scenario: Correct partial submission
- **WHEN** the submission matches the answer and not all target regions are yet solved
- **THEN** `metadata.correctRegionIds` is updated to include `regionId` and the response includes `{ regionId, correct: true, errorCount, correctRegionIds, attemptCompleted: false }`

#### Scenario: Correct final submission completes the attempt
- **WHEN** the submission is correct and `correctRegionIds.length === targetRegionIds.length` after appending
- **THEN** `attempt.status = 'COMPLETED'`, `completedAt = now`, `metrics = { durationMs, errorCount, targetRegionCount }`, `rankValue = durationMs`
- **AND** `LeaderboardsService.recordAttemptResult` is called
- **AND** the response includes `attemptCompleted: true` and `result: { durationMs, errorCount, targetRegionCount, personalBest }`

### Requirement: Bounded error budget

The system SHALL count incorrect region submissions and invalidate the attempt once the count exceeds `LIFE_MAX_ERROR_COUNT` (100).

#### Scenario: Wrong submission below limit
- **WHEN** the submitted cell set does not match the answer and `errorCount + 1 ≤ LIFE_MAX_ERROR_COUNT`
- **THEN** `metadata.errorCount` is incremented and the response includes `{ correct: false, errorCount: new, ... }`
- **AND** the attempt remains in `STARTED`

#### Scenario: Error count exceeds limit
- **WHEN** an incorrect submission would push `errorCount` above 100
- **THEN** the attempt is set to `status='INVALID'`, `invalidReason='TOO_MANY_ERRORS'`, `completedAt=now`
- **AND** the request fails with `400 Bad Request` and message `Too many errors`

### Requirement: Server-authoritative timeout

The system SHALL invalidate any submission attempt past `getLifeGameMaxDurationMs(difficultyKey)` and SHALL invalidate-on-read for `GET /:id` and the dedicated timeout endpoint.

#### Scenario: Timeout on submit
- **WHEN** a region submission arrives after the max duration has elapsed since `startedAt`
- **THEN** the attempt is set to `INVALID/TIMEOUT` and the request fails with `409 Conflict` (`Attempt timed out`)

#### Scenario: Timeout on detail fetch
- **WHEN** `GET /games/life-game/attempts/:attemptId` is called for a `STARTED` attempt that has timed out
- **THEN** the attempt is set to `INVALID/TIMEOUT` and the returned payload reflects the new status

### Requirement: Attempt detail endpoint

The system SHALL provide an authenticated endpoint returning the full attempt context required to render or resume the puzzle UI.

#### Scenario: Detail content
- **WHEN** the owner calls `GET /games/life-game/attempts/:attemptId`
- **THEN** the response includes `attemptId`, `status`, `difficultyKey`, `maxDurationMs`, `width`, `height`, `boundary`, `initialState`, `targetRegionIds`, `correctRegionIds`, `errorCount`, `startedAt`, `completedAt?`, `submissions[]` (`regionId`, `submittedAt`, `correct`), and `metrics?` (only if `COMPLETED`)

### Requirement: Admin-only answer disclosure in development

The system SHALL only return target answers for an attempt to admin users in non-production environments.

#### Scenario: Authorized answer fetch
- **WHEN** `GET /games/life-game/attempts/:attemptId/answers` is called with `role='ADMIN'` and `process.env.NODE_ENV !== 'production'`
- **THEN** the response is `{ answers: [{ regionId, aliveCells }] }` for the puzzle's targets

#### Scenario: Unauthorized answer fetch
- **WHEN** the caller is not an admin, or `NODE_ENV === 'production'`
- **THEN** the response is `403 Forbidden`

### Requirement: Game-specific abandon route

The system SHALL provide a dedicated abandon route under `/games/life-game/attempts/:attemptId/abandon` and reject the generic `/games/:slug/attempts/:attemptId/abandon` for `slug='life-game'`.

#### Scenario: Game-specific abandon
- **WHEN** the owner calls `POST /games/life-game/attempts/:attemptId/abandon` for a `STARTED` attempt
- **THEN** the attempt becomes `ABANDONED`, `completedAt=now`, response `{ success: true }`

#### Scenario: Generic abandon blocked
- **WHEN** the generic `/games/life-game/attempts/:attemptId/abandon` is called
- **THEN** the response is `400 Bad Request` directing the client to the game-specific route

### Requirement: Generic finish blocked

The system SHALL reject `POST /games/life-game/attempts/:attemptId/finish` because life-game completion is implicit (last correct region submission).

#### Scenario: Generic finish blocked
- **WHEN** the client calls the generic finish endpoint
- **THEN** the response is `400 Bad Request` with a message instructing the client to use the region-submission endpoint

### Requirement: Puzzle bank and difficulty mapping

The system SHALL precompute a pool of valid `LifePuzzle` rows per difficulty during seeding, each carrying a verified stable state, target region set, and per-region answers.

#### Scenario: Seeded puzzle bank
- **WHEN** `pnpm db:seed` runs
- **THEN** at least 3 puzzles per difficulty (`easy/normal/hard`) are generated via `generateValidLifePuzzle`
- **AND** each puzzle has `targetRegionIds.length === difficulty.targetRegionCount`, `width=120`, `height=15`, the canonical `boundary`, and `status='ACTIVE'`
