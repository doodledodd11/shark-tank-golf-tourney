-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "parByHole" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "strokeIndexByHole" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "teamAHoleScores" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "teamBHoleScores" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "teamASideAccessToken" TEXT,
ADD COLUMN     "teamBSideAccessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Match_teamASideAccessToken_key" ON "Match"("teamASideAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Match_teamBSideAccessToken_key" ON "Match"("teamBSideAccessToken");
