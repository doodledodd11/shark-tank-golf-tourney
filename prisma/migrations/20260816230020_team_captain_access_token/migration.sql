-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "captainAccessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Team_captainAccessToken_key" ON "Team"("captainAccessToken");
