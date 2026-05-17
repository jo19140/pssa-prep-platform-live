-- AlterTable
ALTER TABLE "LearningLesson" ADD COLUMN     "exemplarsUsed" TEXT[],
ADD COLUMN     "generatorVersion" TEXT NOT NULL DEFAULT 'V1',
ADD COLUMN     "qualityIssues" JSONB,
ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "teiTypesUsed" TEXT[];
