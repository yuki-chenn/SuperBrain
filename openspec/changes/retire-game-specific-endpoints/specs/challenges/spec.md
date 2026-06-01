# challenges Capability (delta for change `retire-game-specific-endpoints`)

## MODIFIED Requirements

### Requirement: Finish runs adapter and CAS-transitions to COMPLETED

`POST /api/challenges/:id/finish` SHALL CAS `PLAYING→SUBMITTING`, invoke the registered `GameRuntimeAdapter.finishAttempt`, persist `AttemptValidationReport`. The adapter MAY aggregate prior `GameSubmission` rows (e.g. life-game tallies REGION submissions; PCB tallies ROUND submissions) as inputs to `finishAttempt`. If `validationReport.antiCheatFlags` is non-empty OR the challenge policy flags the attempt as suspicious, the system SHALL CAS to `REVIEW_REQUIRED` and create an `AdminReviewTask`. Otherwise the system SHALL CAS `SUBMITTING→COMPLETED` AND call `ScoreRecordingService.recordScores` inside the same transaction. The transaction is wrapped by a Redis lock keyed `lock:attempt:<attemptId>`. Catastrophic adapter errors SHALL CAS to `INVALIDATED` and emit an `ERROR` audit row.

#### Scenario: Finish aggregates prior submissions
- **GIVEN** 9 `GameSubmission` rows of `type='ROUND', validationPassed=true` for a PCB attempt
- **WHEN** the SPA POSTs `/finish`
- **THEN** `PreciseCharacterBuildingAdapter.finishAttempt` reads the submission rows, computes `durationMs` + `roundsCompleted`, returns `passed=true` with score
- **AND** the attempt becomes `COMPLETED` with scores recorded

#### Scenario: Finish without required submissions still runs adapter
- **GIVEN** a PCB attempt with 3 of 9 rounds completed
- **WHEN** the SPA POSTs `/finish` (early submit)
- **THEN** the adapter returns `passed=false` (incomplete)
- **AND** the attempt becomes `COMPLETED` with `validationStatus='INVALID'`; no score recorded
