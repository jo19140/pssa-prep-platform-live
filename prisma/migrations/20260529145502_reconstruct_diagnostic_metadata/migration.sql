-- AlterTable
ALTER TABLE "DiagnosticItem" ADD COLUMN     "audioAssetRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "audioValidatedByHuman" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "calibratedProbeLevel" TEXT,
ADD COLUMN     "canonicalAnswer" TEXT,
ADD COLUMN     "comprehensionMode" TEXT,
ADD COLUMN     "displayMode" TEXT,
ADD COLUMN     "displayText" TEXT,
ADD COLUMN     "expectedPronunciation" TEXT,
ADD COLUMN     "fluencyEvidenceJson" JSONB,
ADD COLUMN     "itemStatus" TEXT NOT NULL DEFAULT 'candidate',
ADD COLUMN     "placementEvidenceJson" JSONB,
ADD COLUMN     "responseMode" TEXT,
ADD COLUMN     "stimulusMode" TEXT,
ADD COLUMN     "targetPattern" TEXT,
ADD COLUMN     "targetWord" TEXT,
ADD COLUMN     "vocabularyBand" TEXT,
ADD COLUMN     "wordType" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "contentAuditStatus" TEXT,
ADD COLUMN     "dailyTargetCode" TEXT,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "lessonStatus" TEXT NOT NULL DEFAULT 'candidate',
ADD COLUMN     "lessonType" TEXT,
ADD COLUMN     "phaseBand" INTEGER,
ADD COLUMN     "sourceModelDecisionId" TEXT,
ADD COLUMN     "targetLabel" TEXT,
ADD COLUMN     "targetPattern" TEXT;

-- AlterTable
ALTER TABLE "LessonPart" ADD COLUMN     "assistedModeAllowed" BOOLEAN,
ADD COLUMN     "contentAuditJson" JSONB,
ADD COLUMN     "dailyTargetCode" TEXT,
ADD COLUMN     "independentScoreEligible" BOOLEAN,
ADD COLUMN     "partType" TEXT,
ADD COLUMN     "responseMode" TEXT,
ADD COLUMN     "scoringRubricJson" JSONB,
ADD COLUMN     "skillFocus" TEXT,
ADD COLUMN     "strandFocus" TEXT,
ADD COLUMN     "studentDisplayMode" TEXT,
ADD COLUMN     "targetPattern" TEXT,
ADD COLUMN     "wordTagsJson" JSONB;

-- CreateIndex
CREATE INDEX "DiagnosticItem_itemStatus_idx" ON "DiagnosticItem"("itemStatus");

-- CreateIndex
CREATE INDEX "DiagnosticItem_vocabularyBand_targetWord_idx" ON "DiagnosticItem"("vocabularyBand", "targetWord");

-- CreateIndex
CREATE INDEX "DiagnosticItem_targetPattern_wordType_idx" ON "DiagnosticItem"("targetPattern", "wordType");

-- CreateIndex
CREATE INDEX "Lesson_dailyTargetCode_targetPattern_idx" ON "Lesson"("dailyTargetCode", "targetPattern");

-- CreateIndex
CREATE INDEX "Lesson_lessonStatus_idx" ON "Lesson"("lessonStatus");

-- CreateIndex
CREATE INDEX "LessonPart_lessonId_partType_idx" ON "LessonPart"("lessonId", "partType");

-- CreateIndex
CREATE INDEX "LessonPart_dailyTargetCode_targetPattern_idx" ON "LessonPart"("dailyTargetCode", "targetPattern");

