-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "AuthSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'ROTATED', 'COMPROMISED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ConfigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConfigValidationStatus" AS ENUM ('UNVALIDATED', 'VALIDATING', 'VALID', 'INVALID', 'WARNING');

-- CreateEnum
CREATE TYPE "ContentMode" AS ENUM ('GENERATED', 'CURATED', 'SCHEDULED', 'MIXED');

-- CreateEnum
CREATE TYPE "PuzzleSelectionStrategy" AS ENUM ('RANDOM', 'ROUND_ROBIN', 'MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY', 'WEIGHTED_RANDOM');

-- CreateEnum
CREATE TYPE "PuzzleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PuzzleVersionStatus" AS ENUM ('DRAFT', 'VALIDATING', 'VALID', 'INVALID', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScheduleGranularity" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'SEASONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChallengeMode" AS ENUM ('RANKED', 'DAILY', 'CASUAL', 'PRACTICE', 'ROOM', 'ADMIN_TEST');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('CREATED', 'CLAIMED', 'PLAYING', 'PAUSED', 'SUBMITTING', 'COMPLETED', 'ABANDONED', 'TIMEOUT', 'INTERRUPTED', 'INVALIDATED', 'REVIEW_REQUIRED', 'REVOKED', 'ADMIN_CORRECTED');

-- CreateEnum
CREATE TYPE "AttemptValidationStatus" AS ENUM ('PENDING', 'VALIDATING', 'VALID', 'INVALID', 'ERROR', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ScoreEligibility" AS ENUM ('NOT_ELIGIBLE', 'ELIGIBLE', 'RECORDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OperationLogMode" AS ENUM ('NONE', 'SUMMARY', 'EVENT', 'BATCHED', 'FULL');

-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('INITIAL', 'CHECKPOINT', 'FINAL', 'ERROR', 'VALIDATION', 'ADMIN_REVIEW');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('FINAL', 'STEP', 'ROUND', 'REGION', 'COMMAND', 'CHECKPOINT');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACCEPTED', 'DUPLICATE', 'REJECTED', 'FLUSHED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeaderboardScope" AS ENUM ('GLOBAL', 'DAILY', 'WEEKLY', 'MONTHLY', 'SEASONAL', 'PUZZLE', 'FRIENDS');

-- CreateEnum
CREATE TYPE "LeaderboardPeriodType" AS ENUM ('ALL_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'SEASONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RankDirection" AS ENUM ('ASC', 'DESC');

-- CreateEnum
CREATE TYPE "EntryPolicy" AS ENUM ('BEST_PER_USER', 'ALL_ATTEMPTS');

-- CreateEnum
CREATE TYPE "ScoreRecordStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'REVOKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RetentionAction" AS ENUM ('KEEP', 'COMPACT', 'ARCHIVE', 'DELETE', 'ANONYMIZE');

-- CreateEnum
CREATE TYPE "ArchiveFormat" AS ENUM ('JSONL_GZIP', 'PARQUET', 'CSV_GZIP');

-- CreateEnum
CREATE TYPE "CleanupRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL_FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "refreshTokenFamilyId" TEXT NOT NULL,
    "status" "AuthSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "replacedBySessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "coverUrl" TEXT,
    "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRuleSetVersion" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "engineKey" TEXT NOT NULL,
    "engineVersion" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL DEFAULT '{}',
    "configHash" TEXT NOT NULL,
    "validationStatus" "ConfigValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "validationReport" JSONB NOT NULL DEFAULT '{}',
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRuleSetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameDifficulty" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxDurationMs" INTEGER,
    "config" JSONB NOT NULL DEFAULT '{}',
    "configHash" TEXT NOT NULL,
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameDifficulty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameContentPolicy" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "difficultyId" TEXT,
    "mode" "ChallengeMode",
    "contentMode" "ContentMode" NOT NULL,
    "selectionStrategy" "PuzzleSelectionStrategy" NOT NULL DEFAULT 'RANDOM',
    "generatorKey" TEXT,
    "generatorConfig" JSONB NOT NULL DEFAULT '{}',
    "puzzlePoolFilter" JSONB NOT NULL DEFAULT '{}',
    "scheduleGranularity" "ScheduleGranularity",
    "allowRepeatedPuzzle" BOOLEAN NOT NULL DEFAULT true,
    "repeatCooldownHours" INTEGER,
    "weightConfig" JSONB NOT NULL DEFAULT '{}',
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameContentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameChallengePolicy" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "mode" "ChallengeMode" NOT NULL DEFAULT 'RANKED',
    "difficultyId" TEXT,
    "allowResume" BOOLEAN NOT NULL DEFAULT false,
    "allowMultipleActive" BOOLEAN NOT NULL DEFAULT false,
    "requiresHeartbeat" BOOLEAN NOT NULL DEFAULT true,
    "heartbeatIntervalSec" INTEGER NOT NULL DEFAULT 5,
    "heartbeatTimeoutSec" INTEGER NOT NULL DEFAULT 15,
    "operationLogMode" "OperationLogMode" NOT NULL DEFAULT 'BATCHED',
    "operationBatchSize" INTEGER NOT NULL DEFAULT 20,
    "snapshotEveryNEvents" INTEGER,
    "saveInitialSnapshot" BOOLEAN NOT NULL DEFAULT true,
    "saveFinalSnapshot" BOOLEAN NOT NULL DEFAULT true,
    "eligibleForLeaderboard" BOOLEAN NOT NULL DEFAULT true,
    "maxSubmitRetry" INTEGER NOT NULL DEFAULT 1,
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameChallengePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficultyId" TEXT,
    "status" "PuzzleStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" TEXT,
    "source" TEXT,
    "estimatedDurationSec" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleVersion" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "engineKey" TEXT NOT NULL,
    "engineVersion" TEXT,
    "content" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "referenceSolution" JSONB,
    "validationStatus" "ConfigValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "validationReport" JSONB NOT NULL DEFAULT '{}',
    "status" "PuzzleVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleSchedule" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "puzzleVersionId" TEXT NOT NULL,
    "difficultyId" TEXT,
    "mode" "ChallengeMode" NOT NULL DEFAULT 'DAILY',
    "granularity" "ScheduleGranularity" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuzzleSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleTag" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleTagBinding" (
    "puzzleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleTagBinding_pkey" PRIMARY KEY ("puzzleId","tagId")
);

-- CreateTable
CREATE TABLE "PuzzleAsset" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "puzzleId" TEXT,
    "puzzleVersionId" TEXT,
    "assetKey" TEXT NOT NULL,
    "url" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "mode" "ChallengeMode" NOT NULL DEFAULT 'RANKED',
    "status" "AttemptStatus" NOT NULL DEFAULT 'CREATED',
    "scoreEligibility" "ScoreEligibility" NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "ruleSetVersionId" TEXT NOT NULL,
    "difficultyId" TEXT,
    "difficultyVersion" INTEGER,
    "contentPolicyId" TEXT,
    "challengePolicyId" TEXT,
    "operationLogPolicyId" TEXT,
    "contentResolvedType" "ContentMode" NOT NULL,
    "puzzleId" TEXT,
    "puzzleVersionId" TEXT,
    "seed" TEXT,
    "generatedContentHash" TEXT,
    "policySnapshot" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "statusVersion" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "playingAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "timeoutAt" TIMESTAMP(3),
    "interruptedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "scoreValue" DECIMAL(18,6),
    "validationStatus" "AttemptValidationStatus" NOT NULL DEFAULT 'PENDING',
    "metricsSummary" JSONB NOT NULL DEFAULT '{}',
    "invalidReason" TEXT,
    "abandonReason" TEXT,
    "interruptReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptRuntimeSession" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryTokenHash" TEXT NOT NULL,
    "playSessionId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'CREATED',
    "claimedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptRuntimeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptOperationLog" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playSessionId" TEXT,
    "batchId" TEXT,
    "seqStart" INTEGER NOT NULL,
    "seqEnd" INTEGER NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 1,
    "logMode" "OperationLogMode" NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT,
    "clientCreatedAt" TIMESTAMP(3),
    "serverReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptOperationBatch" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT,
    "playSessionId" TEXT,
    "startSeq" INTEGER NOT NULL,
    "endSeq" INTEGER NOT NULL,
    "operationCount" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACCEPTED',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptOperationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptSnapshot" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "snapshotType" "SnapshotType" NOT NULL,
    "state" JSONB,
    "stateHash" TEXT NOT NULL,
    "storageKey" TEXT,
    "compressed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSubmission" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playSessionId" TEXT NOT NULL,
    "submissionType" "SubmissionType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "roundIndex" INTEGER,
    "regionId" TEXT,
    "seq" INTEGER,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "validationPassed" BOOLEAN,
    "validationResult" JSONB NOT NULL DEFAULT '{}',
    "errorReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptValidationReport" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "validatorKey" TEXT NOT NULL,
    "validatorVersion" TEXT,
    "passed" BOOLEAN NOT NULL,
    "scoreAccepted" BOOLEAN NOT NULL DEFAULT false,
    "antiCheatFlags" JSONB NOT NULL DEFAULT '[]',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "report" JSONB NOT NULL DEFAULT '{}',
    "errorReason" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptValidationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAuditLog" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT,
    "gameId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "AttemptStatus",
    "toStatus" "AttemptStatus",
    "reason" TEXT,
    "requestId" TEXT,
    "playSessionId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "responseBody" JSONB,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardDefinition" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "LeaderboardScope" NOT NULL DEFAULT 'GLOBAL',
    "periodType" "LeaderboardPeriodType" NOT NULL DEFAULT 'ALL_TIME',
    "mode" "ChallengeMode",
    "difficultyId" TEXT,
    "puzzleId" TEXT,
    "rankMetric" TEXT NOT NULL,
    "rankDirection" "RankDirection" NOT NULL,
    "tieBreakers" JSONB NOT NULL DEFAULT '[]',
    "entryPolicy" "EntryPolicy" NOT NULL DEFAULT 'BEST_PER_USER',
    "displayLimit" INTEGER NOT NULL DEFAULT 100,
    "adminQueryLimit" INTEGER NOT NULL DEFAULT 1000,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardPeriod" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "periodType" "LeaderboardPeriodType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "timezone" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreRecord" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "periodId" TEXT,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "difficultyId" TEXT,
    "puzzleId" TEXT,
    "puzzleVersionId" TEXT,
    "rankValue" DECIMAL(18,6) NOT NULL,
    "tieValue1" DECIMAL(18,6),
    "tieValue2" DECIMAL(18,6),
    "tieValue3" DECIMAL(18,6),
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "status" "ScoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "ScoreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardBest" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "periodId" TEXT,
    "userId" TEXT NOT NULL,
    "scoreRecordId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "rankValue" DECIMAL(18,6) NOT NULL,
    "tieValue1" DECIMAL(18,6),
    "tieValue2" DECIMAL(18,6),
    "tieValue3" DECIMAL(18,6),
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardBest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardRankCache" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "periodId" TEXT,
    "rankPosition" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "scoreRecordId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "displayNameSnapshot" TEXT NOT NULL,
    "avatarUrlSnapshot" TEXT,
    "rankValue" DECIMAL(18,6) NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardRankCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorUsername" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminReviewTask" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "requestPayload" JSONB NOT NULL DEFAULT '{}',
    "reviewComment" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "dataClass" TEXT NOT NULL,
    "gameId" TEXT,
    "mode" "ChallengeMode",
    "onlineRetentionDays" INTEGER NOT NULL,
    "archiveAfterDays" INTEGER,
    "deleteAfterDays" INTEGER,
    "action" "RetentionAction" NOT NULL,
    "archiveFormat" "ArchiveFormat",
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataArchiveBatch" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "partitionKey" TEXT,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "status" "CleanupRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataArchiveBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataArchiveObject" (
    "id" TEXT NOT NULL,
    "archiveBatchId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "format" "ArchiveFormat" NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "sha256" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataArchiveObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataCleanupRun" (
    "id" TEXT NOT NULL,
    "policyId" TEXT,
    "jobName" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "action" "RetentionAction" NOT NULL,
    "rangeStart" TIMESTAMP(3),
    "rangeEnd" TIMESTAMP(3),
    "matchedRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "status" "CleanupRunStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataCleanupRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterRadical" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "glyph" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterRadical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterRoot" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "glyph" TEXT NOT NULL,
    "complexityLevel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterRoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterCombination" (
    "id" TEXT NOT NULL,
    "radicalId" TEXT NOT NULL,
    "rootId" TEXT NOT NULL,
    "resultChar" TEXT NOT NULL,
    "pinyin" TEXT,
    "structure" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "frequencyLevel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterCombination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_status_idx" ON "AuthSession"("userId", "status");

-- CreateIndex
CREATE INDEX "AuthSession_refreshTokenFamilyId_idx" ON "AuthSession"("refreshTokenFamilyId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_status_expiresAt_idx" ON "AuthSession"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE INDEX "Role_isSystem_idx" ON "Role"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_resource_action_idx" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRole_assignedByUserId_idx" ON "UserRole"("assignedByUserId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "Game_status_sortOrder_idx" ON "Game"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "Game_publishedAt_idx" ON "Game"("publishedAt");

-- CreateIndex
CREATE INDEX "GameRuleSetVersion_gameId_status_idx" ON "GameRuleSetVersion"("gameId", "status");

-- CreateIndex
CREATE INDEX "GameRuleSetVersion_validationStatus_idx" ON "GameRuleSetVersion"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GameRuleSetVersion_gameId_version_key" ON "GameRuleSetVersion"("gameId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GameRuleSetVersion_gameId_configHash_key" ON "GameRuleSetVersion"("gameId", "configHash");

-- CreateIndex
CREATE INDEX "GameDifficulty_gameId_key_status_idx" ON "GameDifficulty"("gameId", "key", "status");

-- CreateIndex
CREATE INDEX "GameDifficulty_gameId_status_sortOrder_idx" ON "GameDifficulty"("gameId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "GameDifficulty_gameId_key_version_key" ON "GameDifficulty"("gameId", "key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GameDifficulty_gameId_key_configHash_key" ON "GameDifficulty"("gameId", "key", "configHash");

-- CreateIndex
CREATE INDEX "GameContentPolicy_gameId_difficultyId_mode_status_idx" ON "GameContentPolicy"("gameId", "difficultyId", "mode", "status");

-- CreateIndex
CREATE INDEX "GameContentPolicy_contentMode_idx" ON "GameContentPolicy"("contentMode");

-- CreateIndex
CREATE INDEX "GameContentPolicy_scheduleGranularity_idx" ON "GameContentPolicy"("scheduleGranularity");

-- CreateIndex
CREATE INDEX "GameChallengePolicy_gameId_mode_status_idx" ON "GameChallengePolicy"("gameId", "mode", "status");

-- CreateIndex
CREATE INDEX "GameChallengePolicy_gameId_difficultyId_mode_status_idx" ON "GameChallengePolicy"("gameId", "difficultyId", "mode", "status");

-- CreateIndex
CREATE INDEX "Puzzle_gameId_status_difficultyId_idx" ON "Puzzle"("gameId", "status", "difficultyId");

-- CreateIndex
CREATE INDEX "Puzzle_gameId_sortOrder_idx" ON "Puzzle"("gameId", "sortOrder");

-- CreateIndex
CREATE INDEX "Puzzle_currentVersionId_idx" ON "Puzzle"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_gameId_slug_key" ON "Puzzle"("gameId", "slug");

-- CreateIndex
CREATE INDEX "PuzzleVersion_puzzleId_status_idx" ON "PuzzleVersion"("puzzleId", "status");

-- CreateIndex
CREATE INDEX "PuzzleVersion_validationStatus_idx" ON "PuzzleVersion"("validationStatus");

-- CreateIndex
CREATE INDEX "PuzzleVersion_publishedAt_idx" ON "PuzzleVersion"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleVersion_puzzleId_version_key" ON "PuzzleVersion"("puzzleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleVersion_puzzleId_contentHash_key" ON "PuzzleVersion"("puzzleId", "contentHash");

-- CreateIndex
CREATE INDEX "PuzzleSchedule_gameId_difficultyId_mode_status_startAt_endA_idx" ON "PuzzleSchedule"("gameId", "difficultyId", "mode", "status", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "PuzzleSchedule_puzzleVersionId_idx" ON "PuzzleSchedule"("puzzleVersionId");

-- CreateIndex
CREATE INDEX "PuzzleSchedule_granularity_startAt_idx" ON "PuzzleSchedule"("granularity", "startAt");

-- CreateIndex
CREATE INDEX "PuzzleTag_gameId_idx" ON "PuzzleTag"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleTag_gameId_key_key" ON "PuzzleTag"("gameId", "key");

-- CreateIndex
CREATE INDEX "PuzzleTagBinding_tagId_idx" ON "PuzzleTagBinding"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleAsset_sha256_key" ON "PuzzleAsset"("sha256");

-- CreateIndex
CREATE INDEX "PuzzleAsset_gameId_idx" ON "PuzzleAsset"("gameId");

-- CreateIndex
CREATE INDEX "PuzzleAsset_puzzleId_idx" ON "PuzzleAsset"("puzzleId");

-- CreateIndex
CREATE INDEX "PuzzleAsset_puzzleVersionId_idx" ON "PuzzleAsset"("puzzleVersionId");

-- CreateIndex
CREATE INDEX "GameAttempt_userId_gameId_mode_status_idx" ON "GameAttempt"("userId", "gameId", "mode", "status");

-- CreateIndex
CREATE INDEX "GameAttempt_userId_mode_status_idx" ON "GameAttempt"("userId", "mode", "status");

-- CreateIndex
CREATE INDEX "GameAttempt_gameId_mode_status_idx" ON "GameAttempt"("gameId", "mode", "status");

-- CreateIndex
CREATE INDEX "GameAttempt_gameId_difficultyId_status_completedAt_idx" ON "GameAttempt"("gameId", "difficultyId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "GameAttempt_puzzleVersionId_idx" ON "GameAttempt"("puzzleVersionId");

-- CreateIndex
CREATE INDEX "GameAttempt_ruleSetVersionId_idx" ON "GameAttempt"("ruleSetVersionId");

-- CreateIndex
CREATE INDEX "GameAttempt_status_expiresAt_idx" ON "GameAttempt"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "GameAttempt_status_lastHeartbeatAt_idx" ON "GameAttempt"("status", "lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "GameAttempt_userId_createdAt_idx" ON "GameAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GameAttempt_gameId_createdAt_idx" ON "GameAttempt"("gameId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameAttempt_userId_idempotencyKey_key" ON "GameAttempt"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptRuntimeSession_entryTokenHash_key" ON "AttemptRuntimeSession"("entryTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptRuntimeSession_playSessionId_key" ON "AttemptRuntimeSession"("playSessionId");

-- CreateIndex
CREATE INDEX "AttemptRuntimeSession_attemptId_status_idx" ON "AttemptRuntimeSession"("attemptId", "status");

-- CreateIndex
CREATE INDEX "AttemptRuntimeSession_userId_status_idx" ON "AttemptRuntimeSession"("userId", "status");

-- CreateIndex
CREATE INDEX "AttemptRuntimeSession_status_expiresAt_idx" ON "AttemptRuntimeSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "AttemptRuntimeSession_status_lastHeartbeatAt_idx" ON "AttemptRuntimeSession"("status", "lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "AttemptOperationLog_attemptId_seqStart_idx" ON "AttemptOperationLog"("attemptId", "seqStart");

-- CreateIndex
CREATE INDEX "AttemptOperationLog_userId_createdAt_idx" ON "AttemptOperationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AttemptOperationLog_gameId_createdAt_idx" ON "AttemptOperationLog"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "AttemptOperationLog_batchId_idx" ON "AttemptOperationLog"("batchId");

-- CreateIndex
CREATE INDEX "AttemptOperationLog_createdAt_idx" ON "AttemptOperationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptOperationLog_attemptId_seqStart_seqEnd_key" ON "AttemptOperationLog"("attemptId", "seqStart", "seqEnd");

-- CreateIndex
CREATE INDEX "AttemptOperationBatch_attemptId_createdAt_idx" ON "AttemptOperationBatch"("attemptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptOperationBatch_attemptId_startSeq_endSeq_key" ON "AttemptOperationBatch"("attemptId", "startSeq", "endSeq");

-- CreateIndex
CREATE INDEX "AttemptSnapshot_attemptId_seq_idx" ON "AttemptSnapshot"("attemptId", "seq");

-- CreateIndex
CREATE INDEX "AttemptSnapshot_snapshotType_createdAt_idx" ON "AttemptSnapshot"("snapshotType", "createdAt");

-- CreateIndex
CREATE INDEX "AttemptSnapshot_createdAt_idx" ON "AttemptSnapshot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptSnapshot_attemptId_seq_snapshotType_key" ON "AttemptSnapshot"("attemptId", "seq", "snapshotType");

-- CreateIndex
CREATE INDEX "GameSubmission_attemptId_submissionType_idx" ON "GameSubmission"("attemptId", "submissionType");

-- CreateIndex
CREATE INDEX "GameSubmission_attemptId_roundIndex_idx" ON "GameSubmission"("attemptId", "roundIndex");

-- CreateIndex
CREATE INDEX "GameSubmission_attemptId_regionId_idx" ON "GameSubmission"("attemptId", "regionId");

-- CreateIndex
CREATE INDEX "GameSubmission_userId_submittedAt_idx" ON "GameSubmission"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "GameSubmission_gameId_submittedAt_idx" ON "GameSubmission"("gameId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameSubmission_attemptId_idempotencyKey_key" ON "GameSubmission"("attemptId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AttemptValidationReport_attemptId_isFinal_idx" ON "AttemptValidationReport"("attemptId", "isFinal");

-- CreateIndex
CREATE INDEX "AttemptValidationReport_gameId_createdAt_idx" ON "AttemptValidationReport"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "AttemptValidationReport_passed_createdAt_idx" ON "AttemptValidationReport"("passed", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAuditLog_attemptId_createdAt_idx" ON "ChallengeAuditLog"("attemptId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAuditLog_userId_createdAt_idx" ON "ChallengeAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAuditLog_gameId_createdAt_idx" ON "ChallengeAuditLog"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAuditLog_action_createdAt_idx" ON "ChallengeAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAuditLog_createdAt_idx" ON "ChallengeAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_status_lockedUntil_idx" ON "IdempotencyRecord"("status", "lockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_userId_key_key" ON "IdempotencyRecord"("userId", "key");

-- CreateIndex
CREATE INDEX "LeaderboardDefinition_gameId_status_visible_idx" ON "LeaderboardDefinition"("gameId", "status", "visible");

-- CreateIndex
CREATE INDEX "LeaderboardDefinition_gameId_difficultyId_mode_idx" ON "LeaderboardDefinition"("gameId", "difficultyId", "mode");

-- CreateIndex
CREATE INDEX "LeaderboardDefinition_puzzleId_idx" ON "LeaderboardDefinition"("puzzleId");

-- CreateIndex
CREATE INDEX "LeaderboardDefinition_scope_periodType_idx" ON "LeaderboardDefinition"("scope", "periodType");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardDefinition_gameId_slug_key" ON "LeaderboardDefinition"("gameId", "slug");

-- CreateIndex
CREATE INDEX "LeaderboardPeriod_leaderboardId_periodStart_periodEnd_idx" ON "LeaderboardPeriod"("leaderboardId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "LeaderboardPeriod_periodType_periodKey_idx" ON "LeaderboardPeriod"("periodType", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardPeriod_leaderboardId_periodKey_key" ON "LeaderboardPeriod"("leaderboardId", "periodKey");

-- CreateIndex
CREATE INDEX "ScoreRecord_leaderboardId_periodId_status_rankValue_tieValu_idx" ON "ScoreRecord"("leaderboardId", "periodId", "status", "rankValue", "tieValue1", "tieValue2", "tieValue3");

-- CreateIndex
CREATE INDEX "ScoreRecord_userId_leaderboardId_recordedAt_idx" ON "ScoreRecord"("userId", "leaderboardId", "recordedAt");

-- CreateIndex
CREATE INDEX "ScoreRecord_gameId_difficultyId_recordedAt_idx" ON "ScoreRecord"("gameId", "difficultyId", "recordedAt");

-- CreateIndex
CREATE INDEX "ScoreRecord_puzzleId_recordedAt_idx" ON "ScoreRecord"("puzzleId", "recordedAt");

-- CreateIndex
CREATE INDEX "ScoreRecord_status_recordedAt_idx" ON "ScoreRecord"("status", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreRecord_leaderboardId_attemptId_key" ON "ScoreRecord"("leaderboardId", "attemptId");

-- CreateIndex
CREATE INDEX "LeaderboardBest_leaderboardId_periodId_rankValue_tieValue1__idx" ON "LeaderboardBest"("leaderboardId", "periodId", "rankValue", "tieValue1", "tieValue2", "tieValue3");

-- CreateIndex
CREATE INDEX "LeaderboardBest_userId_leaderboardId_idx" ON "LeaderboardBest"("userId", "leaderboardId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardBest_leaderboardId_periodId_userId_key" ON "LeaderboardBest"("leaderboardId", "periodId", "userId");

-- CreateIndex
CREATE INDEX "LeaderboardRankCache_leaderboardId_periodId_idx" ON "LeaderboardRankCache"("leaderboardId", "periodId");

-- CreateIndex
CREATE INDEX "LeaderboardRankCache_generatedAt_idx" ON "LeaderboardRankCache"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardRankCache_leaderboardId_periodId_rankPosition_key" ON "LeaderboardRankCache"("leaderboardId", "periodId", "rankPosition");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardRankCache_leaderboardId_periodId_userId_key" ON "LeaderboardRankCache"("leaderboardId", "periodId", "userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_resourceType_resourceId_createdAt_idx" ON "AdminAuditLog"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminReviewTask_resourceType_resourceId_idx" ON "AdminReviewTask"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AdminReviewTask_status_createdAt_idx" ON "AdminReviewTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminReviewTask_requestedByUserId_createdAt_idx" ON "AdminReviewTask"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminReviewTask_reviewedByUserId_reviewedAt_idx" ON "AdminReviewTask"("reviewedByUserId", "reviewedAt");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_enabled_tableName_idx" ON "DataRetentionPolicy"("enabled", "tableName");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_gameId_mode_idx" ON "DataRetentionPolicy"("gameId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_tableName_dataClass_gameId_mode_key" ON "DataRetentionPolicy"("tableName", "dataClass", "gameId", "mode");

-- CreateIndex
CREATE INDEX "DataArchiveBatch_policyId_createdAt_idx" ON "DataArchiveBatch"("policyId", "createdAt");

-- CreateIndex
CREATE INDEX "DataArchiveBatch_tableName_rangeStart_rangeEnd_idx" ON "DataArchiveBatch"("tableName", "rangeStart", "rangeEnd");

-- CreateIndex
CREATE INDEX "DataArchiveBatch_status_createdAt_idx" ON "DataArchiveBatch"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataArchiveObject_storageKey_key" ON "DataArchiveObject"("storageKey");

-- CreateIndex
CREATE INDEX "DataArchiveObject_archiveBatchId_idx" ON "DataArchiveObject"("archiveBatchId");

-- CreateIndex
CREATE INDEX "DataArchiveObject_sha256_idx" ON "DataArchiveObject"("sha256");

-- CreateIndex
CREATE INDEX "DataCleanupRun_jobName_createdAt_idx" ON "DataCleanupRun"("jobName", "createdAt");

-- CreateIndex
CREATE INDEX "DataCleanupRun_tableName_action_idx" ON "DataCleanupRun"("tableName", "action");

-- CreateIndex
CREATE INDEX "DataCleanupRun_status_createdAt_idx" ON "DataCleanupRun"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRadical_key_key" ON "CharacterRadical"("key");

-- CreateIndex
CREATE INDEX "CharacterRadical_category_enabled_idx" ON "CharacterRadical"("category", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRoot_key_key" ON "CharacterRoot"("key");

-- CreateIndex
CREATE INDEX "CharacterRoot_complexityLevel_enabled_idx" ON "CharacterRoot"("complexityLevel", "enabled");

-- CreateIndex
CREATE INDEX "CharacterCombination_radicalId_rootId_idx" ON "CharacterCombination"("radicalId", "rootId");

-- CreateIndex
CREATE INDEX "CharacterCombination_difficulty_enabled_idx" ON "CharacterCombination"("difficulty", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCombination_radicalId_rootId_resultChar_key" ON "CharacterCombination"("radicalId", "rootId", "resultChar");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRuleSetVersion" ADD CONSTRAINT "GameRuleSetVersion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameDifficulty" ADD CONSTRAINT "GameDifficulty_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameContentPolicy" ADD CONSTRAINT "GameContentPolicy_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChallengePolicy" ADD CONSTRAINT "GameChallengePolicy_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleVersion" ADD CONSTRAINT "PuzzleVersion_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleSchedule" ADD CONSTRAINT "PuzzleSchedule_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleSchedule" ADD CONSTRAINT "PuzzleSchedule_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleTag" ADD CONSTRAINT "PuzzleTag_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleTagBinding" ADD CONSTRAINT "PuzzleTagBinding_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleTagBinding" ADD CONSTRAINT "PuzzleTagBinding_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PuzzleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleAsset" ADD CONSTRAINT "PuzzleAsset_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptRuntimeSession" ADD CONSTRAINT "AttemptRuntimeSession_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptOperationLog" ADD CONSTRAINT "AttemptOperationLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptOperationBatch" ADD CONSTRAINT "AttemptOperationBatch_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSnapshot" ADD CONSTRAINT "AttemptSnapshot_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSubmission" ADD CONSTRAINT "GameSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSubmission" ADD CONSTRAINT "GameSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptValidationReport" ADD CONSTRAINT "AttemptValidationReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAuditLog" ADD CONSTRAINT "ChallengeAuditLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardDefinition" ADD CONSTRAINT "LeaderboardDefinition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardPeriod" ADD CONSTRAINT "LeaderboardPeriod_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "LeaderboardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "LeaderboardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardBest" ADD CONSTRAINT "LeaderboardBest_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "LeaderboardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardBest" ADD CONSTRAINT "LeaderboardBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardRankCache" ADD CONSTRAINT "LeaderboardRankCache_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "LeaderboardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReviewTask" ADD CONSTRAINT "AdminReviewTask_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReviewTask" ADD CONSTRAINT "AdminReviewTask_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCombination" ADD CONSTRAINT "CharacterCombination_radicalId_fkey" FOREIGN KEY ("radicalId") REFERENCES "CharacterRadical"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCombination" ADD CONSTRAINT "CharacterCombination_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "CharacterRoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ════════════════════════════════════════════════════════════════════════════
-- Partial unique indexes (enforces single-ACTIVE rows and runtime invariants)
-- Source: openspec/changes/redesign-database-schema-greenfield/design.md D13
-- ════════════════════════════════════════════════════════════════════════════

-- One ACTIVE rule-set version per game
CREATE UNIQUE INDEX "uq_active_game_ruleset_version"
ON "GameRuleSetVersion" ("gameId")
WHERE "status" = 'ACTIVE';

-- One ACTIVE difficulty per (game, key)
CREATE UNIQUE INDEX "uq_active_game_difficulty"
ON "GameDifficulty" ("gameId", "key")
WHERE "status" = 'ACTIVE';

-- One ACTIVE content policy per (game, difficulty, mode); NULLs equal via NULLS NOT DISTINCT (PG >=15)
CREATE UNIQUE INDEX "uq_active_game_content_policy"
ON "GameContentPolicy" ("gameId", "difficultyId", "mode")
NULLS NOT DISTINCT
WHERE "status" = 'ACTIVE';

-- One ACTIVE challenge policy per (game, mode, difficulty); NULLs equal
CREATE UNIQUE INDEX "uq_active_game_challenge_policy"
ON "GameChallengePolicy" ("gameId", "mode", "difficultyId")
NULLS NOT DISTINCT
WHERE "status" = 'ACTIVE';

-- One PUBLISHED puzzle version per puzzle
CREATE UNIQUE INDEX "uq_published_puzzle_version"
ON "PuzzleVersion" ("puzzleId")
WHERE "status" = 'PUBLISHED';

-- One active RANKED/DAILY attempt per user
CREATE UNIQUE INDEX "uq_user_active_ranked_attempt"
ON "GameAttempt" ("userId")
WHERE "mode" IN ('RANKED', 'DAILY')
  AND "status" IN ('CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING');

-- One active runtime session per attempt
CREATE UNIQUE INDEX "uq_attempt_active_runtime_session"
ON "AttemptRuntimeSession" ("attemptId")
WHERE "status" IN ('CREATED', 'CLAIMED', 'PLAYING');

-- Reaper scan indexes (partial, narrow to actionable states)
CREATE INDEX "idx_attempt_reaper_expires"
ON "GameAttempt" ("status", "expiresAt")
WHERE "status" IN ('CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING');

CREATE INDEX "idx_attempt_reaper_heartbeat"
ON "GameAttempt" ("status", "lastHeartbeatAt")
WHERE "status" IN ('PLAYING', 'SUBMITTING');
