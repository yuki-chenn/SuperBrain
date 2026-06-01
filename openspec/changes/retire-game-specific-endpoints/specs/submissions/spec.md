# submissions Capability (delta for change `retire-game-specific-endpoints`)

## ADDED Requirements

### Requirement: Unified submission endpoint

The system SHALL expose `POST /api/challenges/:attemptId/submissions` accepting `{ type: SubmissionType, payload, idempotencyKey, playSessionId, roundIndex?, regionId?, seq? }`. The endpoint SHALL require:
- JWT auth.
- Attempt owned by the requesting user.
- Attempt `status='PLAYING'`.
- Valid `playSessionId` (matches `AttemptRuntimeSession`).
- Non-empty `idempotencyKey`.

#### Scenario: Successful REGION submission
- **GIVEN** a life-game attempt at PLAYING with active runtime session
- **WHEN** the SPA POSTs `{ type: 'REGION', payload: { regionId: 5, predictedAliveCells: [...] }, idempotencyKey: 'k1', playSessionId: 'p1' }`
- **THEN** the API calls `LifeGameAdapter.verifySubmission(...)` and persists a `GameSubmission` row
- **AND** returns `{ accepted: true, submission: { id, validationPassed: true, result: {...}, finalReady: false } }`

#### Scenario: Submission rejected by wrong play session
- **WHEN** the SPA POSTs with a wrong `playSessionId`
- **THEN** the API returns HTTP 403 with body `{ error: 'session-conflict' }`

#### Scenario: Submission rejected outside PLAYING
- **GIVEN** the attempt is COMPLETED
- **WHEN** the SPA POSTs a submission
- **THEN** the API returns HTTP 409 with body `{ error: 'attempt-not-active', status: 'COMPLETED' }`

### Requirement: Submission persistence is idempotent

`GameSubmission` rows are uniquely keyed by `(attemptId, idempotencyKey)`. Replays with the same key SHALL return the previously-stored row without re-running validation.

#### Scenario: Replay returns same row
- **GIVEN** an existing `GameSubmission` with `idempotencyKey='k1'` for the attempt
- **WHEN** the SPA POSTs the same `{ type, payload, idempotencyKey: 'k1' }`
- **THEN** the API returns the original row's data
- **AND** no new `GameSubmission` is inserted
- **AND** `validationResult` is identical

### Requirement: verifySubmission contract

Each `GameRuntimeAdapter` SHALL implement `verifySubmission({attempt, ruleSetVersion, difficulty, puzzleVersion?, submissionType, payload, hints})` returning `{ accepted, reason?, result, metricsDelta?, snapshot?, finalReady? }`. The service SHALL merge `metricsDelta` into `attempt.metricsSummary` and write `snapshot` as an `AttemptSnapshot` row only when validation passed.

#### Scenario: metricsDelta merged into metricsSummary
- **GIVEN** `attempt.metricsSummary = { regionsCorrect: 1 }`
- **WHEN** a REGION submission returns `{ accepted: true, metricsDelta: { regionsCorrect: 1 } }`
- **THEN** the attempt's `metricsSummary` becomes `{ regionsCorrect: 2 }`

#### Scenario: snapshot written when present
- **GIVEN** an absolute-command COMMAND submission returns `{ snapshot: { type: 'CHECKPOINT', state: {...} } }`
- **THEN** an `AttemptSnapshot` row is inserted with `snapshotType='CHECKPOINT'`

#### Scenario: finalReady signals SPA
- **WHEN** the last required submission completes (e.g. last region correct)
- **THEN** the response contains `finalReady=true`
- **AND** the SPA may now show a "Finish" button

### Requirement: Unknown submission type rejected per game

If the requested `submissionType` is not supported by the resolved adapter, the API SHALL return HTTP 400 with body `{ error: 'submission-type-not-supported', accepted: ['ROUND', 'FINAL'] }`.

#### Scenario: sliding-puzzle rejects REGION
- **WHEN** the SPA POSTs `{ type: 'REGION' }` on a sliding-puzzle attempt
- **THEN** the API returns HTTP 400 with the accepted-types list

### Requirement: Generic admin submission viewer

The admin SPA `AttemptDetail` page SHALL include a "Submissions" tab listing `GameSubmission` rows paginated, filterable by `submissionType`. The payload preview SHALL be rendered by a per-engine `SubmissionPreview` plugin if registered; otherwise as a JSON dump.

#### Scenario: Submissions tab lists rows
- **WHEN** an admin opens `AttemptDetail` for an attempt with 9 ROUND submissions
- **THEN** the Submissions tab paginates to show all 9 rows

## REMOVED Requirements

### Requirement: Game-specific submission endpoints
**Reason**: Replaced by the unified `POST /api/challenges/:id/submissions` endpoint.
**Migration**: Delete `apps/api/src/games/life-game/life-game.controller.ts`, `precise-character-building/*.controller.ts`, `absolute-command/absolute-command.controller.ts` and corresponding service files. SPA must call `POST /api/challenges/:id/submissions { type, payload, idempotencyKey }` instead of the legacy game-specific routes.
