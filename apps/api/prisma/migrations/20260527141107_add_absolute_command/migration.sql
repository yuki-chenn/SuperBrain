-- AlterTable
ALTER TABLE "GameAttempt" ADD COLUMN     "absoluteCommandPuzzleId" TEXT;

-- AlterTable
ALTER TABLE "LeaderboardDefinition" ADD COLUMN     "puzzleId" TEXT;

-- CreateTable
CREATE TABLE "AbsoluteCommandPuzzle" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficultyLabel" TEXT,
    "season" INTEGER NOT NULL DEFAULT 13,
    "episode" INTEGER NOT NULL DEFAULT 2,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" TEXT,
    "estimatedDuration" TEXT,
    "optimalCommandCount" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsoluteCommandPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsoluteCommandPuzzleVersion" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "size" JSONB NOT NULL,
    "startCoord" JSONB NOT NULL,
    "cells" JSONB NOT NULL,
    "referenceSolution" JSONB,
    "validationStatus" TEXT NOT NULL DEFAULT 'UNVALIDATED',
    "validationReport" JSONB NOT NULL DEFAULT '{}',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsoluteCommandPuzzleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsoluteCommandLog" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "fromCoord" JSONB NOT NULL,
    "toCoord" JSONB NOT NULL,
    "path" JSONB NOT NULL,
    "stopReason" TEXT NOT NULL,
    "changedCells" JSONB NOT NULL DEFAULT '[]',
    "snapshotBefore" JSONB,
    "snapshotAfter" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsoluteCommandLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbsoluteCommandPuzzle_slug_key" ON "AbsoluteCommandPuzzle"("slug");

-- CreateIndex
CREATE INDEX "AbsoluteCommandPuzzle_status_idx" ON "AbsoluteCommandPuzzle"("status");

-- CreateIndex
CREATE INDEX "AbsoluteCommandPuzzle_difficultyLabel_idx" ON "AbsoluteCommandPuzzle"("difficultyLabel");

-- CreateIndex
CREATE INDEX "AbsoluteCommandPuzzleVersion_puzzleId_idx" ON "AbsoluteCommandPuzzleVersion"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsoluteCommandPuzzleVersion_puzzleId_version_key" ON "AbsoluteCommandPuzzleVersion"("puzzleId", "version");

-- CreateIndex
CREATE INDEX "AbsoluteCommandLog_attemptId_idx" ON "AbsoluteCommandLog"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsoluteCommandLog_attemptId_index_key" ON "AbsoluteCommandLog"("attemptId", "index");

-- CreateIndex
CREATE INDEX "LeaderboardDefinition_puzzleId_idx" ON "LeaderboardDefinition"("puzzleId");

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_absoluteCommandPuzzleId_fkey" FOREIGN KEY ("absoluteCommandPuzzleId") REFERENCES "AbsoluteCommandPuzzle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsoluteCommandPuzzle" ADD CONSTRAINT "AbsoluteCommandPuzzle_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsoluteCommandPuzzleVersion" ADD CONSTRAINT "AbsoluteCommandPuzzleVersion_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "AbsoluteCommandPuzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsoluteCommandLog" ADD CONSTRAINT "AbsoluteCommandLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsoluteCommandLog" ADD CONSTRAINT "AbsoluteCommandLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
