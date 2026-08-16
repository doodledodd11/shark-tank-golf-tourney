-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "name" SET DEFAULT 'Shark Tank Golf Invitational';
