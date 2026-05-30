-- Step 1: Add maxDurationMs to AbsoluteCommandPuzzle
ALTER TABLE "AbsoluteCommandPuzzle" ADD COLUMN "maxDurationMs" INTEGER NOT NULL DEFAULT 3600000;

-- Step 2: Create new enum type with desired values
CREATE TYPE "AttemptStatus_new" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

-- Step 3: Remove default before changing type
ALTER TABLE "GameAttempt" ALTER COLUMN "status" DROP DEFAULT;

-- Step 4: Alter the column to use new enum, mapping old values
ALTER TABLE "GameAttempt" ALTER COLUMN "status" TYPE "AttemptStatus_new" USING (
  CASE "status"::text
    WHEN 'ABANDONED' THEN 'FAILED'
    WHEN 'INVALID' THEN 'FAILED'
    ELSE "status"::text
  END::"AttemptStatus_new"
);

-- Step 5: Drop old enum and rename new one
DROP TYPE "AttemptStatus";
ALTER TYPE "AttemptStatus_new" RENAME TO "AttemptStatus";

-- Step 6: Re-add default with new type
ALTER TABLE "GameAttempt" ALTER COLUMN "status" SET DEFAULT 'STARTED';
