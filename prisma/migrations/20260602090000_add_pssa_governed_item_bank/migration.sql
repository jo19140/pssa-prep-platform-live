-- CreateEnum
CREATE TYPE "PssaSourceType" AS ENUM ('internal_original', 'released_sampler', 'unknown');

-- CreateEnum
CREATE TYPE "PssaLicenseStatus" AS ENUM ('cleared', 'unresolved', 'restricted');

-- CreateEnum
CREATE TYPE "PssaReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PssaItemStatus" AS ENUM ('candidate', 'pilot_ready', 'deprecated_superseded', 'retired');

-- CreateEnum
CREATE TYPE "PssaAlignmentStatus" AS ENUM ('ALIGNED', 'NEEDS_CROSSWALK', 'ANOMALY');

-- CreateEnum
CREATE TYPE "PssaInteractionType" AS ENUM ('MCQ', 'EBSR', 'MULTI_SELECT', 'INLINE_DROPDOWN', 'MATCHING_GRID', 'HOT_TEXT', 'DRAG_DROP', 'SHORT_ANSWER', 'TDA');

-- CreateEnum
CREATE TYPE "PssaStreamType" AS ENUM ('MCQ', 'EBSR', 'MULTI_SELECT', 'HOT_TEXT', 'INLINE_DROPDOWN', 'MATCHING_GRID', 'DRAG_DROP', 'CONVENTIONS', 'SHORT_ANSWER', 'TDA');

-- CreateEnum
CREATE TYPE "PssaAuditSeverity" AS ENUM ('BLOCKER', 'WARN', 'INFO');

-- CreateEnum
CREATE TYPE "PssaAuditResultStatus" AS ENUM ('PASS', 'WARN', 'FAIL');

-- CreateEnum
CREATE TYPE "PssaStudentReadyBlockedReason" AS ENUM ('NONE', 'PENDING_REVIEW', 'STALE_AUDIT_CONTRACT', 'STALE_SOURCE_SCAN', 'CONTENT_HASH_DRIFT', 'FAILED_LATEST_AUDIT', 'DEPRECATED_SUPERSEDED');

-- CreateEnum
CREATE TYPE "PssaPassageRole" AS ENUM ('primary', 'secondary', 'evidence_source');

-- CreateEnum
CREATE TYPE "PssaImportMode" AS ENUM ('dry_run', 'write');

-- CreateEnum
CREATE TYPE "PssaAuditTargetType" AS ENUM ('item', 'passage', 'batch');

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
    "contentHash" TEXT NOT NULL,
    "latestAuditContentHash" TEXT,
    "approvedContentHash" TEXT,
    "auditContractVersion" TEXT,
    "sourceScanVersion" TEXT,
    "latestSourceCorpusHash" TEXT,
    "latestAuditResult" "PssaAuditResultStatus",
    "latestAuditAt" TIMESTAMP(3),
    "studentReadyBlockedReason" "PssaStudentReadyBlockedReason" NOT NULL DEFAULT 'PENDING_REVIEW',
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
    "eligibleContentRefId" TEXT,
    "reportingCategory" TEXT,
    "dokLevel" INTEGER,
    "itemType" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "difficultyBand" TEXT,
    "interactionType" "PssaInteractionType" NOT NULL,
    "interactionSubtype" TEXT,
    "responseSpecJson" JSONB NOT NULL,
    "correctResponseJson" JSONB NOT NULL,
    "scoringJson" JSONB NOT NULL,
    "pointValue" INTEGER NOT NULL,
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
    "responseSpecVersion" TEXT NOT NULL,
    "auditContractVersion" TEXT NOT NULL,
    "sourceScanVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "latestAuditContentHash" TEXT,
    "approvedContentHash" TEXT,
    "latestSourceCorpusHash" TEXT,
    "latestAuditResult" "PssaAuditResultStatus",
    "latestAuditAt" TIMESTAMP(3),
    "importedFromFile" TEXT,
    "importRunId" TEXT,
    "studentReadyBlockedReason" "PssaStudentReadyBlockedReason" NOT NULL DEFAULT 'PENDING_REVIEW',
    "deprecatedReason" TEXT,
    "batchId" TEXT,
    "provenanceJson" JSONB NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaItemPassageLink" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "role" "PssaPassageRole" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaItemPassageLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaItemBatch" (
    "id" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'ELA',
    "streamType" "PssaStreamType" NOT NULL,
    "auditContractVersion" TEXT NOT NULL,
    "sourceScanVersion" TEXT NOT NULL,
    "sourceCorpusHash" TEXT NOT NULL,
    "importRunId" TEXT,
    "batchAuditResult" "PssaAuditResultStatus",
    "batchAuditNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaItemBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaItemSupersession" (
    "id" TEXT NOT NULL,
    "oldItemId" TEXT NOT NULL,
    "newItemId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaItemSupersession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaImportRun" (
    "id" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "mode" "PssaImportMode" NOT NULL,
    "env" TEXT NOT NULL,
    "auditContractVersion" TEXT NOT NULL,
    "sourceScanVersion" TEXT NOT NULL,
    "sourceCorpusHash" TEXT NOT NULL,
    "sourceCorpusManifestJson" JSONB NOT NULL,
    "addedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "reportPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaLinterRun" (
    "id" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "batchId" TEXT,
    "sourceBundlePath" TEXT,
    "auditContractVersion" TEXT NOT NULL,
    "sourceScanVersion" TEXT NOT NULL,
    "sourceCorpusHash" TEXT NOT NULL,
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "blockerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaLinterRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaAuditResult" (
    "id" TEXT NOT NULL,
    "targetType" "PssaAuditTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "itemId" TEXT,
    "passageId" TEXT,
    "batchId" TEXT,
    "linterRunId" TEXT NOT NULL,
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
    "batchId" TEXT,
    "action" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "notes" TEXT,
    "editDiffJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PssaStandardsCrosswalk_subject_gradeLevel_assessmentAnchor_idx" ON "PssaStandardsCrosswalk"("subject", "gradeLevel", "assessmentAnchor");

-- CreateIndex
CREATE INDEX "PssaStandardsCrosswalk_subject_gradeLevel_reportingCategory_idx" ON "PssaStandardsCrosswalk"("subject", "gradeLevel", "reportingCategory");

-- CreateIndex
CREATE INDEX "PssaStandardsCrosswalk_eligibleContent_idx" ON "PssaStandardsCrosswalk"("eligibleContent");

-- CreateIndex
CREATE UNIQUE INDEX "PssaStandardsCrosswalk_subject_gradeLevel_eligibleContent_s_key" ON "PssaStandardsCrosswalk"("subject", "gradeLevel", "eligibleContent", "sourceVersionYear");

-- CreateIndex
CREATE INDEX "PssaCrosswalkPaCoreStandard_standardCode_idx" ON "PssaCrosswalkPaCoreStandard"("standardCode");

-- CreateIndex
CREATE UNIQUE INDEX "PssaCrosswalkPaCoreStandard_crosswalkId_standardCode_key" ON "PssaCrosswalkPaCoreStandard"("crosswalkId", "standardCode");

-- CreateIndex
CREATE INDEX "PssaPassage_gradeLevel_subject_reviewStatus_itemStatus_idx" ON "PssaPassage"("gradeLevel", "subject", "reviewStatus", "itemStatus");

-- CreateIndex
CREATE INDEX "PssaPassage_sourceType_licenseStatus_idx" ON "PssaPassage"("sourceType", "licenseStatus");

-- CreateIndex
CREATE INDEX "PssaPassage_retiredAt_idx" ON "PssaPassage"("retiredAt");

-- CreateIndex
CREATE INDEX "PssaPassage_contentHash_idx" ON "PssaPassage"("contentHash");

-- CreateIndex
CREATE INDEX "PssaItem_gradeLevel_subject_reviewStatus_itemStatus_student_idx" ON "PssaItem"("gradeLevel", "subject", "reviewStatus", "itemStatus", "studentReadyBlockedReason");

-- CreateIndex
CREATE INDEX "PssaItem_auditContractVersion_sourceScanVersion_idx" ON "PssaItem"("auditContractVersion", "sourceScanVersion");

-- CreateIndex
CREATE INDEX "PssaItem_interactionType_interactionSubtype_idx" ON "PssaItem"("interactionType", "interactionSubtype");

-- CreateIndex
CREATE INDEX "PssaItem_standardCode_assessmentAnchor_eligibleContent_idx" ON "PssaItem"("standardCode", "assessmentAnchor", "eligibleContent");

-- CreateIndex
CREATE INDEX "PssaItem_eligibleContentRefId_idx" ON "PssaItem"("eligibleContentRefId");

-- CreateIndex
CREATE INDEX "PssaItem_alignmentStatus_approvalEligible_idx" ON "PssaItem"("alignmentStatus", "approvalEligible");

-- CreateIndex
CREATE INDEX "PssaItem_batchId_idx" ON "PssaItem"("batchId");

-- CreateIndex
CREATE INDEX "PssaItem_importRunId_idx" ON "PssaItem"("importRunId");

-- CreateIndex
CREATE INDEX "PssaItem_contentHash_idx" ON "PssaItem"("contentHash");

-- CreateIndex
CREATE INDEX "PssaItem_retiredAt_idx" ON "PssaItem"("retiredAt");

-- CreateIndex
CREATE INDEX "PssaItemPassageLink_itemId_idx" ON "PssaItemPassageLink"("itemId");

-- CreateIndex
CREATE INDEX "PssaItemPassageLink_passageId_role_idx" ON "PssaItemPassageLink"("passageId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PssaItemPassageLink_itemId_passageId_role_key" ON "PssaItemPassageLink"("itemId", "passageId", "role");

-- CreateIndex
CREATE INDEX "PssaItemBatch_gradeLevel_subject_streamType_auditContractVe_idx" ON "PssaItemBatch"("gradeLevel", "subject", "streamType", "auditContractVersion");

-- CreateIndex
CREATE INDEX "PssaItemBatch_importRunId_idx" ON "PssaItemBatch"("importRunId");

-- CreateIndex
CREATE INDEX "PssaItemSupersession_oldItemId_idx" ON "PssaItemSupersession"("oldItemId");

-- CreateIndex
CREATE INDEX "PssaItemSupersession_newItemId_idx" ON "PssaItemSupersession"("newItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PssaItemSupersession_oldItemId_newItemId_key" ON "PssaItemSupersession"("oldItemId", "newItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PssaImportRun_runKey_key" ON "PssaImportRun"("runKey");

-- CreateIndex
CREATE UNIQUE INDEX "PssaLinterRun_runKey_key" ON "PssaLinterRun"("runKey");

-- CreateIndex
CREATE INDEX "PssaAuditResult_targetType_targetId_result_severity_idx" ON "PssaAuditResult"("targetType", "targetId", "result", "severity");

-- CreateIndex
CREATE INDEX "PssaAuditResult_itemId_result_severity_idx" ON "PssaAuditResult"("itemId", "result", "severity");

-- CreateIndex
CREATE INDEX "PssaAuditResult_passageId_result_severity_idx" ON "PssaAuditResult"("passageId", "result", "severity");

-- CreateIndex
CREATE INDEX "PssaAuditResult_batchId_ruleId_idx" ON "PssaAuditResult"("batchId", "ruleId");

-- CreateIndex
CREATE INDEX "PssaAuditResult_linterRunId_idx" ON "PssaAuditResult"("linterRunId");

-- CreateIndex
CREATE UNIQUE INDEX "PssaAuditResult_targetType_targetId_linterRunId_ruleId_key" ON "PssaAuditResult"("targetType", "targetId", "linterRunId", "ruleId");

-- CreateIndex
CREATE INDEX "PssaReviewLog_itemId_createdAt_idx" ON "PssaReviewLog"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "PssaReviewLog_passageId_createdAt_idx" ON "PssaReviewLog"("passageId", "createdAt");

-- CreateIndex
CREATE INDEX "PssaReviewLog_batchId_createdAt_idx" ON "PssaReviewLog"("batchId", "createdAt");

-- AddForeignKey
ALTER TABLE "PssaCrosswalkPaCoreStandard" ADD CONSTRAINT "PssaCrosswalkPaCoreStandard_crosswalkId_fkey" FOREIGN KEY ("crosswalkId") REFERENCES "PssaStandardsCrosswalk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItem" ADD CONSTRAINT "PssaItem_eligibleContentRefId_fkey" FOREIGN KEY ("eligibleContentRefId") REFERENCES "PssaStandardsCrosswalk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItem" ADD CONSTRAINT "PssaItem_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "PssaImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItem" ADD CONSTRAINT "PssaItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PssaItemBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItemPassageLink" ADD CONSTRAINT "PssaItemPassageLink_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItemPassageLink" ADD CONSTRAINT "PssaItemPassageLink_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "PssaPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItemBatch" ADD CONSTRAINT "PssaItemBatch_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "PssaImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItemSupersession" ADD CONSTRAINT "PssaItemSupersession_oldItemId_fkey" FOREIGN KEY ("oldItemId") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaItemSupersession" ADD CONSTRAINT "PssaItemSupersession_newItemId_fkey" FOREIGN KEY ("newItemId") REFERENCES "PssaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaLinterRun" ADD CONSTRAINT "PssaLinterRun_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PssaItemBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaAuditResult" ADD CONSTRAINT "PssaAuditResult_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaAuditResult" ADD CONSTRAINT "PssaAuditResult_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "PssaPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaAuditResult" ADD CONSTRAINT "PssaAuditResult_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PssaItemBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaAuditResult" ADD CONSTRAINT "PssaAuditResult_linterRunId_fkey" FOREIGN KEY ("linterRunId") REFERENCES "PssaLinterRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaReviewLog" ADD CONSTRAINT "PssaReviewLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PssaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaReviewLog" ADD CONSTRAINT "PssaReviewLog_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "PssaPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaReviewLog" ADD CONSTRAINT "PssaReviewLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PssaItemBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "PssaAuditResult" ADD CONSTRAINT "PssaAuditResult_target_matches_fk_check" CHECK (
    (
        "targetType" = 'item'
        AND "itemId" IS NOT NULL
        AND "passageId" IS NULL
        AND "batchId" IS NULL
    )
    OR (
        "targetType" = 'passage'
        AND "itemId" IS NULL
        AND "passageId" IS NOT NULL
        AND "batchId" IS NULL
    )
    OR (
        "targetType" = 'batch'
        AND "itemId" IS NULL
        AND "passageId" IS NULL
        AND "batchId" IS NOT NULL
    )
);
