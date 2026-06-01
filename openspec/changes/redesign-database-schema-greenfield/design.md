# Design — redesign-database-schema-greenfield

## Context

The current SuperBrain Prisma schema has 17 models built incrementally during MVP. The forthcoming reform described in `docs/7-9-*.md` requires versioned game configuration, generic puzzle abstraction, RBAC, runtime sessions, idempotency, audit trails, and a multi-table leaderboard pipeline — none of which the current schema supports. Because the project is pre-launch and has no production users, we adopt a greenfield reset: drop everything, replace with a 40-model schema spanning 8 data domains, and re-seed.

This document is the authoritative source for the new schema. The follow-up changes (RBAC, Challenge Runtime, Puzzle Unification, Leaderboard Pipeline, Concurrency Hardening, Game-Specific Endpoint Retirement) will reference rows defined here and rebuild the application layer on top.

Three source documents (docs 7, 8, 9) contributed conflicting field sets; their conflicts are resolved in §Decisions below.

## Goals / Non-Goals

**Goals**

- Replace the entire Prisma schema with the redesigned model set, indexes, partial unique constraints, and enums in a single migration.
- Provide one explicit data-model contract every later change can target.
- Seed enough baseline data (8 roles, 39 permissions, 4 games, default rule-set/difficulty/policy versions, dictionary, 21 curated puzzles, 13 leaderboards, 6 retention policies) to keep `pnpm dev` and Cypress/Jest fixtures functional after reset.
- Resolve all enum and field conflicts between docs 7/8/9 once, in writing.
- Keep `@brain-games/shared` schema types compilable.

**Non-Goals**

- No NestJS module rewrites. Existing modules WILL fail to compile against the new Prisma client — that is expected and is the forcing function for follow-up changes.
- No new HTTP endpoints, no new workers, no Redis topology changes.
- No frontend changes.
- No data migration from the old schema. Greenfield reset only.
- No archive object-storage integration; the `DataArchive*` tables are created empty, with worker implementation deferred to `harden-concurrency-stack`.
- No PostgreSQL native partitioning. The design notes it for `AttemptOperationLog`; actual partition DDL is deferred.

## Decisions

### D1 — Greenfield reset over staged migration

`prisma migrate reset --force --skip-seed` drops the dev/local database, then a single fresh init migration applies the new schema, then `prisma db seed` rebuilds baseline rows. No data preservation, no dual-write window, no parallel-table strangler.

Rationale: zero production users; staged migration would cost weeks for no benefit.

### D2 — AttemptStatus adopts Doc 9 superset (13 values)

Doc 7 and Doc 8 listed 10; Doc 9 added `REVIEW_REQUIRED`, `REVOKED`, `ADMIN_CORRECTED`. Adopt the superset because the user opted into full Doc 9 concurrency scope which includes the admin arbitration workflow. Adding the values now is free; removing them later is a breaking migration.

Final values: `CREATED, CLAIMED, PLAYING, PAUSED, SUBMITTING, COMPLETED, ABANDONED, TIMEOUT, INTERRUPTED, INVALIDATED, REVIEW_REQUIRED, REVOKED, ADMIN_CORRECTED`.

### D3 — ChallengeMode adopts Doc 9 (6 values)

`RANKED, DAILY, CASUAL, PRACTICE, ROOM, ADMIN_TEST`. `ADMIN_TEST` lets admins exercise puzzles pre-publish without polluting leaderboards.

### D4 — Two separate validation enums

Conflict: Doc 8 defines `ValidationStatus = {UNVALIDATED, VALIDATING, VALID, INVALID, WARNING}` for config; Doc 9 defines `ValidationStatus = {PENDING, VALIDATING, VALID, INVALID, ERROR, REVIEW_REQUIRED}` for attempt validation. The semantic domains differ.

Resolution: split into two enums.

- `ConfigValidationStatus` (Doc 8 semantics) — used by `GameRuleSetVersion.validationStatus`, `PuzzleVersion.validationStatus`.
- `AttemptValidationStatus` (Doc 9 semantics) — used by `GameAttempt.validationStatus`, `AttemptValidationReport`.

### D5 — Generated-game version locking via seed + generatedContentHash + ruleSetVersionId

Conflict: Doc 8 §7.4 says `GENERATED` mode leaves `puzzleId`/`puzzleVersionId` null; Doc 9 §3.6 lists `puzzleVersionId` in must-write fields.

Resolution: `puzzleId` and `puzzleVersionId` are nullable on `GameAttempt`. For `contentMode = GENERATED`, the attempt persists `seed`, `generatedContentHash`, plus the always-required `ruleSetVersionId` and `difficultyId`. Replay validation re-runs the generator with the same `(ruleSetVersion, difficulty, seed)` and compares the hash. For curated/scheduled, `puzzleId` and `puzzleVersionId` are required (enforced in application layer).

### D6 — Unify all puzzle content under Puzzle + PuzzleVersion.content

Drop `LifePuzzle`, `PreciseCharacterPuzzle`, `AbsoluteCommandPuzzle`, `AbsoluteCommandPuzzleVersion`. The dictionary tables (`CharacterRadical`, `CharacterRoot`, `CharacterCombination`) are kept because they are reference data, not puzzles. Each `PuzzleVersion.content` is a JSON blob whose shape is owned by `@brain-games/game-engine` per-game adapter. Schema-validation of `content` is the responsibility of the application layer (Zod) and the engine's content-validator hook; the database stores `content` as opaque `Json` with a `contentHash` and `schemaVersion` for reproducibility.

### D7 — Drop all game-specific submission tables; introduce GameSubmission

`LifeRegionSubmission`, `PreciseCharacterRoundSubmission`, `AbsoluteCommandLog` are replaced by:
- `GameSubmission` (typed by `SubmissionType` enum: `FINAL`, `STEP`, `ROUND`, `REGION`, `COMMAND`, `CHECKPOINT`).
- `AttemptOperationLog` + `AttemptOperationBatch` for movement/command/event streams.
- `AttemptSnapshot` for before/after state captures.

### D8 — Three-table leaderboard pipeline

Replace `LeaderboardEntry` with: `ScoreRecord` (write-side, one row per attempt per leaderboard), `LeaderboardBest` (read-optimized BEST_PER_USER), `LeaderboardRankCache` (top-N display cache). `LeaderboardPeriod` adds period scoping. Separation lets us write transactionally on attempt finish (ScoreRecord), upsert atomically on best (LeaderboardBest), refresh asynchronously on display (RankCache).

### D9 — Full RBAC tables instead of User.role enum

`Role`, `Permission`, `UserRole`, `RolePermission`. The User model has NO `role` field. All authorization derives from joining `UserRole → Role → RolePermission → Permission`. Eight built-in roles are seeded; 39 permission keys cover catalog/puzzle/leaderboard/user/audit/data domains. The application enforces by permission key (e.g. `@RequirePermission('puzzle:publish')`), not by role.

### D10 — Rename Session → AuthSession; add status enum

Distinguishes auth sessions from challenge runtime sessions (`AttemptRuntimeSession`). `AuthSessionStatus` enum (`ACTIVE, REVOKED, EXPIRED, ROTATED, COMPROMISED`) makes lifecycle states explicit.

### D11 — Idempotency stored in PostgreSQL, not Redis

`IdempotencyRecord` model with `(userId, key)` unique constraint and short TTL. Redis is for short-lived locks; idempotency persistence needs durability across restarts and request retries.

### D12 — AttemptRuntimeSession separate from GameAttempt

`GameAttempt` is the persistent record of the challenge; `AttemptRuntimeSession` is the ephemeral access token. Separating them lets one attempt have multiple runtime-session attempts (e.g. re-claim after a session conflict that admins later forgive) without polluting the attempt record, and lets us index `(entryTokenHash)` uniquely without bloating the attempt row.

### D13 — Partial unique indexes for active rows

PostgreSQL partial indexes enforce single-active rows where the application requires it:

- One active `GameRuleSetVersion` per `(gameId)`.
- One active `GameDifficulty` per `(gameId, key)`.
- One active `GameContentPolicy` per `(gameId, difficultyId, mode)` with `NULLS NOT DISTINCT`.
- One active `GameChallengePolicy` per `(gameId, mode, difficultyId)` with `NULLS NOT DISTINCT`.
- One PUBLISHED `PuzzleVersion` per `(puzzleId)`.
- One active RANKED/DAILY attempt per `userId`.
- One active `AttemptRuntimeSession` per `attemptId`.

Prisma cannot express the `WHERE status = 'ACTIVE'` predicate, so these indexes are declared via raw SQL appended to the init migration. PostgreSQL 15+ `NULLS NOT DISTINCT` resolves the policy-uniqueness problem cleanly (deployed Postgres is 16).

### D14 — Decimal for rank values, Int for durations

`rankValue, tieValue1, tieValue2, tieValue3` use `Decimal(18,6)` (PostgreSQL `numeric`) to safely compare any metric (durationMs, score, accuracy %). `durationMs` stays `Int` because milliseconds fit comfortably in 32-bit signed (24 days).

### D15 — Audit logs are append-only at the application layer

No PostgreSQL trigger or rule prevents UPDATE/DELETE on `AdminAuditLog` and `ChallengeAuditLog`. Enforcement is in the application layer. Rationale: triggers complicate testing, migration, and database-level RBAC; the application layer plus permission RBAC plus `migrate diff` review is sufficient for current scale.

### D16 — JSON columns over EAV

Variable shapes (game `metadata`, puzzle `content`, policy `config`, operation log `payload`) use `Json`. EAV rejected because engine adapters know the shape, Zod validates at write time, JSONB indexing covers any query we currently need.

### D17 — Keep CharacterRadical / Root / Combination dictionary tables

These describe reusable reference data for the precise-character game engine, not puzzles. They survive the unification. They will be referenced by **stable key** (not DB ID) from `PuzzleVersion.content` JSON to remain reseed-stable.

### D18 — userId and gameId denormalized into hot child tables

`AttemptOperationLog`, `GameSubmission`, `ScoreRecord` carry `userId` and `gameId` columns even though those are derivable via `attemptId → GameAttempt`. Rationale: better partition keys, user-scoped/game-scoped analytics queries without joining on the huge attempt table, support future partitioning on `(gameId, createdAt)` or `(userId, createdAt)`.

## Resolved Enum Set (27 enums)

```
Identity:  UserStatus, AuthSessionStatus
Catalog:   GameStatus, ConfigStatus, ConfigValidationStatus, ContentMode, PuzzleSelectionStrategy
Puzzle:    PuzzleStatus, PuzzleVersionStatus, ScheduleGranularity
Runtime:   ChallengeMode, AttemptStatus, AttemptValidationStatus, ScoreEligibility,
           OperationLogMode, SnapshotType, SubmissionType, BatchStatus, IdempotencyStatus
Board:     LeaderboardScope, LeaderboardPeriodType, RankDirection, EntryPolicy, ScoreRecordStatus
Lifecycle: RetentionAction, ArchiveFormat, CleanupRunStatus
```

Exact value sets, ordering, and per-enum semantics are baked into `apps/api/prisma/schema.prisma` as authoritative source.

## Model Set (40 models, 8 domains)

| Domain | Models |
|---|---|
| Identity & Access (6) | `User`, `AuthSession`, `Role`, `Permission`, `UserRole`, `RolePermission` |
| Game Catalog & Policy (5) | `Game`, `GameRuleSetVersion`, `GameDifficulty`, `GameContentPolicy`, `GameChallengePolicy` |
| Puzzle System (6) | `Puzzle`, `PuzzleVersion`, `PuzzleSchedule`, `PuzzleTag`, `PuzzleTagBinding`, `PuzzleAsset` |
| Challenge Runtime (8) | `GameAttempt`, `AttemptRuntimeSession`, `AttemptOperationLog`, `AttemptOperationBatch`, `AttemptSnapshot`, `GameSubmission`, `AttemptValidationReport`, `ChallengeAuditLog` |
| Idempotency (1) | `IdempotencyRecord` |
| Leaderboard & Score (5) | `LeaderboardDefinition`, `LeaderboardPeriod`, `ScoreRecord`, `LeaderboardBest`, `LeaderboardRankCache` |
| Admin & Audit (2) | `AdminAuditLog`, `AdminReviewTask` |
| Data Lifecycle (4) | `DataRetentionPolicy`, `DataArchiveBatch`, `DataArchiveObject`, `DataCleanupRun` |
| Game-Specific Dictionary (3) | `CharacterRadical`, `CharacterRoot`, `CharacterCombination` |

Detailed field-by-field definition lives in `apps/api/prisma/schema.prisma`; that file is the single source of truth and is documented inline with section dividers matching the 8 domains.

## Raw SQL Partial Unique Indexes

Appended verbatim to the init migration:

```sql
-- One ACTIVE rule-set version per game
CREATE UNIQUE INDEX "uq_active_game_ruleset_version"
ON "GameRuleSetVersion" ("gameId") WHERE "status" = 'ACTIVE';

-- One ACTIVE difficulty per (game, key)
CREATE UNIQUE INDEX "uq_active_game_difficulty"
ON "GameDifficulty" ("gameId", "key") WHERE "status" = 'ACTIVE';

-- One ACTIVE content policy per (game, difficulty, mode) (NULLS treated as equal)
CREATE UNIQUE INDEX "uq_active_game_content_policy"
ON "GameContentPolicy" ("gameId", "difficultyId", "mode")
NULLS NOT DISTINCT WHERE "status" = 'ACTIVE';

-- One ACTIVE challenge policy per (game, mode, difficulty)
CREATE UNIQUE INDEX "uq_active_game_challenge_policy"
ON "GameChallengePolicy" ("gameId", "mode", "difficultyId")
NULLS NOT DISTINCT WHERE "status" = 'ACTIVE';

-- One PUBLISHED puzzle version per puzzle
CREATE UNIQUE INDEX "uq_published_puzzle_version"
ON "PuzzleVersion" ("puzzleId") WHERE "status" = 'PUBLISHED';

-- One active RANKED/DAILY attempt per user
CREATE UNIQUE INDEX "uq_user_active_ranked_attempt"
ON "GameAttempt" ("userId")
WHERE "mode" IN ('RANKED','DAILY')
  AND "status" IN ('CREATED','CLAIMED','PLAYING','SUBMITTING');

-- One active runtime session per attempt
CREATE UNIQUE INDEX "uq_attempt_active_runtime_session"
ON "AttemptRuntimeSession" ("attemptId")
WHERE "status" IN ('CREATED','CLAIMED','PLAYING');

-- Reaper scan indexes
CREATE INDEX "idx_attempt_reaper_expires"
ON "GameAttempt" ("status", "expiresAt")
WHERE "status" IN ('CREATED','CLAIMED','PLAYING','SUBMITTING');

CREATE INDEX "idx_attempt_reaper_heartbeat"
ON "GameAttempt" ("status", "lastHeartbeatAt")
WHERE "status" IN ('PLAYING','SUBMITTING');
```

## Seed Plan (7 modules)

`apps/api/prisma/seed.ts` orchestrates 7 idempotent modules under `apps/api/prisma/seed/`:

1. `permissions.ts` — upsert 39 `Permission` rows keyed by `resource:action`.
2. `roles.ts` — upsert 8 system `Role` rows (`isSystem=true`) + `RolePermission` mappings: `super_admin` (all 39), `admin` (38, ex `role:assign-super-admin`), `puzzle_editor` (11), `puzzle_reviewer` (9), `leaderboard_manager` (6), `user_manager` (6), `audit_viewer` (3), `readonly_operator` (all 11 `:read` perms).
3. `dictionary.ts` — upsert 20 `CharacterRadical` + 40 `CharacterRoot` + 125 `CharacterCombination` rows keyed by stable `key` / `(radicalId, rootId, resultChar)`.
4. `games.ts` — upsert 4 `Game` rows (PUBLISHED), one v1 ACTIVE `GameRuleSetVersion` per game, one ACTIVE `GameDifficulty` per legacy key, one ACTIVE `GameContentPolicy` (sliding-puzzle GENERATED with `sliding_puzzle_generator`; others CURATED), one ACTIVE `GameChallengePolicy` per `(game, mode)` for `RANKED` and `PRACTICE`.
5. `puzzles-curated.ts` — generate and upsert curated puzzles into generic `Puzzle + PuzzleVersion`: 9 life-game puzzles (deterministic seed-based generator), 9 PCB puzzles, 3 absolute-command puzzles. Content JSON shape is engine-specific; PCB solutions store stable `(radicalKey, rootKey)` tuples instead of DB IDs to remain reseed-stable.
6. `leaderboards.ts` — upsert 13 baseline `LeaderboardDefinition` rows (one per `(game, difficulty)` for RANKED/ALL_TIME plus per-puzzle boards for absolute-command).
7. `retention.ts` — upsert 6 default `DataRetentionPolicy` rows for `AttemptOperationLog`, `ChallengeAuditLog`, `AdminAuditLog`, `IdempotencyRecord`, `GameSubmission`, `AttemptSnapshot`.

Every module is idempotent (`upsert` keyed by stable business identifier). Re-running seed against an already-seeded DB produces no row-count change.

## Risks / Trade-offs

- **[Risk]** All NestJS modules will fail to compile after this change applies. → **Mitigation**: deliberate, atomic; legacy modules are excluded from `apps/api/tsconfig.json` until follow-up changes reinstate them. `AppModule` is reduced to `PrismaModule + RedisModule` so type-checking still passes on the kept set. API server is intentionally non-runnable until `introduce-challenge-runtime-gateway`.
- **[Risk]** Greenfield erases dev/local seed data. → **Mitigation**: `start.sh RESET_DB=1` mode prints a `WARNING: about to RESET local PostgreSQL database` banner and waits for the user to type `RESET` (or `OPSX_DB_RESET_CONFIRM=1` in CI). Production has no data.
- **[Risk]** 40 models in one schema file is unwieldy. → **Mitigation**: `schema.prisma` is organized with bold header comments demarcating the 8 domains. Downstream changes own their respective sections.
- **[Trade-off]** Denormalized `userId`/`gameId` on hot tables adds write cost and storage. → **Accepted**: read paths and future partitioning far outweigh the extra bytes.
- **[Trade-off]** Partial unique indexes declared via raw SQL bypass Prisma introspection. → **Accepted**: `prisma migrate dev` preserves the manually-edited migration; the team must not use `db pull` after this point.
- **[Trade-off]** Puzzle content stored as opaque `Json`. → **Accepted**: engine adapters own schema validation via Zod at boundary.
- **[Trade-off]** `AdminAuditLog` is not append-only at the DB level. → **Accepted** at current scale; can be hardened with triggers later when audit becomes compliance-relevant.

## Migration Plan

Executed during this change's apply phase:

1. `pnpm api -- prisma migrate reset --force --skip-seed` (drops local DB).
2. Replace `apps/api/prisma/schema.prisma` with new 40-model schema.
3. Delete every old `apps/api/prisma/migrations/*` directory; keep only `migration_lock.toml`.
4. `pnpm api -- prisma migrate dev --name init --create-only` (generates init migration).
5. Append partial-index raw SQL to the generated `migration.sql` (NULLS NOT DISTINCT form).
6. `pnpm api -- prisma migrate dev` (applies edited migration).
7. `pnpm api -- prisma generate` (regenerates typed client).
8. Replace `apps/api/prisma/seed.ts` + create 7 seed modules.
9. `pnpm api -- prisma db seed` (populates baseline rows).
10. Commit: schema, migration, seed, plus stubbed `apps/api/src/app.module.ts` and updated `apps/api/tsconfig.json` excludes.

**Rollback**: revert the commit, `prisma migrate reset --force` again. Greenfield by definition means rollback is destructive; acceptable pre-launch.

**Verification gate**: `prisma validate` passes; `prisma migrate status` reports up-to-date; `prisma db seed` exits 0; partial-index psql tests reject duplicates citing the expected constraint names; row counts match baseline (8 roles, 39 permissions, 4 games, 4 ACTIVE rule-set versions, 10 ACTIVE difficulties, 4 ACTIVE content policies, 8 ACTIVE challenge policies, 21 PUBLISHED puzzles + 21 PUBLISHED puzzle versions, 13 ACTIVE leaderboards, 6 retention policies, dictionary 20/40/125).

## Open Questions

1. RANKED partial unique index per-`userId` vs per-`(userId, gameId)`. **Adopted**: per-`userId`. Revisit when concurrent multi-game play becomes a product goal.
2. `Puzzle.currentVersionId` denormalized pointer vs always-join. **Adopted**: keep denormalized pointer, updated transactionally on publish.
3. PostgreSQL native partitioning of `AttemptOperationLog`. **Deferred** to `harden-concurrency-stack`.
4. Optional `User.metadata` Json column. **Deferred**; trivial to add via additive migration.
5. `AdminReviewTask.status` reuses `ConfigStatus`. **Adopted**; revisit if review workflow grows distinct states.
