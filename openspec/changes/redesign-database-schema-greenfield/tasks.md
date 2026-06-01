# Tasks — redesign-database-schema-greenfield

## 1. Preparation

- [x] 1.1 Announce intent in repo `start.sh` warning banner: print `WARNING: about to RESET local database` before any destructive command, gated behind `OPSX_DB_RESET_CONFIRM=1` for non-interactive runs.
- [x] 1.2 Snapshot any locally-valuable dev data outside Postgres (e.g. seed fixtures) before deletion — none in repo today, just verify.
- [x] 1.3 Verify Postgres + Redis containers are up via `docker compose ps`.
- [x] 1.4 Stop any running API/web dev servers to release Prisma client locks.

## 2. Wipe Legacy Schema and Migrations

- [x] 2.1 Run `pnpm api -- prisma migrate reset --force --skip-seed` to drop all tables.
- [x] 2.2 Delete every directory under `apps/api/prisma/migrations/` except keeping `migration_lock.toml`.
- [x] 2.3 Empty `apps/api/prisma/schema.prisma` (keep only generator + datasource blocks).
- [x] 2.4 Empty `apps/api/prisma/seed/` (delete `absolute-command-data.ts`, `leaderboards.ts`, `life-puzzle-generator.ts`, `life-puzzle-smoke.ts`, `pcb-data.ts`, `pcb-puzzle-generator.ts`, `random.ts`) and reduce `seed.ts` to a placeholder that imports nothing.
- [x] 2.5 Confirm `pnpm api -- prisma validate` still passes on the empty schema.

## 3. Author Enums

- [x] 3.1 In `apps/api/prisma/schema.prisma`, add the 27 enums from design §"Resolved Enum Set" (UserStatus, AuthSessionStatus, GameStatus, ConfigStatus, ConfigValidationStatus, ContentMode, PuzzleSelectionStrategy, PuzzleStatus, PuzzleVersionStatus, ScheduleGranularity, ChallengeMode, AttemptStatus, AttemptValidationStatus, ScoreEligibility, OperationLogMode, SnapshotType, SubmissionType, BatchStatus, IdempotencyStatus, LeaderboardScope, LeaderboardPeriodType, RankDirection, EntryPolicy, ScoreRecordStatus, RetentionAction, ArchiveFormat, CleanupRunStatus).
- [x] 3.2 Verify ordering and value names match the design exactly (especially `AttemptStatus` 13 values, `ChallengeMode` 6 values, the two validation enums split).
- [x] 3.3 Run `pnpm api -- prisma format` to canonicalize.

## 4. Author Identity & Access Models

- [x] 4.1 Add `User` model per design §Identity (no `role` field, has `status`, `deletedAt`).
- [x] 4.2 Add `AuthSession` model with `status AuthSessionStatus`, FK to User with `onDelete: Cascade`, unique `refreshTokenHash`.
- [x] 4.3 Add `Role`, `Permission`, `UserRole` (composite PK), `RolePermission` (composite PK) with all indexes.
- [x] 4.4 Wire User relations: `authSessions`, `userRoles`, `attempts`, `submissions`, `scoreRecords`, `leaderboardBests`, `auditedActions`, `reviewRequests`, `reviewedTasks`.

## 5. Author Game Catalog & Policy Models

- [x] 5.1 Add `Game` model with all fields (slug unique, status, sortOrder, metadata, publishedAt, archivedAt).
- [x] 5.2 Add `GameRuleSetVersion` with `validationStatus ConfigValidationStatus`, unique `(gameId, version)` and `(gameId, configHash)`.
- [x] 5.3 Add `GameDifficulty` with `version` field, unique `(gameId, key, version)` and `(gameId, key, configHash)`.
- [x] 5.4 Add `GameContentPolicy` with `contentMode`, `selectionStrategy`, `generatorKey`, JSON config fields.
- [x] 5.5 Add `GameChallengePolicy` with all runtime-policy fields (heartbeat, operation log mode, snapshot policy, leaderboard eligibility).
- [x] 5.6 Wire all Game relations.

## 6. Author Puzzle System Models

- [x] 6.1 Add `Puzzle` with `currentVersionId` denormalized pointer, unique `(gameId, slug)`.
- [x] 6.2 Add `PuzzleVersion` with `content Json`, `contentHash`, `referenceSolution`, unique `(puzzleId, version)` and `(puzzleId, contentHash)`.
- [x] 6.3 Add `PuzzleSchedule` with time-window fields and timezone default `Asia/Shanghai`.
- [x] 6.4 Add `PuzzleTag` (gameId nullable for global tags) and `PuzzleTagBinding` composite PK.
- [x] 6.5 Add `PuzzleAsset` with `sha256` unique, BigInt `sizeBytes`.

## 7. Author Challenge Runtime Models

- [x] 7.1 Add `GameAttempt` with all 30+ fields per design §GameAttempt (status, mode, version-lock IDs, runtime fields, timestamp-per-state, durationMs, scoreValue Decimal, validationStatus, reasons, statusVersion).
- [x] 7.2 Add `@@unique([userId, idempotencyKey])` and all 10 listed indexes.
- [x] 7.3 Add `AttemptRuntimeSession` with unique `entryTokenHash` and unique `playSessionId`.
- [x] 7.4 Add `AttemptOperationLog` with denormalized `userId`/`gameId`, unique `(attemptId, seqStart, seqEnd)`.
- [x] 7.5 Add `AttemptOperationBatch` with unique `(attemptId, startSeq, endSeq)`.
- [x] 7.6 Add `AttemptSnapshot` with `snapshotType` and `storageKey` (for object-storage offload).
- [x] 7.7 Add `GameSubmission` with `submissionType`, `idempotencyKey`, unique `(attemptId, idempotencyKey)`.
- [x] 7.8 Add `AttemptValidationReport` with `isFinal` flag.
- [x] 7.9 Add `ChallengeAuditLog` with `fromStatus`/`toStatus` enum columns.

## 8. Author Idempotency Model

- [x] 8.1 Add `IdempotencyRecord` with unique `(userId, key)`, indexed `expiresAt` and `(status, lockedUntil)`.

## 9. Author Leaderboard & Score Models

- [x] 9.1 Add `LeaderboardDefinition` with `displayLimit`, `adminQueryLimit`, `entryPolicy`, `tieBreakers Json`.
- [x] 9.2 Add `LeaderboardPeriod` with `periodKey` unique per leaderboard.
- [x] 9.3 Add `ScoreRecord` with `rankValue` and three `tieValue*` Decimals, `status`, `recordedAt`, revocation fields.
- [x] 9.4 Add `LeaderboardBest` with unique `(leaderboardId, periodId, userId)`.
- [x] 9.5 Add `LeaderboardRankCache` with both unique `(leaderboardId, periodId, rankPosition)` and `(leaderboardId, periodId, userId)`, plus display-name/avatar snapshots.

## 10. Author Admin & Audit Models

- [x] 10.1 Add `AdminAuditLog` with actor user FK (nullable), `before`/`after Json?`, ipAddress + userAgent, indexes on `(actorUserId, createdAt)`, `(resourceType, resourceId, createdAt)`, `(action, createdAt)`, `(createdAt)`.
- [x] 10.2 Add `AdminReviewTask` with two User relations (`requestedBy`, `reviewedBy`) using named `@relation("review_requests")` / `@relation("review_reviews")`.

## 11. Author Data Lifecycle Models

- [x] 11.1 Add `DataRetentionPolicy` with unique `(tableName, dataClass, gameId, mode)` treating NULLs correctly via Prisma (use compound unique with nullable fields — verify Prisma generates the constraint as expected).
- [x] 11.2 Add `DataArchiveBatch` with BigInt `totalBytes`, status enum.
- [x] 11.3 Add `DataArchiveObject` with unique `storageKey`, BigInt `sizeBytes`, sha256.
- [x] 11.4 Add `DataCleanupRun` with optional policy FK.

## 12. Author Dictionary Models

- [x] 12.1 Add `CharacterRadical` with unique `key`, indexed `(category, enabled)`.
- [x] 12.2 Add `CharacterRoot` with unique `key`, indexed `(complexityLevel, enabled)`.
- [x] 12.3 Add `CharacterCombination` with unique `(radicalId, rootId, resultChar)`, indexed `(radicalId, rootId)` and `(difficulty, enabled)`.

## 13. Validate Schema and Generate Init Migration

- [x] 13.1 Run `pnpm api -- prisma format` and review the formatted output for stray duplicates or ordering bugs.
- [x] 13.2 Run `pnpm api -- prisma validate`. Fix any errors before proceeding.
- [x] 13.3 Run `pnpm api -- prisma migrate dev --name init --create-only`. This creates `apps/api/prisma/migrations/<timestamp>_init/migration.sql` without applying it.
- [x] 13.4 Open the generated `migration.sql` and verify it creates 40 tables plus all enums.

## 14. Append Partial Unique Indexes to Migration

- [x] 14.1 Append the seven partial unique indexes (`uq_active_game_ruleset_version`, `uq_active_game_difficulty`, `uq_active_game_content_policy`, `uq_active_game_challenge_policy`, `uq_published_puzzle_version`, `uq_user_active_ranked_attempt`, `uq_attempt_active_runtime_session`) and the two reaper indexes (`idx_attempt_reaper_expires`, `idx_attempt_reaper_heartbeat`) to the end of `migration.sql`, copying the exact SQL from design §"Raw SQL Partial Unique Indexes".
- [x] 14.2 Save and apply: `pnpm api -- prisma migrate dev`.
- [x] 14.3 Verify in psql: `\d "GameAttempt"` shows the partial index, and `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'uq_active_%'` returns the expected names.

## 15. Regenerate Prisma Client

- [x] 15.1 Run `pnpm api -- prisma generate`.
- [x] 15.2 Confirm `apps/api/node_modules/.prisma/client` exports types for all 40 models.

## 16. Stub Out Stale Application References

- [x] 16.1 In `packages/shared/src/`, identify Zod schemas or TS types that referenced removed Prisma types (e.g. `LifePuzzle`, `LeaderboardEntry`). Replace with self-contained Zod schemas matching the legacy shape, decoupled from `@prisma/client`. These remain temporary stubs to keep `packages/shared` compilable; full alignment ships with later changes.
- [x] 16.2 In `apps/api/src`, add `// @ts-expect-error - schema redesign WIP, addressed in change introduce-challenge-runtime-gateway` comments above lines that import removed Prisma types, OR exclude those files from compilation via a temporary `tsconfig.exclude` entry. Goal: keep `pnpm api -- pnpm build` reaching a known-broken set rather than crashing on parse errors. Acceptable to leave the API server non-runnable at end of this change; downstream changes restore it.
- [x] 16.3 Document in commit message which modules are intentionally broken and which change will fix each.

## 17. Author Seed Modules

- [x] 17.1 Create `apps/api/prisma/seed/permissions.ts` exporting an idempotent `seedPermissions(prisma)` that upserts the ~30 permission keys (resource:action format) listed in design.
- [x] 17.2 Create `apps/api/prisma/seed/roles.ts` exporting `seedRoles(prisma)` that upserts 8 system roles (`isSystem=true`) and the `RolePermission` mappings per design §Seed Plan.
- [x] 17.3 Create `apps/api/prisma/seed/games.ts` exporting `seedGames(prisma)` that upserts 4 `Game` rows (PUBLISHED, with sortOrder), plus for each game: one v1 ACTIVE `GameRuleSetVersion`, one ACTIVE `GameDifficulty` per legacy key (`easy`, `normal`, `hard` where applicable), one ACTIVE `GameContentPolicy` (sliding-puzzle: GENERATED + generatorKey `sliding_puzzle_generator`; others: CURATED), one ACTIVE `GameChallengePolicy` per `(game, mode)` for `RANKED` and `PRACTICE`.
- [x] 17.4 Create `apps/api/prisma/seed/dictionary.ts` porting `pcb-data.ts` into `CharacterRadical`, `CharacterRoot`, `CharacterCombination` upserts keyed by `key` and `(radicalId, rootId, resultChar)`.
- [x] 17.5 Create `apps/api/prisma/seed/puzzles-curated.ts` porting `life-puzzle-generator.ts`, `pcb-puzzle-generator.ts`, `absolute-command-data.ts` into `Puzzle` + `PuzzleVersion(PUBLISHED)` rows; each puzzle's `content` JSON shape matches the engine's expectation (life-game: `{width,height,boundary,initialState,stableState,targetRegions,targetAnswers,stableGeneration}`; PCB: `{boardSize,radicalPool,cells,solutionRounds,config}`; absolute-command: `{size,startCoord,cells,rules}`).
- [x] 17.6 Create `apps/api/prisma/seed/leaderboards.ts` upserting one ACTIVE `LeaderboardDefinition` per `(game, difficulty)` for `mode=RANKED, periodType=ALL_TIME` with default `rankMetric='durationMs'`, `rankDirection=ASC`, `tieBreakers=[]`.
- [x] 17.7 Create `apps/api/prisma/seed/retention.ts` upserting default `DataRetentionPolicy` rows for `AttemptOperationLog`, `ChallengeAuditLog`, `AdminAuditLog`, `IdempotencyRecord`, `GameSubmission` per design.
- [x] 17.8 Rewrite `apps/api/prisma/seed.ts` to invoke the modules in this order: permissions → roles → dictionary → games → puzzles-curated → leaderboards → retention. Wrap each in try/catch with descriptive logging.

## 18. Run Seed and Verify

- [x] 18.1 Run `pnpm api -- prisma db seed` against the freshly migrated database. Expect zero errors.
- [x] 18.2 Run a verification script (one-off `prisma studio` or SQL queries) confirming:
  - `Role` count = 8 (all `isSystem=true`)
  - `Permission` count ≥ 30
  - `RolePermission` count for super_admin = total `Permission` count
  - `Game` PUBLISHED count = 4 with the four expected slugs
  - Each game has ≥1 ACTIVE `GameRuleSetVersion`, ≥1 ACTIVE `GameDifficulty`, ≥1 ACTIVE `GameContentPolicy`, ≥1 ACTIVE `GameChallengePolicy`
  - `LeaderboardDefinition` ACTIVE count ≥ 4
  - Dictionary counts (`CharacterRadical`, `CharacterRoot`, `CharacterCombination`) > 0
  - `DataRetentionPolicy` count ≥ 5
- [x] 18.3 Run `pnpm api -- prisma db seed` a SECOND time; verify it exits 0 and row counts are unchanged (idempotency).

## 19. Validate Partial Index Behaviour

- [x] 19.1 Manual psql test: insert two `GameDifficulty` rows with the same `(gameId, key)` both `status='ACTIVE'`; second insert MUST fail citing `uq_active_game_difficulty`.
- [x] 19.2 Manual psql test: insert two `PuzzleVersion` rows with the same `puzzleId` both `status='PUBLISHED'`; second insert MUST fail citing `uq_published_puzzle_version`.
- [x] 19.3 Manual psql test: insert two `GameAttempt` rows for the same `userId` both `mode='RANKED', status='PLAYING'`; second insert MUST fail citing `uq_user_active_ranked_attempt`.
- [x] 19.4 Manual psql test: insert two `AttemptRuntimeSession` rows for the same `attemptId` both `status='PLAYING'`; second insert MUST fail citing `uq_attempt_active_runtime_session`.

## 20. Update Tooling and Documentation

- [x] 20.1 Update `start.sh` if changes to migration commands are needed (most likely no change beyond the warning banner from task 1.1).
- [x] 20.2 Update `apps/api/.env.example` if any new env vars surface during seed (none expected for this change).
- [x] 20.3 In `docs/Overview-Database.md`, REPLACE the existing content with the new authoritative database overview generated from this change's design (introductory section, 8-domain table list, ER overview, links to follow-up changes for behavior). Keep the filename so external references stay valid.
- [x] 20.4 Add a short note at the top of `docs/Overview-Framework.md` pointing to the new `Overview-Database.md` and stating the schema reform is complete while the application layer rebuild is in flight (Changes 2–7).
- [x] 20.5 Do NOT create the `rule-*.md` files yet — those belong to the final change after all module reforms land.

## 21. Final Verification

- [x] 21.1 Run `pnpm api -- prisma migrate status` → reports up-to-date.
- [x] 21.2 Run `pnpm api -- prisma validate` → passes.
- [x] 21.3 Run `pnpm api -- prisma generate` → passes.
- [x] 21.4 Run `pnpm api -- prisma db seed` → idempotent, zero errors.
- [x] 21.5 Run `pnpm shared -- pnpm build` (or equivalent) → `packages/shared` compiles even with stub Zod schemas in place.
- [x] 21.6 Run `openspec validate redesign-database-schema-greenfield` (if such a CLI exists in this project) or manually re-check artifacts vs the design.
- [x] 21.7 Commit all changes with message: `refactor(db): greenfield reset to 40-model redesign — apply via openspec change redesign-database-schema-greenfield`.

## 22. Handoff to Follow-up Changes

- [x] 22.1 Open issues / new openspec changes for the six follow-up streams: `introduce-rbac-and-auth-session`, `introduce-challenge-runtime-gateway`, `unify-puzzle-and-game-config`, `redesign-leaderboard-pipeline`, `harden-concurrency-stack`, `retire-game-specific-endpoints`.
- [x] 22.2 Each follow-up change MUST list `redesign-database-schema-greenfield` as a prerequisite in its proposal.
- [x] 22.3 Communicate to the team: API server WILL NOT run end-to-end until `introduce-challenge-runtime-gateway` (Change 3) lands. Use stub builds for local UI work in the interim.
