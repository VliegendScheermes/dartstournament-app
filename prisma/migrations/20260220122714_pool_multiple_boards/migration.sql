-- AlterTable Pool: migrate boardNumber (single Int?) -> boardNumbers (Int[] array)
-- This allows a pool to be assigned to multiple boards simultaneously.

-- Step 1: Add new column with default empty array
ALTER TABLE "Pool" ADD COLUMN "boardNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Step 2: Migrate existing data (wrap single boardNumber in an array if not null)
UPDATE "Pool" SET "boardNumbers" = ARRAY["boardNumber"] WHERE "boardNumber" IS NOT NULL;

-- Step 3: Drop old column
ALTER TABLE "Pool" DROP COLUMN "boardNumber";
