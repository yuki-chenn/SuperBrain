# Proposal — redesign-database-schema-greenfield

## Why

The current Prisma schema (17 models) was built incrementally for an MVP with 4 games and cannot host the upcoming Challenge Runtime, RBAC, versioned puzzle catalog, and concurrency-hardened leaderboard pipeline described in `docs/7-9-*.md`. It lacks versioned game configuration, a generic `Puzzle + PuzzleVersion` substrate, a richer attempt model (CAS state machine, runtime sessions, idempotency, audit), RBAC tables, a three-table leaderboard pipeline, and a data-lifecycle layer.

Because the project is pre-launch with no production data we adopt a **greenfield reset**: drop the old schema, replace it wholesale with a 40-model schema spanning 8 data domains, and re-seed. No data migration scripts are written.

## What Changes

- **BREAKING** Drop all 17 existing Prisma models and replace with the redesigned 40-model schema spanning 8 data domains (Identity & Access, Game Catalog & Policy, Puzzle System, Challenge Runtime, Idempotency, Leaderboard & Score, Admin & Audit, Data Lifecycle, plus the surviving Game-Specific Dictionary).
- **BREAKING** Drop game-specific puzzle and submission tables (`LifePuzzle`, `LifeRegionSubmission`, `PreciseCharacterPuzzle`, `PreciseCharacterRoundSubmission`, `AbsoluteCommandPuzzle`, `AbsoluteCommandPuzzleVersion`, `AbsoluteCommandLog`). All puzzle content moves into `PuzzleVersion.content` JSON; all in-game submissions move into `GameSubmission` and `AttemptOperationLog`.
- **BREAKING** Remove `User.role` enum field. Introduce four-table RBAC (`Role`, `Permission`, `UserRole`, `RolePermission`) with 8 seeded roles and ~30 permission keys.
- **BREAKING** Rename `Session` to `AuthSession` and add `AuthSessionStatus` enum (`ACTIVE`, `REVOKED`, `EXPIRED`, `ROTATED`, `COMPROMISED`).
- **BREAKING** Replace `GameAttempt` schema: 30+ fields, 13-state `AttemptStatus`, `ChallengeMode` enum (6 values incl. `ADMIN_TEST`), version-lock columns (`ruleSetVersionId`, `difficultyId`, `difficultyVersion`, `contentPolicyId`, `challengePolicyId`, `puzzleId`, `puzzleVersionId`, `operationLogPolicyId`, `contentResolvedType`, `generatedContentHash`, `policySnapshot`), runtime columns (`idempotencyKey`, `statusVersion`, `lastHeartbeatAt`, `expiresAt`), validation columns (`validationStatus`, `invalidReason`, `abandonReason`, `interruptReason`), and timestamps for every state transition.
- **BREAKING** Replace `LeaderboardEntry` with three tables: `ScoreRecord` (per-attempt write), `LeaderboardBest` (per-user materialized best per leaderboard/period), `LeaderboardRankCache` (top-N display cache). Add `LeaderboardPeriod` to model daily/weekly/monthly/seasonal slices.
- Add `GameRuleSetVersion`, `GameDifficulty`, `GameContentPolicy`, `GameChallengePolicy` to version every aspect of game configuration. Each carries a `configHash` and `ConfigStatus`; only one row per `(gameId, key)` may be `ACTIVE`.
- Add `Puzzle`, `PuzzleVersion`, `PuzzleSchedule`, `PuzzleTag`, `PuzzleTagBinding`, `PuzzleAsset` to support curated, generated, scheduled, and mixed content modes.
- Add attempt-runtime tables: `AttemptRuntimeSession`, `AttemptOperationLog`, `AttemptOperationBatch`, `AttemptSnapshot`, `GameSubmission`, `AttemptValidationReport`, `ChallengeAuditLog`, `IdempotencyRecord`.
- Add admin tables: `AdminAuditLog` (reshaped) and `AdminReviewTask` for the `REVIEW_REQUIRED` arbitration workflow.
- Add data-lifecycle tables: `DataRetentionPolicy`, `DataArchiveBatch`, `DataArchiveObject`, `DataCleanupRun`.
- Keep dictionary tables for the precise-character game (`CharacterRadical`, `CharacterRoot`, `CharacterCombination`) — these are reference data, not puzzles.
- Define the resolved enum set per the doc consolidation (27 enums total). Notable splits: `ConfigValidationStatus` (Doc 8 semantics) vs `AttemptValidationStatus` (Doc 9 semantics).
- Add partial unique indexes enforcing single-active config rows and single-active ranked attempt per user.
- **BREAKING** Replace `apps/api/prisma/seed/*` with new seed scripts that bootstrap: 8 roles + 39 permissions, 4 published games with `GameRuleSetVersion v1` + default `GameDifficulty` + default `GameChallengePolicy` per mode + default `GameContentPolicy`, curated puzzles ported as generic `Puzzle/PuzzleVersion` rows, dictionary data, baseline leaderboard definitions, default retention policies.
- **BREAKING** Replace all existing migrations with a single fresh init migration (greenfield).

## Capabilities

### New Capabilities

- `database-schema`: Authoritative description of all Prisma models, enums, constraints, indexes, and seed data. Every behavioral capability in later changes will reference rows from this schema.

### Modified Capabilities

None in this change. The existing behavioral capabilities (`attempts`, `auth`, `leaderboards`, `games-catalog`, `life-game`, `precise-character-building`, `sliding-puzzle`) will become temporarily inconsistent with the new schema; they are deliberately deferred and will be reworked by the follow-up changes (`introduce-rbac-and-auth-session`, `introduce-challenge-runtime-gateway`, `unify-puzzle-and-game-config`, `redesign-leaderboard-pipeline`, `harden-concurrency-stack`, `retire-game-specific-endpoints`).

## Impact

**Code**

- `apps/api/prisma/schema.prisma` — full rewrite (40 models + 27 enums).
- `apps/api/prisma/migrations/*` — wiped and regenerated as a single `init` migration with appended partial-unique-index SQL.
- `apps/api/prisma/seed.ts` + `apps/api/prisma/seed/*` — rewritten as composable modules (permissions, roles, dictionary, games, puzzles-curated, leaderboards, retention).
- `apps/api/src/app.module.ts` — temporarily reduced to `PrismaModule + RedisModule` only; legacy modules (auth, users, games/*, attempts, leaderboards, admin) are excluded from compilation via `apps/api/tsconfig.json` `exclude` until follow-up changes rebuild them.
- `packages/shared` — unaffected (was already decoupled from Prisma types, uses standalone Zod schemas).

**Local infra**

- `start.sh` gained a `RESET_DB=1` mode that prints a warning banner and gates the destructive reset behind a confirmation prompt or `OPSX_DB_RESET_CONFIRM=1` env var.

**Specs**

- New `openspec/specs/database-schema/spec.md` (will be created by sync after this change archives).
- Legacy behavioral specs (`attempts`, `auth`, `leaderboards`, etc.) left intact for follow-up changes to revise.

**Docs**

- `docs/Overview-Database.md` rewritten to describe the new 40-model schema.
- `docs/Overview-Framework.md` gains a forward reference; full architecture rewrite deferred to `introduce-challenge-runtime-gateway`.

**Out of scope**

- No NestJS module rewrites. No frontend changes. No new endpoints. No worker layer. No Redis topology changes. No production data migration.
