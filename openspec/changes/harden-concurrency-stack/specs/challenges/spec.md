# challenges Capability (delta for change `harden-concurrency-stack`)

## MODIFIED Requirements

### Requirement: Heartbeat enforces ownership and expiry

`POST /api/challenges/:id/heartbeat` SHALL verify the `playSessionId` matches the attempt's active runtime session. The system SHALL update `lastHeartbeatAt` on both `GameAttempt` and `AttemptRuntimeSession` AND SHALL upsert the attempt into the Redis sorted set `attempts-by-hb` with the current timestamp score. If `expiresAt < now` the system SHALL CAS the attempt to `TIMEOUT` and return `{ accepted: false, status: 'TIMEOUT' }`.

#### Scenario: Heartbeat dual-writes
- **WHEN** the SPA sends heartbeat
- **THEN** PG's `lastHeartbeatAt` updates
- **AND** Redis `ZSCORE attempts-by-hb <id>` returns the new timestamp

#### Scenario: Heartbeat after expiry triggers TIMEOUT
- **GIVEN** `attempt.expiresAt < now`
- **WHEN** the SPA sends heartbeat
- **THEN** the API CAS-transitions `PLAYING→TIMEOUT` and emits an audit row

### Requirement: Finish runs adapter and CAS-transitions to COMPLETED

`POST /api/challenges/:id/finish` SHALL CAS `PLAYING→SUBMITTING`, invoke the registered `GameRuntimeAdapter.finishAttempt`, persist `AttemptValidationReport`. If `validationReport.antiCheatFlags` is non-empty OR the challenge policy flags the attempt as suspicious, the system SHALL CAS to `REVIEW_REQUIRED` and create an `AdminReviewTask` instead of recording scores. Otherwise the system SHALL CAS `SUBMITTING→COMPLETED` AND call `ScoreRecordingService.recordScores` inside the same transaction. The transaction is wrapped by a Redis lock keyed `lock:attempt:<attemptId>` (TTL 5s) to reduce contention. Catastrophic adapter errors (thrown exception) SHALL CAS to `INVALIDATED` and emit an `ERROR` audit row.

#### Scenario: Suspicious finish routes to review
- **GIVEN** the adapter returned `{ passed: true, antiCheatFlags: ['out-of-bounds'] }`
- **WHEN** finish commits
- **THEN** the attempt is `REVIEW_REQUIRED`
- **AND** an `AdminReviewTask` exists
- **AND** no `ScoreRecord` is inserted

#### Scenario: Clean finish records scores (unchanged from Change 5)
- **WHEN** the adapter passes with no flags
- **THEN** the attempt becomes `COMPLETED` and scores are recorded

#### Scenario: Concurrent finish calls serialise via Redis lock
- **GIVEN** two requests POST finish for the same attemptId concurrently
- **WHEN** the lock service is healthy
- **THEN** one acquires the lock and completes; the other either returns the cached idempotent response (via IdempotencyInterceptor) or HTTP 409 `processing`
