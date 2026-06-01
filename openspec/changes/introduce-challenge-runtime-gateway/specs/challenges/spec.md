# challenges Capability (delta for change `introduce-challenge-runtime-gateway`)

## ADDED Requirements

### Requirement: Challenge endpoints under /api/challenges

The system SHALL expose six endpoints under `/api/challenges`:
- `POST /api/challenges/start`
- `POST /api/challenges/:attemptId/claim`
- `POST /api/challenges/:attemptId/heartbeat`
- `POST /api/challenges/:attemptId/abandon`
- `POST /api/challenges/:attemptId/finish`
- `GET  /api/challenges/:attemptId/status`

All endpoints SHALL require an authenticated user (Change 2's `JwtAuthGuard`).

#### Scenario: Anonymous start rejected
- **WHEN** an unauthenticated client POSTs `/api/challenges/start`
- **THEN** the API returns HTTP 401

#### Scenario: Authenticated start succeeds
- **WHEN** an authenticated client POSTs `/api/challenges/start` with `{ gameSlug: 'sliding-puzzle', mode: 'RANKED', difficultyKey: 'easy', idempotencyKey: 'abc' }`
- **THEN** the API creates a `GameAttempt` with `status='CREATED'`
- **AND** creates an `AttemptRuntimeSession` with a fresh `playSessionId`
- **AND** returns `{ attemptId, entryToken, playSessionId, initialState, expiresAt, playPath }`

### Requirement: Start writes full version snapshot

On `POST /api/challenges/start` the system SHALL look up the ACTIVE `GameRuleSetVersion`, `GameDifficulty`, `GameContentPolicy`, `GameChallengePolicy` (and `PuzzleVersion` if `contentMode != GENERATED`) for the requested game/mode/difficulty and persist their IDs onto the `GameAttempt` row.

#### Scenario: GameAttempt carries version IDs
- **WHEN** start succeeds
- **THEN** the new `GameAttempt` row has non-null `ruleSetVersionId`, `difficultyId`, `contentPolicyId`, `challengePolicyId`
- **AND** for `contentMode='GENERATED'` games: non-null `seed` and `generatedContentHash`; `puzzleVersionId` is null
- **AND** for `contentMode='CURATED'` games: non-null `puzzleId` and `puzzleVersionId`

### Requirement: Start is idempotent per (userId, idempotencyKey)

Two requests with the same `userId` and `idempotencyKey` and identical payload hash SHALL return the same `attemptId`. A request with the same key but different payload SHALL return HTTP 409.

#### Scenario: Identical replay returns same attempt
- **GIVEN** a successful start returned `attemptId=A`
- **WHEN** the same user replays the same start payload with the same `idempotencyKey`
- **THEN** the API returns `attemptId=A` and the SAME `entryToken/playSessionId` issued the first time

#### Scenario: Conflicting payload rejected
- **WHEN** a user POSTs `/api/challenges/start` with `idempotencyKey='abc', difficultyKey='easy'`
- **AND** then re-POSTs with `idempotencyKey='abc', difficultyKey='hard'`
- **THEN** the second call returns HTTP 409 with body `{ error: 'idempotency-key-conflict' }`

### Requirement: Active RANKED/DAILY attempt is single-instance per user

For `mode IN [RANKED, DAILY]` the system SHALL ensure at most one active attempt (status in CREATED/CLAIMED/PLAYING/SUBMITTING) exists per user. The partial unique index `uq_user_active_ranked_attempt` enforces this at the DB level; the application SHALL convert the unique-violation error to a friendly HTTP 409 with body `{ error: 'existing-active-attempt', attemptId, playPath }`.

#### Scenario: Second RANKED start returns existing attempt
- **GIVEN** the user already has a RANKED `GameAttempt` with `status='PLAYING'`
- **WHEN** the user POSTs `/api/challenges/start` for the same game/mode/difficulty without `idempotencyKey`
- **THEN** the API returns HTTP 200 with the existing attempt's `attemptId` and `playPath`

### Requirement: Claim validates entry token + play session

`POST /api/challenges/:id/claim` SHALL verify `userId` matches, `sha256(entryToken) === entryTokenHash`, and the current `AttemptRuntimeSession.status` is in `[CREATED, CLAIMED]`. On success it SHALL CAS the attempt from `CREATED→CLAIMED`.

#### Scenario: Valid claim transitions to CLAIMED
- **WHEN** the SPA POSTs `/api/challenges/:id/claim` with the original `entryToken` and `playSessionId`
- **THEN** the API returns `{ canEnter: true, status: 'CLAIMED', seed, initialState, startedAt, expiresAt }`
- **AND** the `GameAttempt.status` is `CLAIMED` and `statusVersion` is incremented

#### Scenario: Wrong entry token rejected
- **WHEN** the SPA POSTs claim with a wrong `entryToken`
- **THEN** the API returns `{ canEnter: false, redirectTo: '...', reason: 'invalid-token' }` and the attempt is unchanged

#### Scenario: Second tab claim rejected
- **GIVEN** an `AttemptRuntimeSession` with `status='CLAIMED'` exists for the attempt
- **WHEN** a second client POSTs claim with a different `playSessionId`
- **THEN** the API returns `{ canEnter: false, reason: 'session-conflict' }` (driven by `uq_attempt_active_runtime_session`)

### Requirement: Heartbeat enforces ownership and expiry

`POST /api/challenges/:id/heartbeat` SHALL verify the `playSessionId` matches the attempt's active runtime session. The system SHALL update `lastHeartbeatAt` on both `GameAttempt` and `AttemptRuntimeSession`. If `expiresAt < now` the system SHALL CAS the attempt to `TIMEOUT` and return `{ accepted: false, status: 'TIMEOUT' }`.

#### Scenario: Heartbeat keeps attempt alive
- **WHEN** the SPA sends heartbeat within the timeout window
- **THEN** the API returns `{ accepted: true, status, remainingMs > 0 }`

#### Scenario: Heartbeat after expiry triggers TIMEOUT
- **GIVEN** `attempt.expiresAt < now`
- **WHEN** the SPA sends heartbeat
- **THEN** the API CAS-transitions `PLAYING→TIMEOUT`, sets `timeoutAt = attempt.expiresAt`, emits an audit row, and returns `{ accepted: false, status: 'TIMEOUT', remainingMs: 0 }`

### Requirement: Abandon is idempotent

`POST /api/challenges/:id/abandon` SHALL CAS-transition `CREATED|CLAIMED|PLAYING → ABANDONED` and SHALL be idempotent: calling it on an already-terminal attempt returns the current status without error.

#### Scenario: First abandon
- **WHEN** the SPA POSTs abandon during PLAYING
- **THEN** the attempt becomes `ABANDONED` and audit log records the transition with the provided reason

#### Scenario: Second abandon is no-op
- **WHEN** the SPA POSTs abandon again after success
- **THEN** the API returns `{ accepted: true, status: 'ABANDONED' }` and no new audit row is emitted (audit is per actual transition)

### Requirement: Finish runs adapter and CAS-transitions to COMPLETED

`POST /api/challenges/:id/finish` SHALL CAS `PLAYING→SUBMITTING`, invoke the registered `GameRuntimeAdapter.finishAttempt`, persist `AttemptValidationReport`, then CAS `SUBMITTING→COMPLETED`. On adapter failure (`passed=false`) the system SHALL still transition to `COMPLETED` with `validationStatus='INVALID', scoreEligibility='NOT_ELIGIBLE'`. Catastrophic adapter errors (thrown exception) SHALL CAS to `INVALIDATED` and emit an `ERROR` audit row.

#### Scenario: Successful finish
- **WHEN** the SPA POSTs finish with a valid finalState
- **THEN** the API returns `{ accepted: true, status: 'COMPLETED', result: { success: true, score, durationMs }, resultPath }`
- **AND** the attempt has `completedAt`, `durationMs`, `scoreValue`, `validationStatus='VALID'`
- **AND** an `AttemptValidationReport` row exists with `passed=true`

#### Scenario: Adapter rejection
- **WHEN** the adapter returns `{ passed: false, antiCheatFlags: ['out-of-bounds'] }`
- **THEN** the attempt's `validationStatus='INVALID'`, `scoreEligibility='NOT_ELIGIBLE'`
- **AND** the response is `{ accepted: true, status: 'COMPLETED', result: { success: false, ... } }`

#### Scenario: Replay finish is idempotent
- **GIVEN** the attempt is `COMPLETED`
- **WHEN** the SPA POSTs finish again
- **THEN** the API returns the same result body without re-running the adapter

### Requirement: Status endpoint

`GET /api/challenges/:id/status` SHALL return the attempt's current status, `mode`, `gameSlug`, terminal timestamps, and `resultPath`/`expiredPath` hints.

#### Scenario: Status of completed attempt
- **WHEN** the SPA GETs status for a `COMPLETED` attempt
- **THEN** the response contains `{ status: 'COMPLETED', resultPath: '/games/<slug>/attempts/<id>/result' }`

### Requirement: Every transition writes ChallengeAuditLog

Each successful CAS transition SHALL insert a `ChallengeAuditLog` row with `{ attemptId, userId, gameId, action, fromStatus, toStatus, reason?, requestId, playSessionId?, metadata, ipAddress?, createdAt }`.

#### Scenario: Audit count matches transition count
- **GIVEN** an attempt that has gone through CREATED → CLAIMED → PLAYING → SUBMITTING → COMPLETED
- **WHEN** an admin queries `SELECT count(*) FROM "ChallengeAuditLog" WHERE "attemptId" = $1`
- **THEN** the count is 4 (one per legal transition, plus the initial `START` entry from `start`)

### Requirement: ChallengeReaperWorker promotes expired attempts

A scheduled worker SHALL run every 30 seconds, scanning `GameAttempt` rows where `status IN (CREATED, CLAIMED, PLAYING, SUBMITTING)` AND (`expiresAt < now` OR `lastHeartbeatAt < now - challengePolicy.heartbeatTimeoutSec`). For each match it SHALL CAS to `TIMEOUT` (if past `expiresAt`) or `INTERRUPTED` (if heartbeat stale) and emit an audit row.

#### Scenario: Reaper closes timed-out attempt
- **GIVEN** an attempt with `status='PLAYING'` and `expiresAt < now - 1 minute`
- **WHEN** the reaper runs
- **THEN** the attempt becomes `TIMEOUT` and an audit row records `reason='reaper-expired'`

### Requirement: GameRuntimeAdapter registry

The system SHALL provide a `GameAdapterRegistry` that resolves an adapter by `engineKey` (matches `GameRuleSetVersion.engineKey`). The registry SHALL be populated at module bootstrap by the four game modules.

#### Scenario: Registry resolves all seeded games
- **WHEN** the API starts
- **THEN** the registry returns non-null adapters for engineKeys `sliding-puzzle`, `life-game`, `precise-character-building`, `absolute-command`

#### Scenario: Unknown engineKey throws on start
- **WHEN** `ChallengesService` calls `registry.get('unknown')`
- **THEN** the service throws `NotFoundException` and returns HTTP 500 to the client
