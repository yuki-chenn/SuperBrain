# database-schema Capability (delta for change `redesign-database-schema-greenfield`)

## ADDED Requirements

### Requirement: Single canonical Prisma schema

The system SHALL define every persisted entity in `apps/api/prisma/schema.prisma`. No other file in the repository defines persisted Prisma models. The schema MUST validate via `prisma validate` and generate via `prisma generate` without error.

#### Scenario: prisma validate passes
- **WHEN** an engineer runs `pnpm api -- prisma validate`
- **THEN** the command exits with code 0
- **AND** prints `The schema at prisma/schema.prisma is valid`

#### Scenario: prisma generate produces typed client
- **WHEN** an engineer runs `pnpm api -- prisma generate`
- **THEN** the command exits with code 0
- **AND** the generated `@prisma/client` exports types for all 40 models defined in the design

### Requirement: Greenfield migration is the only migration

The migrations directory SHALL contain exactly one applied migration named `<timestamp>_init` plus `migration_lock.toml`. No incremental migrations from the prior schema SHALL be retained.

#### Scenario: Fresh reset migrates cleanly
- **WHEN** an engineer runs `pnpm api -- prisma migrate reset --force --skip-seed` followed by `pnpm api -- prisma migrate dev` on an empty database
- **THEN** exactly one migration directory exists under `apps/api/prisma/migrations/`
- **AND** the directory name ends in `_init`
- **AND** the migration applies without error

#### Scenario: migrate status reports clean
- **WHEN** an engineer runs `pnpm api -- prisma migrate status`
- **THEN** the output reports `Database schema is up to date` with one migration applied

### Requirement: Enum set matches design

The schema SHALL define every enum from the resolved enum set with the exact value set specified in the design.

#### Scenario: AttemptStatus contains all 13 values
- **WHEN** the introspected enum `AttemptStatus` is read from the generated client
- **THEN** its members are exactly `CREATED, CLAIMED, PLAYING, PAUSED, SUBMITTING, COMPLETED, ABANDONED, TIMEOUT, INTERRUPTED, INVALIDATED, REVIEW_REQUIRED, REVOKED, ADMIN_CORRECTED`

#### Scenario: ChallengeMode contains 6 values including ADMIN_TEST
- **WHEN** the introspected enum `ChallengeMode` is read
- **THEN** its members are exactly `RANKED, DAILY, CASUAL, PRACTICE, ROOM, ADMIN_TEST`

#### Scenario: Validation enums are split
- **WHEN** the introspected enums `ConfigValidationStatus` and `AttemptValidationStatus` are read
- **THEN** `ConfigValidationStatus` members are `UNVALIDATED, VALIDATING, VALID, INVALID, WARNING`
- **AND** `AttemptValidationStatus` members are `PENDING, VALIDATING, VALID, INVALID, ERROR, REVIEW_REQUIRED`

### Requirement: Identity and access models exist

The schema SHALL define the six identity models `User`, `AuthSession`, `Role`, `Permission`, `UserRole`, `RolePermission`. `User` SHALL NOT carry a `role` enum field — authorization MUST derive from `UserRole → Role → RolePermission → Permission`.

#### Scenario: User has no role column
- **WHEN** the generated `User` type is inspected
- **THEN** it does NOT expose a `role` field
- **AND** it exposes `status` of type `UserStatus`

#### Scenario: AuthSession refreshTokenHash is unique
- **WHEN** two `AuthSession` rows are inserted with the same `refreshTokenHash`
- **THEN** the second insert fails with a Prisma unique-constraint violation on `AuthSession_refreshTokenHash_key`

#### Scenario: UserRole uses composite primary key
- **WHEN** two `UserRole` rows are inserted with the same `(userId, roleId)`
- **THEN** the second insert fails with a primary-key violation

### Requirement: Game catalog and policy models exist

The schema SHALL define `Game`, `GameRuleSetVersion`, `GameDifficulty`, `GameContentPolicy`, `GameChallengePolicy`.

#### Scenario: Game slug is unique
- **WHEN** two `Game` rows are inserted with the same `slug`
- **THEN** the second insert fails

#### Scenario: GameRuleSetVersion enforces version uniqueness per game
- **WHEN** two `GameRuleSetVersion` rows are inserted with the same `(gameId, version)`
- **THEN** the second insert fails with `GameRuleSetVersion_gameId_version_key` violation

#### Scenario: GameDifficulty enforces configHash uniqueness per (game, key)
- **WHEN** two `GameDifficulty` rows are inserted with the same `(gameId, key, configHash)`
- **THEN** the second insert fails

### Requirement: Puzzle system models exist

The schema SHALL define `Puzzle`, `PuzzleVersion`, `PuzzleSchedule`, `PuzzleTag`, `PuzzleTagBinding`, `PuzzleAsset`. Legacy puzzle tables (`LifePuzzle`, `PreciseCharacterPuzzle`, `AbsoluteCommandPuzzle`, `AbsoluteCommandPuzzleVersion`) SHALL NOT exist.

#### Scenario: Legacy puzzle tables absent
- **WHEN** an engineer queries `SELECT to_regclass('public."LifePuzzle"')`
- **THEN** the query returns `NULL`
- **AND** the same query for `PreciseCharacterPuzzle`, `AbsoluteCommandPuzzle`, `AbsoluteCommandPuzzleVersion` also returns `NULL`

#### Scenario: PuzzleVersion content is opaque JSON
- **WHEN** a `PuzzleVersion` row is inserted with arbitrary JSON in `content`
- **THEN** the insert succeeds without schema validation by Postgres
- **AND** the row's `contentHash` field is required (non-null)

#### Scenario: PuzzleVersion enforces contentHash uniqueness per puzzle
- **WHEN** two `PuzzleVersion` rows are inserted with the same `(puzzleId, contentHash)`
- **THEN** the second insert fails

### Requirement: Attempt runtime models exist

The schema SHALL define `GameAttempt`, `AttemptRuntimeSession`, `AttemptOperationLog`, `AttemptOperationBatch`, `AttemptSnapshot`, `GameSubmission`, `AttemptValidationReport`, `ChallengeAuditLog`. Legacy submission tables (`LifeRegionSubmission`, `PreciseCharacterRoundSubmission`, `AbsoluteCommandLog`) SHALL NOT exist.

#### Scenario: GameAttempt carries version-lock columns
- **WHEN** the generated `GameAttempt` type is inspected
- **THEN** it exposes `ruleSetVersionId`, `difficultyId`, `contentPolicyId`, `challengePolicyId`, `puzzleVersionId`, `seed`, `generatedContentHash`, `policySnapshot`, `idempotencyKey`, `statusVersion`, `expiresAt`, `lastHeartbeatAt`

#### Scenario: GameAttempt idempotencyKey is unique per user
- **WHEN** two `GameAttempt` rows are inserted with the same `(userId, idempotencyKey)` where both keys are non-null
- **THEN** the second insert fails

#### Scenario: AttemptOperationLog seq range is unique per attempt
- **WHEN** two `AttemptOperationLog` rows are inserted with the same `(attemptId, seqStart, seqEnd)`
- **THEN** the second insert fails

#### Scenario: Legacy submission tables absent
- **WHEN** an engineer queries `SELECT to_regclass('public."LifeRegionSubmission"')`
- **THEN** the query returns `NULL`
- **AND** the same query for `PreciseCharacterRoundSubmission` and `AbsoluteCommandLog` also returns `NULL`

### Requirement: Idempotency model exists

The schema SHALL define `IdempotencyRecord` with `(userId, key)` unique constraint and indexes on `expiresAt` and `(status, lockedUntil)`.

#### Scenario: IdempotencyRecord enforces unique per user
- **WHEN** two `IdempotencyRecord` rows are inserted with the same `(userId, key)`
- **THEN** the second insert fails

### Requirement: Leaderboard pipeline models exist

The schema SHALL define `LeaderboardDefinition`, `LeaderboardPeriod`, `ScoreRecord`, `LeaderboardBest`, `LeaderboardRankCache`. The legacy `LeaderboardEntry` table SHALL NOT exist.

#### Scenario: Legacy LeaderboardEntry absent
- **WHEN** an engineer queries `SELECT to_regclass('public."LeaderboardEntry"')`
- **THEN** the query returns `NULL`

#### Scenario: ScoreRecord enforces one record per (leaderboard, attempt)
- **WHEN** two `ScoreRecord` rows are inserted with the same `(leaderboardId, attemptId)`
- **THEN** the second insert fails

#### Scenario: LeaderboardBest enforces one row per (leaderboard, period, user)
- **WHEN** two `LeaderboardBest` rows are inserted with the same `(leaderboardId, periodId, userId)`
- **THEN** the second insert fails

#### Scenario: LeaderboardRankCache enforces unique rank position
- **WHEN** two `LeaderboardRankCache` rows are inserted with the same `(leaderboardId, periodId, rankPosition)`
- **THEN** the second insert fails

### Requirement: Admin and audit models exist

The schema SHALL define `AdminAuditLog` and `AdminReviewTask`. The application layer SHALL strip `passwordHash`, `refreshTokenHash`, `entryTokenHash` from any value written into `AdminAuditLog.before` or `AdminAuditLog.after`.

#### Scenario: AdminAuditLog accepts arbitrary actor metadata
- **WHEN** an `AdminAuditLog` row is inserted with `actorUserId = NULL` and `actorUsername = 'system'`
- **THEN** the insert succeeds

#### Scenario: AdminReviewTask requires requestedByUserId
- **WHEN** an `AdminReviewTask` row is inserted without `requestedByUserId`
- **THEN** the insert fails with a NOT NULL constraint violation

### Requirement: Data lifecycle models exist

The schema SHALL define `DataRetentionPolicy`, `DataArchiveBatch`, `DataArchiveObject`, `DataCleanupRun`. Seeding SHALL populate `DataRetentionPolicy` with default rules for `AttemptOperationLog`, `ChallengeAuditLog`, `AdminAuditLog`, `IdempotencyRecord`, `GameSubmission`, `AttemptSnapshot`.

#### Scenario: Default retention policies are seeded
- **WHEN** an engineer runs `pnpm api -- prisma db seed` against a freshly migrated database
- **THEN** `SELECT count(*) FROM "DataRetentionPolicy"` is at least 5
- **AND** rows exist for `tableName IN ('AttemptOperationLog', 'ChallengeAuditLog', 'AdminAuditLog', 'IdempotencyRecord', 'GameSubmission')`

### Requirement: Dictionary models exist for precise-character game

The schema SHALL define `CharacterRadical`, `CharacterRoot`, `CharacterCombination`. These tables SHALL persist across the greenfield reset and SHALL be re-seeded.

#### Scenario: Dictionary tables seeded after reset
- **WHEN** an engineer runs `prisma migrate reset --force && prisma db seed`
- **THEN** `SELECT count(*) FROM "CharacterRadical"` is greater than 0
- **AND** `SELECT count(*) FROM "CharacterRoot"` is greater than 0
- **AND** `SELECT count(*) FROM "CharacterCombination"` is greater than 0

#### Scenario: CharacterCombination triple is unique
- **WHEN** two `CharacterCombination` rows are inserted with the same `(radicalId, rootId, resultChar)`
- **THEN** the second insert fails

### Requirement: Partial unique indexes enforce single-active rows

The migration SHALL declare the following PostgreSQL partial unique indexes via raw SQL appended to the `init` migration:
- `uq_active_game_ruleset_version` — one ACTIVE rule-set version per `(gameId)`
- `uq_active_game_difficulty` — one ACTIVE difficulty per `(gameId, key)`
- `uq_active_game_content_policy` — one ACTIVE content policy per `(gameId, difficultyId, mode)` with NULLS NOT DISTINCT
- `uq_active_game_challenge_policy` — one ACTIVE challenge policy per `(gameId, mode, difficultyId)` with NULLS NOT DISTINCT
- `uq_published_puzzle_version` — one PUBLISHED puzzle version per `(puzzleId)`
- `uq_user_active_ranked_attempt` — one active attempt per `userId` where `mode IN ('RANKED','DAILY') AND status IN ('CREATED','CLAIMED','PLAYING','SUBMITTING')`
- `uq_attempt_active_runtime_session` — one active runtime session per `(attemptId)` where `status IN ('CREATED','CLAIMED','PLAYING')`

#### Scenario: Two ACTIVE difficulties of the same key are rejected
- **WHEN** two `GameDifficulty` rows are inserted with the same `(gameId, key)` and both have `status='ACTIVE'`
- **THEN** the second insert fails citing `uq_active_game_difficulty`

#### Scenario: Two PUBLISHED versions of the same puzzle rejected
- **WHEN** two `PuzzleVersion` rows are inserted with the same `puzzleId` and both have `status='PUBLISHED'`
- **THEN** the second insert fails citing `uq_published_puzzle_version`

#### Scenario: Two active RANKED attempts per user rejected
- **WHEN** a user already has a `GameAttempt` with `mode='RANKED'` and `status='PLAYING'`, and a second insert attempts `mode='RANKED', status='CREATED'` for the same `userId`
- **THEN** the second insert fails citing `uq_user_active_ranked_attempt`

#### Scenario: Two active runtime sessions per attempt rejected
- **WHEN** two `AttemptRuntimeSession` rows are inserted with the same `attemptId` and both have `status='PLAYING'`
- **THEN** the second insert fails citing `uq_attempt_active_runtime_session`

### Requirement: RBAC seed bootstraps roles and permissions

The seed step SHALL insert exactly 8 system roles with `isSystem=true` and at least 30 permission keys. The 8 roles are: `super_admin`, `admin`, `puzzle_editor`, `puzzle_reviewer`, `leaderboard_manager`, `user_manager`, `audit_viewer`, `readonly_operator`. The `super_admin` role SHALL be granted every permission via `RolePermission`.

#### Scenario: Eight system roles seeded
- **WHEN** seed runs on an empty database
- **THEN** `SELECT count(*) FROM "Role" WHERE "isSystem"=true` returns 8
- **AND** `SELECT key FROM "Role" WHERE "isSystem"=true ORDER BY key` returns the eight expected role keys

#### Scenario: Permission count meets baseline
- **WHEN** seed runs on an empty database
- **THEN** `SELECT count(*) FROM "Permission"` is at least 30
- **AND** every permission `key` matches the regex `^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$`

#### Scenario: super_admin role has every permission
- **WHEN** seed runs on an empty database
- **THEN** the count of `RolePermission` rows for `super_admin` equals the total count of `Permission` rows

### Requirement: Game catalog seed bootstraps four games with active policies

The seed step SHALL insert four `Game` rows with `status='PUBLISHED'` for slugs `sliding-puzzle`, `life-game`, `precise-character-building`, `absolute-command`. For each game the seed SHALL also create one ACTIVE `GameRuleSetVersion`, one or more ACTIVE `GameDifficulty`, one ACTIVE `GameContentPolicy`, and one ACTIVE `GameChallengePolicy` per supported mode (at minimum `RANKED` and `PRACTICE`).

#### Scenario: Four published games seeded
- **WHEN** seed runs on an empty database
- **THEN** `SELECT slug FROM "Game" WHERE status='PUBLISHED' ORDER BY slug` returns exactly `absolute-command, life-game, precise-character-building, sliding-puzzle`

#### Scenario: Every game has an active rule-set version
- **WHEN** seed runs on an empty database
- **THEN** for each `Game` row, `SELECT count(*) FROM "GameRuleSetVersion" WHERE "gameId"=$1 AND status='ACTIVE'` returns 1

#### Scenario: Every game has at least one active challenge policy
- **WHEN** seed runs on an empty database
- **THEN** for each `Game` row, `SELECT count(*) FROM "GameChallengePolicy" WHERE "gameId"=$1 AND status='ACTIVE'` is at least 1

#### Scenario: Sliding-puzzle uses GENERATED content mode
- **WHEN** seed runs on an empty database
- **THEN** the ACTIVE `GameContentPolicy` for the `sliding-puzzle` game has `contentMode='GENERATED'` and a non-null `generatorKey`

#### Scenario: Curated games have at least one published puzzle version
- **WHEN** seed runs on an empty database
- **THEN** for each game with `contentMode='CURATED'` (life-game, precise-character-building, absolute-command), `SELECT count(*) FROM "PuzzleVersion" pv JOIN "Puzzle" p ON p.id=pv."puzzleId" WHERE p."gameId"=$1 AND pv.status='PUBLISHED'` is at least 1

### Requirement: Leaderboard seed defines baseline boards

The seed step SHALL insert at least one ACTIVE `LeaderboardDefinition` per `(game, difficulty)` for `mode=RANKED` and `periodType=ALL_TIME`, with `rankMetric='durationMs'` and `rankDirection='ASC'` (unless overridden in metadata).

#### Scenario: Baseline leaderboards exist
- **WHEN** seed runs on an empty database
- **THEN** `SELECT count(*) FROM "LeaderboardDefinition" WHERE status='ACTIVE' AND "periodType"='ALL_TIME'` is at least 4

#### Scenario: Leaderboards reference real games
- **WHEN** seed runs on an empty database
- **THEN** every row in `LeaderboardDefinition` has a `gameId` that joins to an existing `Game.id`

### Requirement: Seeded data is idempotent

Each seed module SHALL use `upsert` semantics keyed by stable business identifiers so that re-running `pnpm api -- prisma db seed` against an already-seeded database produces no row-count change and no error.

#### Scenario: Seed is rerunnable
- **WHEN** an engineer runs `pnpm api -- prisma db seed` twice against the same database without intervening reset
- **THEN** both runs exit with code 0
- **AND** the counts of `Role`, `Permission`, `Game`, `LeaderboardDefinition`, `CharacterRadical`, `CharacterRoot`, `CharacterCombination`, `Puzzle`, `PuzzleVersion` rows are identical between the first and second run

### Requirement: Reset and reseed cycle is the documented recovery path

The repository SHALL provide a `RESET_DB=1` flag on `start.sh` that prints a destructive-reset warning and gates the operation behind a confirmation prompt or `OPSX_DB_RESET_CONFIRM=1` env var. The documented local-recovery procedure SHALL be `pnpm api -- prisma migrate reset --force && pnpm api -- prisma db seed`.

#### Scenario: Reset followed by seed yields a working database
- **WHEN** an engineer runs `pnpm api -- prisma migrate reset --force --skip-seed` followed by `pnpm api -- prisma migrate dev` followed by `pnpm api -- prisma db seed`
- **THEN** the database contains the expected baseline rows (8 roles, ≥30 permissions, 4 published games, ≥1 ACTIVE rule-set version per game, ≥1 ACTIVE challenge policy per game, ≥4 ACTIVE leaderboard definitions, dictionary rows present)

#### Scenario: start.sh announces destructive reset
- **WHEN** `start.sh` is invoked with `RESET_DB=1`
- **THEN** the script prints a banner containing `WARNING` and `RESET` (case-insensitive)
- **AND** pauses for confirmation (manual run) or proceeds non-interactively (when `OPSX_DB_RESET_CONFIRM=1` is set)
