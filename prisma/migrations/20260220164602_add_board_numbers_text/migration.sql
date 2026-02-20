-- AlterTable Pool: add boardNumbersText for flexible board format (e.g., "1,2,3" or "1-4")
-- This is a safe addition - existing boardNumber field remains unchanged for backward compatibility

ALTER TABLE "Pool" ADD COLUMN "boardNumbersText" TEXT;
