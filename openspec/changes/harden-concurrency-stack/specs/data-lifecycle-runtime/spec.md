# data-lifecycle-runtime Capability (delta for change `harden-concurrency-stack`)

## ADDED Requirements

### Requirement: RetentionArchiveWorker drains expired rows

The `RetentionArchiveWorker` (BullMQ processor for queue `retention-archive`) SHALL run daily (cron 03:00 server time) and for each enabled `DataRetentionPolicy` SHALL:

1. Compute the archive window `[oldestUnarchived, now - onlineRetentionDays]`.
2. Stream-query the source table over that window.
3. Write a JSONL+gzip file to `apps/api/archives/<batchId>.jsonl.gz`.
4. INSERT `DataArchiveBatch` (status RUNNING→COMPLETED) and `DataArchiveObject` (storageKey, sha256, sizeBytes).
5. INSERT `DataCleanupRun(action=DELETE)` and delete archived rows in batches of 1000.
6. Set both rows' status to COMPLETED on success.

Tables with `action='KEEP'` SHALL never be deleted by this worker (only optionally archived).

#### Scenario: AttemptOperationLog older than 30 days archived
- **GIVEN** a `DataRetentionPolicy` for `AttemptOperationLog` with `onlineRetentionDays=30, archiveAfterDays=30, action='ARCHIVE'`
- **AND** rows with `createdAt < now - 30 days` exist
- **WHEN** the worker runs
- **THEN** a JSONL.gz file is written under `apps/api/archives/`
- **AND** `DataArchiveObject` exists with sha256 matching the file
- **AND** the source rows are deleted
- **AND** `DataCleanupRun.status='COMPLETED'`

#### Scenario: AdminAuditLog KEEP policy preserves rows
- **GIVEN** an `AdminAuditLog` policy with `action='KEEP'`
- **WHEN** the worker runs
- **THEN** no rows are deleted regardless of age

### Requirement: Failed archive rolls back delete

If the archive write fails (e.g. disk full) the worker SHALL set `DataArchiveBatch.status='FAILED'` and SHALL NOT run the cleanup step.

#### Scenario: Disk write fails
- **GIVEN** `apps/api/archives/` is read-only
- **WHEN** the worker tries to write
- **THEN** the batch row is `FAILED` with `errorMessage` set
- **AND** no source rows are deleted

### Requirement: Retention policies are admin-managed

The system SHALL expose admin endpoints under `/api/admin/data-retention-policies` (list/get/create/update/enable/disable). Gated by `data-retention:manage`.

#### Scenario: Admin can override default
- **WHEN** an admin POSTs a new policy for `GameSubmission` with `gameId=<life-game>` and `onlineRetentionDays=180`
- **THEN** a row exists with the specified scope and the worker honours it for that game

### Requirement: Manual archive trigger

The system SHALL expose `POST /api/admin/data-retention-policies/:id/run-now` to enqueue an immediate `retention-archive` job. Gated by `data-archive:trigger`.

#### Scenario: Manual trigger enqueues job
- **WHEN** an admin POSTs run-now on an enabled policy
- **THEN** a BullMQ job appears in `retention-archive` queue with `data: { policyId }`

### Requirement: Archive file naming and integrity

Each archive file SHALL be named `<batchId>.jsonl.gz` and the `DataArchiveObject.sha256` SHALL match the file's sha256. The file SHALL NOT be served from any HTTP endpoint without explicit `data-archive:download` permission (deferred to a later change; for now files are sysadmin-accessible only).

#### Scenario: sha256 mismatch flagged
- **GIVEN** a file was tampered with after archive
- **WHEN** an integrity check job runs (deferred — describe placeholder)
- **THEN** the check reports a sha256 mismatch and marks the object `metadata.integrity = 'failed'`
