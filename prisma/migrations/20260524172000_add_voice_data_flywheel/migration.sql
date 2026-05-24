ALTER TABLE "VoiceSession" ADD COLUMN "audioDeletedAt" TIMESTAMP(3);
ALTER TABLE "VoiceSession" ADD COLUMN "asrVendor" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN "asrModelVersion" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN "asrConfidenceMean" DOUBLE PRECISION;

CREATE TABLE "VoiceConsent" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "serviceAudioRetained" BOOLEAN NOT NULL DEFAULT true,
  "serviceAudioRetentionDays" INTEGER NOT NULL DEFAULT 90,
  "trainingCorpusOptedIn" BOOLEAN NOT NULL DEFAULT false,
  "trainingCorpusOptedInAt" TIMESTAMP(3),
  "trainingCorpusOptedOutAt" TIMESTAMP(3),
  "researchPublicationOptedIn" BOOLEAN NOT NULL DEFAULT false,
  "researchPublicationOptedInAt" TIMESTAMP(3),
  "consentTextVersion" TEXT NOT NULL,
  "consentLastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consentLastUpdatedByUserId" TEXT,
  "trainingPurgeRequestedAt" TIMESTAMP(3),
  "trainingPurgeExpectedBy" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceConsentDecision" (
  "id" TEXT NOT NULL,
  "voiceConsentId" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "previousValue" JSONB,
  "newValue" JSONB NOT NULL,
  "consentTextVersion" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "changedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceConsentDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabeledVoiceSegment" (
  "id" TEXT NOT NULL,
  "voiceSessionId" TEXT NOT NULL,
  "segmentStartMs" INTEGER NOT NULL,
  "segmentEndMs" INTEGER NOT NULL,
  "segmentAudioKey" TEXT,
  "expectedText" TEXT NOT NULL,
  "asrTranscript" TEXT NOT NULL,
  "humanTranscript" TEXT,
  "miscueType" TEXT,
  "phonogramCode" TEXT,
  "syllableType" "SyllableType",
  "dialectTransferTag" TEXT,
  "uncertaintyScore" DOUBLE PRECISION,
  "routedFromQueue" BOOLEAN NOT NULL DEFAULT false,
  "skippedAt" TIMESTAMP(3),
  "skippedByUserId" TEXT,
  "skipReason" TEXT,
  "labeledByUserId" TEXT,
  "labeledAt" TIMESTAMP(3),
  "labelerNotes" TEXT,
  "isEvalSet" BOOLEAN NOT NULL DEFAULT false,
  "qaParentSegmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabeledVoiceSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingCorpusBatch" (
  "id" TEXT NOT NULL,
  "batchName" TEXT NOT NULL,
  "exportPurpose" TEXT NOT NULL,
  "segmentCount" INTEGER NOT NULL,
  "totalDurationMs" INTEGER NOT NULL,
  "manifestStorageKey" TEXT NOT NULL,
  "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "exportedByUserId" TEXT NOT NULL,
  "minimumConsentVersion" TEXT NOT NULL,
  "excludedSegmentCount" INTEGER NOT NULL DEFAULT 0,
  "manifestJsonl" TEXT NOT NULL,
  "notes" TEXT,
  CONSTRAINT "TrainingCorpusBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceAudioDeletionLog" (
  "id" TEXT NOT NULL,
  "voiceSessionId" TEXT,
  "studentUserId" TEXT,
  "audioStorageKey" TEXT NOT NULL,
  "deletionReason" TEXT NOT NULL,
  "triggeredByUserId" TEXT,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceAudioDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceAudioAccessLog" (
  "id" TEXT NOT NULL,
  "voiceSessionId" TEXT,
  "segmentId" TEXT,
  "accessedById" TEXT NOT NULL,
  "accessPurpose" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceAudioAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VoiceConsent_studentUserId_key" ON "VoiceConsent"("studentUserId");
CREATE INDEX "VoiceConsent_trainingCorpusOptedIn_idx" ON "VoiceConsent"("trainingCorpusOptedIn");
CREATE INDEX "VoiceConsentDecision_voiceConsentId_createdAt_idx" ON "VoiceConsentDecision"("voiceConsentId", "createdAt");
CREATE INDEX "LabeledVoiceSegment_voiceSessionId_segmentStartMs_idx" ON "LabeledVoiceSegment"("voiceSessionId", "segmentStartMs");
CREATE INDEX "LabeledVoiceSegment_labeledAt_idx" ON "LabeledVoiceSegment"("labeledAt");
CREATE INDEX "LabeledVoiceSegment_miscueType_idx" ON "LabeledVoiceSegment"("miscueType");
CREATE INDEX "LabeledVoiceSegment_isEvalSet_idx" ON "LabeledVoiceSegment"("isEvalSet");
CREATE INDEX "LabeledVoiceSegment_uncertaintyScore_idx" ON "LabeledVoiceSegment"("uncertaintyScore");
CREATE UNIQUE INDEX "TrainingCorpusBatch_batchName_key" ON "TrainingCorpusBatch"("batchName");
CREATE INDEX "TrainingCorpusBatch_exportPurpose_exportedAt_idx" ON "TrainingCorpusBatch"("exportPurpose", "exportedAt");
CREATE INDEX "VoiceAudioDeletionLog_studentUserId_deletedAt_idx" ON "VoiceAudioDeletionLog"("studentUserId", "deletedAt");
CREATE INDEX "VoiceAudioDeletionLog_deletedAt_idx" ON "VoiceAudioDeletionLog"("deletedAt");
CREATE INDEX "VoiceAudioAccessLog_voiceSessionId_createdAt_idx" ON "VoiceAudioAccessLog"("voiceSessionId", "createdAt");
CREATE INDEX "VoiceAudioAccessLog_segmentId_createdAt_idx" ON "VoiceAudioAccessLog"("segmentId", "createdAt");
CREATE INDEX "VoiceAudioAccessLog_accessedById_createdAt_idx" ON "VoiceAudioAccessLog"("accessedById", "createdAt");
CREATE INDEX "VoiceSession_audioDeletedAt_idx" ON "VoiceSession"("audioDeletedAt");

ALTER TABLE "VoiceConsent" ADD CONSTRAINT "VoiceConsent_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceConsentDecision" ADD CONSTRAINT "VoiceConsentDecision_voiceConsentId_fkey" FOREIGN KEY ("voiceConsentId") REFERENCES "VoiceConsent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabeledVoiceSegment" ADD CONSTRAINT "LabeledVoiceSegment_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "VoiceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
