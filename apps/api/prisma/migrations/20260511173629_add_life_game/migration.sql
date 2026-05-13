-- AlterTable
ALTER TABLE "GameAttempt" ADD COLUMN     "lifePuzzleId" TEXT;

-- CreateTable
CREATE TABLE "LifePuzzle" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "difficultyKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 120,
    "height" INTEGER NOT NULL DEFAULT 15,
    "boundary" JSONB NOT NULL,
    "initialState" JSONB NOT NULL,
    "stableState" JSONB NOT NULL,
    "targetRegionIds" JSONB NOT NULL,
    "targetAnswers" JSONB NOT NULL,
    "stableGeneration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifePuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeRegionSubmission" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,
    "aliveCells" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifeRegionSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LifePuzzle_difficultyKey_status_idx" ON "LifePuzzle"("difficultyKey", "status");

-- CreateIndex
CREATE INDEX "LifeRegionSubmission_attemptId_idx" ON "LifeRegionSubmission"("attemptId");

-- CreateIndex
CREATE INDEX "LifeRegionSubmission_userId_idx" ON "LifeRegionSubmission"("userId");

-- CreateIndex
CREATE INDEX "LifeRegionSubmission_attemptId_regionId_idx" ON "LifeRegionSubmission"("attemptId", "regionId");

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_lifePuzzleId_fkey" FOREIGN KEY ("lifePuzzleId") REFERENCES "LifePuzzle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifePuzzle" ADD CONSTRAINT "LifePuzzle_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeRegionSubmission" ADD CONSTRAINT "LifeRegionSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GameAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeRegionSubmission" ADD CONSTRAINT "LifeRegionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
