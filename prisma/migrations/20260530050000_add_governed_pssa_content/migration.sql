-- Governed Pennsylvania PSSA ELA content layer.
-- Review-only migration: additive schema objects only; no legacy tables or rows are modified.

-- CreateEnum
CREATE TYPE "PssaSourceType" AS ENUM ('internal_original', 'owned', 'open_license', 'PDE_SAMPLER', 'OFFICIAL_RELEASED_ITEM', 'legacy_generated', 'unknown');

-- CreateEnum
CREATE TYPE "PssaLicenseStatus" AS ENUM ('cleared_internal_original', 'cleared_owned', 'cleared_open_license', 'review_required', 'unresolved');

-- CreateEnum
CREATE TYPE "PssaReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PssaItemStatus" AS ENUM ('candidate', 'pilot_ready', 'active', 'retired');

-- CreateEnum
CREATE TYPE "PssaAlignmentStatus" AS ENUM ('NEEDS_CROSSWALK', 'NEEDS_REVIEW', 'ALIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PssaAuditSeverity" AS ENUM ('INFO', 'WARNING', 'BLOCKER');

-- CreateEnum
CREATE TYPE "PssaAuditResultStatus" AS ENUM ('PASS', 'FAIL', 'SKIP');

-- CreateTable
CREATE TABLE "PssaGenerationBatch" (
    "id" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "generatorName" TEXT,
    "generatorVersion" TEXT,
    "sourceType" "PssaSourceType" NOT NULL DEFAULT 'unknown',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "provenanceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaGenerationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaPassage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'ELA',
    "passageType" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "sourceType" "PssaSourceType" NOT NULL DEFAULT 'unknown',
    "sourceName" TEXT,
    "sourceCitation" TEXT,
    "licenseStatus" "PssaLicenseStatus" NOT NULL DEFAULT 'unresolved',
    "commercialUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "needsLegalReview" BOOLEAN NOT NULL DEFAULT true,
    "reviewStatus" "PssaReviewStatus" NOT NULL DEFAULT 'PENDING',
    "itemStatus" "PssaItemStatus" NOT NULL DEFAULT 'candidate',
    "approvedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "provenanceJson" JSONB NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaPassage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaItem" (
    "id" TEXT NOT NULL,
    "module" "TestPrepModule" NOT NULL DEFAULT 'PSSA',
    "subject" TEXT NOT NULL DEFAULT 'ELA',
    "gradeLevel" INTEGER NOT NULL,
    "standardCode" TEXT NOT NULL,
    "assessmentAnchor" TEXT,
    "eligibleContent" TEXT,
    "reportingCategory" TEXT,
    "dokLevel" INTEGER,
    "itemType" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "difficultyBand" TEXT,
    "studentFacingPrompt" TEXT NOT NULL,
    "studentFacingStimulus" TEXT,
    "answerChoicesJson" JSONB,
    "correctAnswer" JSONB,
    "correctIndex" INTEGER,
    "expectedResponseJson" JSONB,
    "scoringRubricJson" JSONB,
    "distractorRationalesJson" JSONB,
    "sourceType" "PssaSourceType" NOT NULL DEFAULT 'unknown',
    "sourceName" TEXT,
    "sourceCitation" TEXT,
    "licenseStatus" "PssaLicenseStatus" NOT NULL DEFAULT 'unresolved',
    "commercialUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "needsLegalReview" BOOLEAN NOT NULL DEFAULT true,
    "reviewStatus" "PssaReviewStatus" NOT NULL DEFAULT 'PENDING',
    "itemStatus" "PssaItemStatus" NOT NULL DEFAULT 'candidate',
    "alignmentStatus" "PssaAlignmentStatus" NOT NULL DEFAULT 'NEEDS_CROSSWALK',
    "approvalEligible" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "studentPreviewJson" JSONB,
    "generationBatchId" TEXT,
    "passageId" TEXT,
    "provenanceJson" JSONB NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaLesson" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'ELA',
    "standardCode" TEXT NOT NULL,
    "assessmentAnchor" TEXT,
    "eligibleContent" TEXT,
    "objective" TEXT NOT NULL,
    "lessonPartsJson" JSONB NOT NULL,
    "sourceType" "PssaSourceType" NOT NULL DEFAULT 'unknown',
    "licenseStatus" "PssaLicenseStatus" NOT NULL DEFAULT 'unresolved',
    "reviewStatus" "PssaReviewStatus" NOT NULL DEFAULT 'PENDING',
    "itemStatus" "PssaItemStatus" NOT NULL DEFAULT 'candidate',
    "alignmentStatus" "PssaAlignmentStatus" NOT NULL DEFAULT 'NEEDS_CROSSWALK',
    "approvalEligible" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "generationBatchId" TEXT,
    "provenanceJson" JSONB NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaStandardsCrosswalk" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "reportingCategory" TEXT NOT NULL,
    "reportingCategoryTitle" TEXT NOT NULL,
    "assessmentAnchor" TEXT NOT NULL,
    "assessmentAnchorTitle" TEXT NOT NULL,
    "anchorDescriptor" TEXT NOT NULL,
    "anchorDescriptorText" TEXT NOT NULL,
    "eligibleContent" TEXT NOT NULL,
    "eligibleContentText" TEXT NOT NULL,
    "dokCeiling" TEXT,
    "primaryPaCoreStandardCode" TEXT,
    "mappingGranularity" TEXT NOT NULL,
    "mappingConfidence" TEXT NOT NULL,
    "sourceDocument" TEXT NOT NULL,
    "sourceVersionYear" INTEGER NOT NULL,
    "sourceUpdatedYear" INTEGER NOT NULL,
    "sourceAnomalyJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaStandardsCrosswalk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaCrosswalkPaCoreStandard" (
    "id" TEXT NOT NULL,
    "crosswalkId" TEXT NOT NULL,
    "standardCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaCrosswalkPaCoreStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaLinterRun" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "runKey" TEXT NOT NULL,
    "sourceBundlePath" TEXT,
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "blockerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaLinterRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaAuditResult" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "linterRunId" TEXT NOT NULL,
    "batchId" TEXT,
    "ruleId" TEXT NOT NULL,
    "severity" "PssaAuditSeverity" NOT NULL,
    "result" "PssaAuditResultStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "evidenceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaAuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaReviewLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT,
    "passageId" TEXT,
    "lessonId" TEXT,
    "action" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "notes" TEXT,
    "editDiffJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PssaLessonPracticeItems" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PssaLessonExitTicketItems" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PssaGenerationBatch_batchKey_key" ON "PssaGenerationBatch"("batchKey");

-- CreateIndex
CREATE INDEX "PssaGenerationBatch_purpose_createdAt_idx" ON "PssaGenerationBatch"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "PssaPassage_gradeLevel_subject_reviewStatus_itemStatus_idx" ON "PssaPassage"("gradeLevel", "subject", "reviewStatus", "itemStatus");

-- CreateIndex
CREATE INDEX "PssaPassage_sourceType_licenseStatus_idx" ON "PssaPassage"("sourceType", "licenseStatus");

-- CreateIndex
CREATE INDEX "PssaPassage_retiredAt_idx" ON "PssaPassage"("retiredAt");

-- CreateIndex
CREATE INDEX "PssaItem_gradeLevel_subject_reviewStatus_itemStatus_idx" ON "PssaItem"("gradeLevel", "subject", "reviewStatus", "itemStatus");

-- CreateIndex
CREATE INDEX "PssaItem_standardCode_assessmentAnchor_eligibleContent_idx" ON "PssaItem"("standardCode", "assessmentAnchor", "eligibleContent");

-- CreateIndex
CREATE INDEX "PssaItem_sourceType_licenseStatus_idx" ON "PssaItem"("sourceType", "licenseStatus");

-- CreateIndex
CREATE INDEX "PssaItem_alignmentStatus_approvalEligible_idx" ON "PssaItem"("alignmentStatus", "approvalEligible");

-- CreateIndex
CREATE INDEX "PssaItem_generationBatchId_idx" ON "PssaItem"("generationBatchId");

-- CreateIndex
CREATE INDEX "PssaItem_passageId_idx" ON "PssaItem"("passageId");

-- CreateIndex
CREATE INDEX "PssaItem_retiredAt_idx" ON "PssaItem"("retiredAt");

-- CreateIndex
CREATE INDEX "PssaLesson_gradeLevel_subject_reviewStatus_itemStatus_idx" ON "PssaLesson"("gradeLevel", "subject", "reviewStatus", "itemStatus");

-- CreateIndex
CREATE INDEX "PssaLesson_standardCode_assessmentAnchor_eligibleContent_idx" ON "PssaLesson"("standardCode", "assessmentAnchor", "eligibleContent");

-- CreateIndex
CREATE INDEX "PssaLesson_sourceType_licenseStatus_idx" ON "PssaLesson"("sourceType", "licenseStatus");

-- CreateIndex
CREATE INDEX "PssaLesson_alignmentStatus_approvalEligible_idx" ON "PssaLesson"("alignmentStatus", "approvalEligible");

-- CreateIndex
CREATE INDEX "PssaLesson_generationBatchId_idx" ON "PssaLesson"("generationBatchId");

-- CreateIndex
CREATE INDEX "PssaLesson_retiredAt_idx" ON "PssaLesson"("retiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PssaStandardsCrosswalk_subject_gradeLevel_eligibleContent_sourceVersionYear_key" ON "PssaStandardsCrosswalk"("subject", "gradeLevel", "eligibleContent", "sourceVersionYear");

-- CreateIndex
CREATE INDEX "PssaStandardsCrosswalk_subject_gradeLevel_assessmentAnchor_idx" ON "PssaStandardsCrosswalk"("subject", "gradeLevel", "assessmentAnchor");

-- CreateIndex
CREATE INDEX "PssaStandardsCrosswalk_subject_gradeLevel_reportingCategory_idx" ON "PssaStandardsCrosswalk"("subject", "gradeLevel", "reportingCategory");

-- CreateIndex
CREATE INDEX "PssaStandardsCrosswalk_eligibleContent_idx" ON "PssaStandardsCrosswalk"("eligibleContent");

-- CreateIndex
CREATE UNIQUE INDEX "PssaCrosswalkPaCoreStandard_crosswalkId_standardCode_key" ON "PssaCrosswalkPaCoreStandard"("crosswalkId", "standardCode");

-- CreateIndex
CREATE INDEX "PssaCrosswalkPaCoreStandard_standardCode_idx" ON "PssaCrosswalkPaCoreStandard"("standardCode");

-- CreateIndex
CREATE UNIQUE INDEX "PssaLinterRun_runKey_key" ON "PssaLinterRun"("runKey");

-- CreateIndex
CREATE INDEX "PssaLinterRun_batchId_createdAt_idx" ON "PssaLinterRun"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "PssaAuditResult_itemId_result_severity_idx" ON "PssaAuditResult"("itemId", "result", "severity");

-- CreateIndex
CREATE INDEX "PssaAuditResult_batchId_ruleId_idx" ON "PssaAuditResult"("batchId", "ruleId");

-- CreateIndex
CREATE INDEX "PssaAuditResult_linterRunId_idx" ON "PssaAuditResult"("linterRunId");

-- CreateIndex
CREATE UNIQUE INDEX "PssaAuditResult_itemId_linterRunId_ruleId_key" ON "PssaAuditResult"("itemId", "linterRunId", "ruleId");

-- CreateIndex
CREATE INDEX "PssaReviewLog_itemId_createdAt_idx" ON "PssaReviewLog"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "PssaReviewLog_passageId_createdAt_idx" ON "PssaReviewLog"("passageId", "createdAt");

-- CreateIndex
CREATE INDEX "PssaReviewLog_lessonId_createdAt_idx" ON "PssaReviewLog"("lessonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_PssaLessonPracticeItems_AB_unique" ON "_PssaLessonPracticeItems"("A", "B");

-- CreateIndex
CREATE INDEX "_PssaLessonPracticeItems_B_index" ON "_PssaLessonPracticeItems"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PssaLessonExitTicketItems_AB_unique" ON "_PssaLessonExitTicketItems"("A", "B");

-- CreateIndex
CREATE INDEX "_PssaLessonExitTicketItems_B_index" ON "_PssaLessonExitTicketItems"("B");

-- AddForeignKey
ALTER TABLE "PssaItem" ADD CONSTRAINT "PssaItem_generationBatchId_fkey" FOREIGN KEY ("generationBatchId") REFERENCES "PssaGenerationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItem" ADD CONSTRAINT "PssaItem_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "PssaPassage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaLesson" ADD CONSTRAINT "PssaLesson_generationBatchId_fkey" FOREIGN KEY ("generationBatchId") REFERENCES "PssaGenerationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaCrosswalkPaCoreStandard" ADD CONSTRAINT "PssaCrosswalkPaCoreStandard_crosswalkId_fkey" FOREIGN KEY ("crosswalkId") REFERENCES "PssaStandardsCrosswalk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaLinterRun" ADD CONSTRAINT "PssaLinterRun_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PssaGenerationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaAuditResult" ADD CONSTRAINT "PssaAuditResult_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaAuditResult" ADD CONSTRAINT "PssaAuditResult_linterRunId_fkey" FOREIGN KEY ("linterRunId") REFERENCES "PssaLinterRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaReviewLog" ADD CONSTRAINT "PssaReviewLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaReviewLog" ADD CONSTRAINT "PssaReviewLog_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "PssaPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaReviewLog" ADD CONSTRAINT "PssaReviewLog_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "PssaLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PssaLessonPracticeItems" ADD CONSTRAINT "_PssaLessonPracticeItems_A_fkey" FOREIGN KEY ("A") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PssaLessonPracticeItems" ADD CONSTRAINT "_PssaLessonPracticeItems_B_fkey" FOREIGN KEY ("B") REFERENCES "PssaLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PssaLessonExitTicketItems" ADD CONSTRAINT "_PssaLessonExitTicketItems_A_fkey" FOREIGN KEY ("A") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PssaLessonExitTicketItems" ADD CONSTRAINT "_PssaLessonExitTicketItems_B_fkey" FOREIGN KEY ("B") REFERENCES "PssaLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
