-- AlterTable
ALTER TABLE "VoiceConsent" ADD COLUMN "generalDataRetained" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "VoiceConsent" ADD COLUMN "generalDataRetentionDays" INTEGER NOT NULL DEFAULT 90;

-- CreateTable
CREATE TABLE "StudentEvent" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contextJson" JSONB NOT NULL,
    "responseJson" JSONB,
    "durationMs" INTEGER,
    "immediateOutcome" TEXT,
    "clientPlatform" TEXT,
    "appVersion" TEXT,
    "retentionTier" TEXT NOT NULL DEFAULT 'SERVICE',
    "deleteAfterDate" TIMESTAMP(3),

    CONSTRAINT "StudentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEventOutcome" (
    "id" TEXT NOT NULL,
    "studentEventId" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcomeScore" DOUBLE PRECISION,
    "outcomeLabel" TEXT,
    "metricJson" JSONB,

    CONSTRAINT "StudentEventOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelDecision" (
    "id" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT,
    "inputContextJson" JSONB NOT NULL,
    "inputHash" TEXT NOT NULL,
    "promptKey" TEXT,
    "decisionJson" JSONB NOT NULL,
    "outputHash" TEXT,
    "inferenceMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "studentEventId" TEXT,
    "parentDecisionId" TEXT,
    "retentionTier" TEXT NOT NULL DEFAULT 'SERVICE',
    "deleteAfterDate" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelDecisionOutcome" (
    "id" TEXT NOT NULL,
    "modelDecisionId" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "outcomeScore" DOUBLE PRECISION,
    "outcomeLabel" TEXT,
    "metricJson" JSONB,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelDecisionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventExportBatch" (
    "id" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "exportPurpose" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "decisionCount" INTEGER NOT NULL,
    "eventTypeFilter" TEXT[],
    "decisionTypeFilter" TEXT[],
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "consentTierMinimum" TEXT NOT NULL,
    "excludedRecordCount" INTEGER NOT NULL DEFAULT 0,
    "manifestStorageKey" TEXT NOT NULL,
    "manifestJsonl" TEXT NOT NULL,
    "exportedByUserId" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "EventExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionLog" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT,
    "deletionReason" TEXT NOT NULL,
    "deletedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,

    CONSTRAINT "DataDeletionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentEvent_studentUserId_occurredAt_idx" ON "StudentEvent"("studentUserId", "occurredAt");
CREATE INDEX "StudentEvent_eventType_occurredAt_idx" ON "StudentEvent"("eventType", "occurredAt");
CREATE INDEX "StudentEvent_sessionId_idx" ON "StudentEvent"("sessionId");
CREATE INDEX "StudentEvent_deleteAfterDate_idx" ON "StudentEvent"("deleteAfterDate");
CREATE UNIQUE INDEX "StudentEventOutcome_studentEventId_outcomeType_key" ON "StudentEventOutcome"("studentEventId", "outcomeType");
CREATE INDEX "StudentEventOutcome_outcomeType_measuredAt_idx" ON "StudentEventOutcome"("outcomeType", "measuredAt");
CREATE INDEX "ModelDecision_decisionType_occurredAt_idx" ON "ModelDecision"("decisionType", "occurredAt");
CREATE INDEX "ModelDecision_modelProvider_modelName_occurredAt_idx" ON "ModelDecision"("modelProvider", "modelName", "occurredAt");
CREATE INDEX "ModelDecision_inputHash_idx" ON "ModelDecision"("inputHash");
CREATE INDEX "ModelDecision_studentEventId_idx" ON "ModelDecision"("studentEventId");
CREATE INDEX "ModelDecision_deleteAfterDate_idx" ON "ModelDecision"("deleteAfterDate");
CREATE UNIQUE INDEX "ModelDecisionOutcome_modelDecisionId_outcomeType_key" ON "ModelDecisionOutcome"("modelDecisionId", "outcomeType");
CREATE INDEX "ModelDecisionOutcome_outcomeType_measuredAt_idx" ON "ModelDecisionOutcome"("outcomeType", "measuredAt");
CREATE UNIQUE INDEX "EventExportBatch_batchName_key" ON "EventExportBatch"("batchName");
CREATE INDEX "EventExportBatch_exportPurpose_exportedAt_idx" ON "EventExportBatch"("exportPurpose", "exportedAt");
CREATE INDEX "DataDeletionLog_studentUserId_deletedAt_idx" ON "DataDeletionLog"("studentUserId", "deletedAt");
CREATE INDEX "DataDeletionLog_recordType_deletedAt_idx" ON "DataDeletionLog"("recordType", "deletedAt");

-- AddForeignKey
ALTER TABLE "StudentEvent" ADD CONSTRAINT "StudentEvent_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEventOutcome" ADD CONSTRAINT "StudentEventOutcome_studentEventId_fkey" FOREIGN KEY ("studentEventId") REFERENCES "StudentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelDecision" ADD CONSTRAINT "ModelDecision_studentEventId_fkey" FOREIGN KEY ("studentEventId") REFERENCES "StudentEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModelDecision" ADD CONSTRAINT "ModelDecision_parentDecisionId_fkey" FOREIGN KEY ("parentDecisionId") REFERENCES "ModelDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModelDecisionOutcome" ADD CONSTRAINT "ModelDecisionOutcome_modelDecisionId_fkey" FOREIGN KEY ("modelDecisionId") REFERENCES "ModelDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
