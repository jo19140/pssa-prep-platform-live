-- DropIndex
DROP INDEX "HeroMatchCache_lessonSkill_candidateUrl_key";

-- AlterTable
ALTER TABLE "HeroMatchCache"
ADD COLUMN "lessonGradeLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "verifierVersion" TEXT NOT NULL DEFAULT 'skill_only_v1';

-- CreateIndex
CREATE UNIQUE INDEX "HeroMatchCache_lessonSkill_lessonGradeLevel_candidateUrl_verifierVersion_key" ON "HeroMatchCache"("lessonSkill", "lessonGradeLevel", "candidateUrl", "verifierVersion");
