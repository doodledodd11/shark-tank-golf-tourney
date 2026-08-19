-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN     "accessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_accessToken_key" ON "MatchParticipant"("accessToken");
