# arbitration Capability (delta for change `harden-concurrency-stack`)

## ADDED Requirements

### Requirement: AntiCheat flags route to REVIEW_REQUIRED

When `ChallengesService.finish` completes and `AttemptValidationReport.antiCheatFlags.length > 0` (or `metrics.suspicious === true` per game policy), the system SHALL transition the attempt to `REVIEW_REQUIRED` instead of recording scores and SHALL create an `AdminReviewTask`.

#### Scenario: Suspicious finish creates review task
- **GIVEN** the adapter returned `{ passed: true, antiCheatFlags: ['impossible-time'] }`
- **WHEN** finish commits
- **THEN** the `GameAttempt.status` is `REVIEW_REQUIRED`
- **AND** no `ScoreRecord` row is inserted
- **AND** an `AdminReviewTask` exists with `resourceType='GameAttempt', resourceId=attemptId, action='REVIEW_ATTEMPT', status='DRAFT'`

#### Scenario: Clean finish skips review
- **GIVEN** the adapter returned `{ passed: true, antiCheatFlags: [] }`
- **WHEN** finish commits
- **THEN** the attempt is `COMPLETED` and scores are recorded (Change 5 behaviour)
- **AND** no `AdminReviewTask` is created

### Requirement: Admin can decide review tasks

The system SHALL expose `POST /api/admin/review-tasks/:id/decide { decision: 'REVOKED' | 'ADMIN_CORRECTED', reviewComment }`. The decision SHALL be permission-gated by `review-task:approve` (for ADMIN_CORRECTED) or `review-task:reject` (for REVOKED). The endpoint SHALL apply the matching terminal transition and emit an audit row.

#### Scenario: Decide REVOKED
- **WHEN** a user with `review-task:reject` POSTs decide with `{ decision: 'REVOKED', reviewComment: 'unrealistic time' }`
- **THEN** the `GameAttempt.status` becomes `REVOKED`
- **AND** the `AdminReviewTask.status` becomes `ARCHIVED` with `reviewedByUserId`, `reviewedAt`, `reviewComment`
- **AND** any pre-existing `ScoreRecord` for the attempt is marked `REVOKED` (if previously recorded by admin override)
- **AND** an `AdminAuditLog` row records the action

#### Scenario: Decide ADMIN_CORRECTED records score
- **WHEN** a user with `review-task:approve` POSTs decide with `{ decision: 'ADMIN_CORRECTED', reviewComment: 'verified by replay' }`
- **THEN** the `GameAttempt.status` becomes `ADMIN_CORRECTED`
- **AND** `ScoreRecordingService.recordScores(...)` runs and inserts `ScoreRecord`s
- **AND** the `AdminReviewTask.status` becomes `ARCHIVED`

#### Scenario: Decide without permission
- **WHEN** a user with neither `review-task:approve` nor `review-task:reject` calls decide
- **THEN** HTTP 403

### Requirement: Admin can list and inspect review tasks

The system SHALL expose:
- `GET /api/admin/review-tasks?status=&resourceType=&page=&pageSize=` — paginated list, default `status=DRAFT`.
- `GET /api/admin/review-tasks/:id` — detail including the referenced `GameAttempt`, its `AttemptValidationReport`, and the latest validator output.

Both gated by `review-task:read`.

#### Scenario: List default returns pending
- **WHEN** a reviewer GETs `/api/admin/review-tasks` without filters
- **THEN** the response contains only `AdminReviewTask` rows with `status='DRAFT'`

### Requirement: Admin review UI

The admin SPA SHALL expose `/review-tasks` listing pending tasks with a detail page showing attempt summary, anti-cheat flags, final state diff (if applicable), and REVOKED/ADMIN_CORRECTED buttons.

#### Scenario: Reviewer can take action from the UI
- **WHEN** a reviewer clicks REVOKED on a task and supplies a comment
- **THEN** the SPA POSTs the decide endpoint and the row disappears from the pending list
