-- AlterTable
ALTER TABLE "ResourceLink" ADD COLUMN     "aboveGradeLevel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "belowGradeLevel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tier" TEXT;

-- CreateIndex
CREATE INDEX "ResourceLink_belowGradeLevel_standardCode_idx" ON "ResourceLink"("belowGradeLevel", "standardCode");

-- CreateIndex
CREATE INDEX "ResourceLink_aboveGradeLevel_standardCode_idx" ON "ResourceLink"("aboveGradeLevel", "standardCode");
