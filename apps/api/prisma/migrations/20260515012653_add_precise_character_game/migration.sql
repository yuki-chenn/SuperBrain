-- AlterTable
ALTER TABLE "GameAttempt" ADD COLUMN     "pcbPuzzleId" TEXT;

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

-- CreateTable
CREATE TABLE "PreciseCharacterPuzzle" (
    "id" TEXT NOT NULL,
    "difficultyKey" TEXT NOT NULL,
    "boardSize" INTEGER NOT NULL DEFAULT 6,
    "radicalPool" JSONB NOT NULL,
    "cells" JSONB NOT NULL,
    "solutionRounds" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "PreciseCharacterPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreciseCharacterRoundSubmission" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "selectedRadicalKeys" JSONB NOT NULL,
    "selectedCellIndices" JSONB NOT NULL,
    "resultChars" JSONB,
    "combinationIds" JSONB,
    "correct" BOOLEAN NOT NULL,
    "errorReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreciseCharacterRoundSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRadical_key_key" ON "CharacterRadical"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRoot_key_key" ON "CharacterRoot"("key");

-- CreateIndex
CREATE INDEX "CharacterCombination_radicalId_rootId_idx" ON "CharacterCombination"("radicalId", "rootId");

-- CreateIndex
CREATE INDEX "CharacterCombination_difficulty_enabled_idx" ON "CharacterCombination"("difficulty", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCombination_radicalId_rootId_resultChar_key" ON "CharacterCombination"("radicalId", "rootId", "resultChar");

-- CreateIndex
CREATE INDEX "PreciseCharacterPuzzle_difficultyKey_status_idx" ON "PreciseCharacterPuzzle"("difficultyKey", "status");

-- CreateIndex
CREATE INDEX "PreciseCharacterRoundSubmission_attemptId_idx" ON "PreciseCharacterRoundSubmission"("attemptId");

-- CreateIndex
CREATE INDEX "PreciseCharacterRoundSubmission_userId_idx" ON "PreciseCharacterRoundSubmission"("userId");

-- CreateIndex
CREATE INDEX "PreciseCharacterRoundSubmission_attemptId_roundIndex_idx" ON "PreciseCharacterRoundSubmission"("attemptId", "roundIndex");

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_pcbPuzzleId_fkey" FOREIGN KEY ("pcbPuzzleId") REFERENCES "PreciseCharacterPuzzle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCombination" ADD CONSTRAINT "CharacterCombination_radicalId_fkey" FOREIGN KEY ("radicalId") REFERENCES "CharacterRadical"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCombination" ADD CONSTRAINT "CharacterCombination_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "CharacterRoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreciseCharacterPuzzle" ADD CONSTRAINT "PreciseCharacterPuzzle_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreciseCharacterRoundSubmission" ADD CONSTRAINT "PreciseCharacterRoundSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreciseCharacterRoundSubmission" ADD CONSTRAINT "PreciseCharacterRoundSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
