-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "firstAnnouncerTeamId" TEXT;

-- AlterTable
ALTER TABLE "TeamMembership" ADD COLUMN     "announced" BOOLEAN NOT NULL DEFAULT false;
