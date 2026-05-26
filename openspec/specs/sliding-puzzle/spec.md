# sliding-puzzle Specification

## Purpose

Sliding puzzle (数字华容道) game module. The user moves numbered tiles on an N×N board to restore ascending order with the empty cell at the bottom-right. Initial state is generated server-side from a seed; the server is the only validator of submitted move traces. Three difficulties (3×3 / 4×4 / 5×5) share the same engine, differing only in size, scramble depth, max duration, and move-trace cap.

## Architecture Notes

- Game slug: `sliding-puzzle`. Adapter: `SlidingPuzzleAdapter`.
- Engine: `@brain-games/game-engine` exports `generateSlidingPuzzleInitialState({ size, seed, scrambleMoves })` and `validateSlidingPuzzleAttempt({ initialState, moveTrace, finalState, size })`.
- Difficulty config (from `@brain-games/shared/SLIDING_PUZZLE_DIFFICULTIES`):
  - `easy`: size 3, scrambleMoves 60, maxDurationMs 5 min
  - `normal`: size 4, scrambleMoves 160, maxDurationMs 8 min
  - `hard`: size 5, scrambleMoves 300, maxDurationMs 12 min
- Move-trace cap (`MAX_MOVES_LIMIT`): 2 000 / 10 000 / 30 000 for size 3 / 4 / 5.
- Min duration guard: `MIN_DURATION_MS` (anti-bot: implausibly fast finishes are rejected as `SUSPICIOUS_DURATION`).
- Lifecycle reuses the generic attempts capability (no game-specific endpoints): start → start-playing → finish/abandon/timeout under `/games/sliding-puzzle/attempts/...`.

## Requirements

### Requirement: Server-side puzzle generation

The system SHALL generate every sliding-puzzle attempt's initial state on the server from a fresh per-attempt seed and difficulty parameters; clients never produce or modify the initial board.

#### Scenario: New attempt generates fresh state
- **WHEN** `SlidingPuzzleAdapter.startAttempt` is invoked with a known difficulty
- **THEN** a UUID-v4 `seed` is generated
- **AND** `generateSlidingPuzzleInitialState({ size, seed, scrambleMoves })` produces the initial state
- **AND** the persisted `GameAttempt.initialState` is `{ size, board: number[] }`

#### Scenario: Unknown difficulty
- **WHEN** the adapter is called with a `difficultyKey` not in `SLIDING_PUZZLE_DIFFICULTIES`
- **THEN** the call throws and no attempt is created

### Requirement: Server-side replay validation on finish

The system SHALL replay the submitted move trace against the persisted initial state and confirm the resulting board exactly matches the submitted final state, accepting the attempt only if the engine returns `valid=true`.

#### Scenario: Successful finish
- **WHEN** the client submits `{ moveTrace, finalState }` matching `FinishAttemptRequestSchema` for an in-flight attempt
- **THEN** `validateSlidingPuzzleAttempt({ initialState, moveTrace, finalState, size })` returns `valid=true`
- **AND** the adapter returns `{ valid: true, finalState, moveTrace, metrics: { durationMs, moves: moveTrace.length, size }, rankValue: durationMs }`
- **AND** the attempt is marked `COMPLETED` per the generic attempts capability

#### Scenario: Replay mismatch
- **WHEN** replay does not yield the submitted final state, or the move trace contains an illegal move, or the trace exceeds `MAX_MOVES_LIMIT[size]`
- **THEN** the adapter returns `{ valid: false, invalidReason: <engine-reason> }`
- **AND** the attempt is marked `INVALID` with that reason

#### Scenario: Solved-state final
- **WHEN** the engine accepts the trace
- **THEN** the final board is in the solved configuration (`1..N²-1` followed by 0)

### Requirement: Duration guards reject implausible and timed-out finishes

The system SHALL reject finishes whose server-computed duration is below `MIN_DURATION_MS` or above the difficulty's `maxDurationMs`.

#### Scenario: Suspiciously fast finish
- **WHEN** `completedAt - attempt.startedAt < MIN_DURATION_MS`
- **THEN** the adapter returns `{ valid: false, invalidReason: 'SUSPICIOUS_DURATION' }`

#### Scenario: Over time limit on finish
- **WHEN** `completedAt - attempt.startedAt > difficulty.maxDurationMs`
- **THEN** the adapter returns `{ valid: false, invalidReason: 'TIMEOUT' }`

### Requirement: Difficulty parameters are authoritative server-side

The system SHALL look up `size`, `scrambleMoves`, and `maxDurationMs` from the central `SLIDING_PUZZLE_DIFFICULTIES` constant; clients do not supply these values.

#### Scenario: Difficulty resolution
- **WHEN** start or finish runs
- **THEN** the difficulty entry is resolved by `key` from `SLIDING_PUZZLE_DIFFICULTIES`
- **AND** if no entry matches, finish returns `{ valid: false, invalidReason: 'INVALID_DIFFICULTY' }`

### Requirement: Move-trace cap

The system SHALL enforce that submitted move traces do not exceed `MAX_MOVES_LIMIT[size]` (2 000 / 10 000 / 30 000 for 3 / 4 / 5).

#### Scenario: Trace too long
- **WHEN** `moveTrace.length > MAX_MOVES_LIMIT[size]`
- **THEN** the validator rejects the attempt and the adapter returns `{ valid: false, invalidReason }`

### Requirement: Ranking and metrics

The system SHALL rank sliding-puzzle attempts by `durationMs` (ascending = faster is better), with `moves` available as a tie-breaker via `LeaderboardDefinition`.

#### Scenario: Metrics persisted
- **WHEN** a finish is accepted
- **THEN** `attempt.metrics` contains `{ durationMs, moves, size }`
- **AND** `attempt.rankValue = durationMs`

#### Scenario: Per-difficulty leaderboards
- **WHEN** the catalog is seeded
- **THEN** sliding-puzzle has best-time leaderboards for each of `easy/normal/hard` keyed on `rankMetric='durationMs'`, `rankDirection='ASC'`

### Requirement: Lifecycle uses generic attempts endpoints

The system SHALL handle sliding-puzzle's start, finish, abandon, and timeout exclusively through the generic `/games/sliding-puzzle/attempts/...` endpoints; no game-specific submission endpoint exists.

#### Scenario: Standard lifecycle
- **WHEN** the client interacts with the game
- **THEN** it calls `POST /games/sliding-puzzle/attempts/start`, then `POST /.../start-playing` after the countdown, then `POST /.../:id/finish` (or `/abandon` / `/timeout`)
