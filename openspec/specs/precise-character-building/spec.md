# precise-character-building Specification

## Purpose

"精准造字" puzzle module. The user is presented with a 6×6 board of root characters (`字根`) and a small pool of radicals (`部首`). Each round the user picks 4 radicals + 4 board cells; the cells must form a contiguous orthogonal path starting adjacent to the previous round's last cell, the chosen radicals must not be on cooldown, and each radical+root pair must form a valid Chinese character drawn from the seeded combination dictionary. Lighting all 36 cells finishes the attempt. A bounded error budget and per-attempt timeout invalidate runaway sessions.

## Architecture Notes

- Game slug: `precise-character-building`. Adapter: `PreciseCharacterBuildingAdapter`. Service: `PreciseCharacterGameService`. Controller path: `/games/precise-character-building/attempts`.
- Storage:
  - `PreciseCharacterPuzzle`: `boardSize=6`, `radicalPool` (seeded `Radical[]`), `cells` (36 entries: `index`, `row`, `col`, `rootKey`, `rootGlyph`), `solutionRounds`, `config { picksPerRound, adjacencyMode, cooldownRounds, allowRadicalRepeatInRound }`.
  - `CharacterRadical`, `CharacterRoot`, `CharacterCombination` form the dictionary; each combination has a `difficulty` tag (`easy/normal/hard`) and is enabled by default.
  - `GameAttempt.pcbPuzzleId` links to the puzzle. Mutable per-attempt state is held in `attempt.metadata`: `currentRoundIndex`, `currentPosition`, `litCellIndices`, `disabledRadicalKeys`, `errorCount`, `litResults`, `puzzleId`.
  - `PreciseCharacterRoundSubmission` records every round attempt with `correct` flag and (on failure) `errorReason`.
- Difficulty (`PRECISE_CHARACTER_BUILDING_DIFFICULTIES`):
  - `easy`: 4 picks, pool 6, structures `LEFT_RIGHT/TOP_BOTTOM`, complexity LOW, `maxDurationMs` 8 min
  - `normal` (recommended): adds `SEMI_SURROUND`, complexity MEDIUM, 12 min
  - `hard`: adds `SURROUND`, complexity HIGH, 16 min
- Combination eligibility per difficulty: `easy` allows only `easy`; `normal` allows `easy + normal`; `hard` allows `easy + normal + hard`.
- Adjacency is forced to `ORTHOGONAL_4` by the controller/service regardless of stored config.
- Engine helpers: `validateRoundPath`, `isRadicalAvailable`, `indexToCoord`. Constant `PCB_MAX_ERROR_COUNT = 100`.

## Requirements

### Requirement: Round-based submission flow

The system SHALL accept submissions one round at a time consisting of exactly `picksPerRound` radicals + the same number of board cells, advance state on success, and complete the attempt when all 36 cells are lit.

#### Scenario: Round payload shape
- **WHEN** `POST /games/precise-character-building/attempts/:attemptId/rounds/submit` is called with `{ selectedRadicalKeys, selectedCellIndices }` validated by `SubmitPCBRoundRequestSchema`
- **THEN** the system requires both arrays to have length `picksPerRound`; otherwise responds `400 Bad Request` (`Must select exactly N radicals/cells`)

#### Scenario: Successful round
- **WHEN** all radicals are in the pool and not on cooldown, all cells are within `[0,36)`, none are already lit, no duplicate cells in the round, the path is valid via `validateRoundPath`, and every `(radical, root)` pair maps to an enabled `CharacterCombination` whose `difficulty` is in the allowed set for the attempt's difficulty
- **THEN** a `PreciseCharacterRoundSubmission` row is created with `correct=true`, the four `resultChars`, and the matched `combinationIds`
- **AND** `metadata` is advanced: `currentRoundIndex += 1`, `currentPosition = indexToCoord(last cell)`, `litCellIndices = old ∪ new`, `disabledRadicalKeys = unique(used radicals this round)`, `litResults` appends `{ cellIndex, radicalKey, resultChar }` for each pick
- **AND** the response includes `correct: true`, the new `state`, `roundResult: { selectedCellIndices, selectedRadicalKeys, resultChars }`, and `attemptCompleted` flag

#### Scenario: Attempt completes when all cells lit
- **WHEN** after a successful round `litCellIndices.length >= 36`
- **THEN** the attempt becomes `COMPLETED`, `completedAt=now`, `metrics = { durationMs, errorCount, rounds: newRoundIndex, litCells }`, `rankValue = durationMs`
- **AND** `LeaderboardsService.recordAttemptResult` is called
- **AND** the response includes `attemptCompleted: true` and `result: { durationMs, errorCount, rounds, litCells, personalBest }`

### Requirement: Round failure modes are enumerated and counted

The system SHALL classify any rejected round into one of `RADICAL_DISABLED`, `INVALID_PATH`, `CELL_ALREADY_LIT`, `INVALID_COMBINATION`; persist a failure submission row; increment `errorCount`; and surface the `errorReason` to the client.

#### Scenario: Radical not in pool or on cooldown
- **WHEN** any selected radical is not in the puzzle's `radicalPool` keys, or is in `disabledRadicalKeys`
- **THEN** failure is recorded with `errorReason='RADICAL_DISABLED'`

#### Scenario: Cell out of range or already lit
- **WHEN** any cell index is outside `[0,36)`, or already lit
- **THEN** failure is recorded with `errorReason='INVALID_PATH'` (out of range) or `'CELL_ALREADY_LIT'` (already lit, including via path validator)

#### Scenario: Duplicate cells within the round
- **WHEN** the round picks the same cell more than once
- **THEN** failure is recorded with `errorReason='INVALID_PATH'`

#### Scenario: Path not contiguous / not orthogonally adjacent
- **WHEN** `validateRoundPath({ currentPosition, selectedCellIndices, litCellIndices, adjacencyMode: 'ORTHOGONAL_4' })` returns invalid
- **THEN** failure is recorded with `errorReason='INVALID_PATH'` (or `'CELL_ALREADY_LIT'` if that is the validator's specific reason)

#### Scenario: Radical+root pair not a valid combination
- **WHEN** for any of the four picks the database has no enabled `CharacterCombination` matching the `(radicalKey, rootKey)` whose `difficulty` falls in the allowed set
- **THEN** failure is recorded with `errorReason='INVALID_COMBINATION'`

#### Scenario: Failure response shape
- **WHEN** any of the above failures occurs
- **THEN** the response is `{ correct: false, errorCount: new, state: { currentRoundIndex, currentPosition, litCellIndices, disabledRadicalKeys }, attemptCompleted: false, errorReason }`
- **AND** `metadata.errorCount` is incremented (without resetting other state)

### Requirement: Bounded error budget

The system SHALL invalidate the attempt with `TOO_MANY_ERRORS` when `errorCount` exceeds `PCB_MAX_ERROR_COUNT` (100).

#### Scenario: Error count exceeds limit
- **WHEN** an incorrect submission would push `errorCount` above 100
- **THEN** the attempt is set to `status='INVALID'`, `invalidReason='TOO_MANY_ERRORS'`, `completedAt=now`
- **AND** the request fails with `400 Bad Request` (`Too many errors`)

### Requirement: Server-authoritative timeout

The system SHALL invalidate any round submission past `getPCBMaxDurationMs(difficultyKey)` and apply the same invalidate-on-read semantic to the detail endpoint.

#### Scenario: Timeout on submit
- **WHEN** a round submission arrives after `maxDurationMs` has elapsed since `startedAt`
- **THEN** the attempt is set to `INVALID/TIMEOUT` and the request fails with `409 Conflict` (`Attempt timed out`)

#### Scenario: Timeout on detail
- **WHEN** `GET /games/precise-character-building/attempts/:attemptId` is called for a `STARTED` attempt that has timed out
- **THEN** the attempt is invalidated and the response reflects the new status

### Requirement: Attempt detail endpoint

The system SHALL provide an authenticated endpoint returning the full attempt context required to render or resume the puzzle UI.

#### Scenario: Detail content
- **WHEN** the owner calls `GET /games/precise-character-building/attempts/:attemptId`
- **THEN** the response includes `attemptId`, `status`, `difficultyKey`, `maxDurationMs`, `boardSize`, `cells`, `radicalPool`, `config` (with `adjacencyMode='ORTHOGONAL_4'`), `state` (`currentRoundIndex`, `currentPosition`, `litCellIndices`, `disabledRadicalKeys`, `errorCount`), `litResults`, `startedAt`, `completedAt?`, `metrics?` (only if `COMPLETED`)

### Requirement: Reset preserves attempt identity

The system SHALL allow the owner to reset an in-flight attempt to its initial state (round 0, no lit cells, no disabled radicals, no errors) without creating a new attempt or affecting the timer baseline.

#### Scenario: Successful reset
- **WHEN** `POST /games/precise-character-building/attempts/:attemptId/reset` is called for a `STARTED` attempt
- **THEN** all `PreciseCharacterRoundSubmission` rows for the attempt are deleted
- **AND** `attempt` fields `completedAt`, `invalidReason`, `finalState`, `moveTrace`, `rankValue` are nulled and `metrics={}`
- **AND** `metadata` is reset to `currentRoundIndex=0`, `currentPosition=null`, `litCellIndices=[]`, `disabledRadicalKeys=[]`, `errorCount=0`, `litResults=[]`
- **AND** the response is `{ success: true, startedAt, state }` where `startedAt` is the original (unchanged) timer baseline

#### Scenario: Reset on finished attempt
- **WHEN** the attempt's status is not `STARTED`
- **THEN** the response is `409 Conflict`

### Requirement: Game-specific abandon route

The system SHALL provide a dedicated abandon route under `/games/precise-character-building/attempts/:attemptId/abandon` and reject the generic `/games/:slug/attempts/:attemptId/abandon` for `slug='precise-character-building'`.

#### Scenario: Game-specific abandon
- **WHEN** the owner calls the dedicated abandon endpoint for a `STARTED` attempt
- **THEN** the attempt becomes `ABANDONED`, `completedAt=now`, response `{ success: true }`

#### Scenario: Generic abandon blocked
- **WHEN** the generic abandon endpoint is called for `slug='precise-character-building'`
- **THEN** the response is `400 Bad Request`

### Requirement: Generic finish blocked

The system SHALL reject `POST /games/precise-character-building/attempts/:attemptId/finish` because completion is implicit on the round that lights the 36th cell.

#### Scenario: Generic finish blocked
- **WHEN** the client calls the generic finish endpoint
- **THEN** the response is `400 Bad Request` directing the client to the round-submission endpoint

### Requirement: Admin-only answer disclosure in development

The system SHALL only return solution rounds for an attempt to admin users in non-production environments.

#### Scenario: Authorized answers fetch
- **WHEN** `GET /games/precise-character-building/attempts/:attemptId/answers` is called with `role='ADMIN'` and `NODE_ENV !== 'production'`
- **THEN** the response is `{ solutionRounds }` from the puzzle row

#### Scenario: Unauthorized answers fetch
- **WHEN** caller is not admin, or `NODE_ENV === 'production'`
- **THEN** the response is `403 Forbidden`

### Requirement: Combination dictionary scoped by difficulty

The system SHALL look up `(radical, root)` combinations from `CharacterCombination` filtered to `enabled=true` and to the difficulties allowed for the attempt's difficulty.

#### Scenario: Difficulty allow-lists
- **WHEN** the attempt's `difficultyKey` is `easy`
- **THEN** allowed combination difficulties are `['easy']`
- **WHEN** the attempt's `difficultyKey` is `normal`
- **THEN** allowed combination difficulties are `['easy', 'normal']`
- **WHEN** the attempt's `difficultyKey` is `hard`
- **THEN** allowed combination difficulties are `['easy', 'normal', 'hard']`

### Requirement: Puzzle bank and seed dictionary

The system SHALL precompute a pool of valid `PreciseCharacterPuzzle` rows per difficulty (each with at least one `solutionRounds` plan) and seed the radical/root/combination dictionary on which validation depends.

#### Scenario: Seeded puzzle bank and dictionary
- **WHEN** `pnpm db:seed` runs
- **THEN** the radical, root, and combination dictionaries are upserted from `RADICAL_DATA`, `ROOT_DATA`, `COMBO_DATA`
- **AND** at least 3 puzzles per difficulty (`easy/normal/hard`) are generated via `generatePCBPuzzle` and stored with `boardSize=6`, `status='ACTIVE'`, and the canonical `config { picksPerRound: 4, adjacencyMode: 'ORTHOGONAL_4', cooldownRounds: 1, allowRadicalRepeatInRound: true }`
