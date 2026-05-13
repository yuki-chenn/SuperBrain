-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('STARTED', 'COMPLETED', 'INVALID', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RankDirection" AS ENUM ('ASC', 'DESC');

-- CreateEnum
CREATE TYPE "LeaderboardScope" AS ENUM ('GLOBAL', 'DAILY', 'WEEKLY', 'FRIENDS');

-- CreateEnum
CREATE TYPE "EntryPolicy" AS ENUM ('BEST_PER_USER', 'ALL_ATTEMPTS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
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
    "difficultyLevels" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "difficultyKey" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'STARTED',
    "seed" TEXT NOT NULL,
    "initialState" JSONB NOT NULL,
    "finalState" JSONB,
    "moveTrace" JSONB,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "rankValue" DECIMAL(65,30),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "invalidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardDefinition" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "LeaderboardScope" NOT NULL DEFAULT 'GLOBAL',
    "difficultyKey" TEXT,
    "rankMetric" TEXT NOT NULL,
    "rankDirection" "RankDirection" NOT NULL,
    "tieBreakers" JSONB NOT NULL DEFAULT '[]',
    "entryPolicy" "EntryPolicy" NOT NULL DEFAULT 'BEST_PER_USER',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "leaderboardDefinitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bestAttemptId" TEXT NOT NULL,
    "rankValue" DECIMAL(65,30) NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "GameAttempt_userId_gameId_difficultyKey_status_idx" ON "GameAttempt"("userId", "gameId", "difficultyKey", "status");

-- CreateIndex
CREATE INDEX "GameAttempt_gameId_difficultyKey_status_rankValue_idx" ON "GameAttempt"("gameId", "difficultyKey", "status", "rankValue");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardDefinition_slug_key" ON "LeaderboardDefinition"("slug");

-- CreateIndex
CREATE INDEX "LeaderboardDefinition_gameId_difficultyKey_idx" ON "LeaderboardDefinition"("gameId", "difficultyKey");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_leaderboardDefinitionId_rankValue_idx" ON "LeaderboardEntry"("leaderboardDefinitionId", "rankValue");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_leaderboardDefinitionId_userId_key" ON "LeaderboardEntry"("leaderboardDefinitionId", "userId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardDefinition" ADD CONSTRAINT "LeaderboardDefinition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_leaderboardDefinitionId_fkey" FOREIGN KEY ("leaderboardDefinitionId") REFERENCES "LeaderboardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_bestAttemptId_fkey" FOREIGN KEY ("bestAttemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
