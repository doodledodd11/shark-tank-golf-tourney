-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "seed" INTEGER;

-- AlterTable
ALTER TABLE "TeamMembership" ADD COLUMN     "autoSeated" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "announced";
