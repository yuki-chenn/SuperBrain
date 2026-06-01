# challenges Capability (delta for change `redesign-leaderboard-pipeline`)

## MODIFIED Requirements

### Requirement: Finish runs adapter and CAS-transitions to COMPLETED

`POST /api/challenges/:id/finish` SHALL CAS `PLAYING→SUBMITTING`, invoke the registered `GameRuntimeAdapter.finishAttempt`, persist `AttemptValidationReport`, then CAS `SUBMITTING→COMPLETED`. When the attempt becomes `COMPLETED` with `scoreEligibility = ELIGIBLE`, the same transaction SHALL also write applicable `ScoreRecord` rows and upsert `LeaderboardBest` via `ScoreRecordingService.recordScores`. The response SHALL include a `leaderboards` array describing each board the score was recorded into. On adapter failure (`passed=false`) the system SHALL still transition to `COMPLETED` with `validationStatus='INVALID', scoreEligibility='NOT_ELIGIBLE'` and SHALL NOT record any score. Catastrophic adapter errors (thrown exception) SHALL CAS to `INVALIDATED` and emit an `ERROR` audit row without recording scores.

#### Scenario: Successful finish records scores
- **WHEN** the SPA POSTs finish with a valid finalState on an eligible board
- **THEN** the response is `{ accepted: true, status: 'COMPLETED', result: { success: true, score, durationMs }, resultPath, leaderboards: [{ leaderboardSlug, recorded: true, currentRank }] }`
- **AND** at least one `ScoreRecord` row exists for the attempt
- **AND** the user's `LeaderboardBest` for the matching period exists or has been updated

#### Scenario: Adapter rejection records no score
- **WHEN** the adapter returns `{ passed: false, antiCheatFlags: ['out-of-bounds'] }`
- **THEN** the attempt completes with `validationStatus='INVALID', scoreEligibility='NOT_ELIGIBLE'`
- **AND** no `ScoreRecord` rows are inserted
- **AND** the response's `leaderboards` array is empty

#### Scenario: Replay finish is idempotent
- **GIVEN** the attempt is `COMPLETED` with scores already recorded
- **WHEN** the SPA POSTs finish again
- **THEN** the API returns the same response body without re-running the adapter
- **AND** the `ScoreRecord` count for the attempt does not change
