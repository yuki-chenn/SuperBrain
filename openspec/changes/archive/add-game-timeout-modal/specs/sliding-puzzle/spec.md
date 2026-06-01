## ADDED Requirements

### Requirement: Play page surfaces a timeout modal when the attempt times out

The system SHALL render a dedicated timeout modal on the sliding-puzzle play page whenever the attempt's client status reaches `timeout`. The modal SHALL state that the time limit was reached and that the attempt is not counted toward the leaderboard, and SHALL offer Restart and Back-to-games actions.

#### Scenario: Timeout reached during play
- **WHEN** the player has an in-flight sliding-puzzle attempt and the elapsed playing time meets or exceeds the difficulty's `maxDurationMs`
- **THEN** the play page renders the `GameTimeoutModal` with the configured `maxDurationMs` displayed
- **AND** the modal's copy explicitly states the attempt is not counted on the leaderboard
- **AND** the `GameResultModal` (success modal) is not rendered for this attempt

#### Scenario: Server-detected timeout on submit
- **WHEN** a `finish` submission for sliding-puzzle returns `{ status: 'INVALID', reason: 'TIMEOUT' }`
- **THEN** the play page renders the same `GameTimeoutModal`

#### Scenario: Timeout modal restart
- **WHEN** the player clicks Restart in the timeout modal
- **THEN** the page resets to the difficulty-selection state and no leaderboard row was created for the timed-out attempt

#### Scenario: Timeout modal back-to-games
- **WHEN** the player clicks Back-to-games in the timeout modal
- **THEN** the page navigates to the games list and the underlying attempt remains `INVALID/TIMEOUT` server-side

### Requirement: Play page shows remaining-time countdown during play

The system SHALL display the remaining time (computed as `max(0, maxDurationMs - elapsedMs)`) in `mm:ss` format inside the sliding-puzzle play page HUD while the attempt is in the `playing` state, and SHALL apply a visual warning style when the remaining time is less than or equal to 30 seconds.

#### Scenario: Countdown visible while playing
- **WHEN** an attempt is in the `playing` state with a positive `maxDurationMs`
- **THEN** the HUD shows the remaining time in `mm:ss`
- **AND** the value monotonically decreases at the existing tick cadence

#### Scenario: Warning style at low remaining time
- **WHEN** the remaining time is at most 30 seconds
- **THEN** the countdown adopts the existing destructive (red) accent style

#### Scenario: Countdown hidden outside play
- **WHEN** the page state is `idle`, `loading`, `countdown` (pre-game), `submitted`, `abandoned`, or `timeout`
- **THEN** the countdown is not rendered

### Requirement: Single source of truth for timeout duration is documented

The system SHALL preserve `packages/shared/src/games/sliding-puzzle/config.ts` as the only place to change the difficulty `maxDurationMs`, and SHALL document this fact at the top of that file.

#### Scenario: Config edit updates both API and Web without code changes elsewhere
- **WHEN** a developer edits `maxDurationMs` for a difficulty in `packages/shared/src/games/sliding-puzzle/config.ts` and rebuilds shared
- **THEN** the API's `getSlidingPuzzleMaxDurationMs(key)` returns the new value
- **AND** the Web client's `startAttempt` response returns the new value
- **AND** the timeout modal trigger fires at the new threshold without any other source code change
