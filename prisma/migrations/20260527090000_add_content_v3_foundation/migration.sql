-- Content v3 foundation: placement positions, daily targets, reviewed content artifacts, and session evidence.

ALTER TABLE "LiteracyProfile" ADD COLUMN "currentDailyTargetId" TEXT;
ALTER TABLE "LiteracyProfile" ADD COLUMN "phasePositionId" TEXT;
ALTER TABLE "LiteracyProfile" ADD COLUMN "diagnosticConfidence" DOUBLE PRECISION;
ALTER TABLE "LiteracyProfile" ADD COLUMN "diagnosticEvidenceJson" JSONB;
ALTER TABLE "StrandScore" ADD COLUMN "statusLabel" TEXT;

CREATE TABLE "PhasePosition" (
  "id" TEXT NOT NULL,
  "phaseNumber" INTEGER NOT NULL,
  "subPosition" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "phonicsTrack" TEXT NOT NULL,
  "morphologyTrack" TEXT NOT NULL,
  "prerequisites" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhasePosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyTarget" (
  "id" TEXT NOT NULL,
  "phasePositionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "kidVisibleLabel" TEXT NOT NULL,
  "tutorLabel" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "introductionOrder" INTEGER NOT NULL,
  "targetPatternsJson" JSONB NOT NULL,
  "allowedPatternCodes" TEXT[],
  "blockedPatternCodes" TEXT[],
  "exampleWords" TEXT[],
  "exampleNonwords" TEXT[],
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticItem" (
  "id" TEXT NOT NULL,
  "strand" TEXT NOT NULL,
  "phasePositionId" TEXT,
  "dailyTargetId" TEXT,
  "itemType" TEXT NOT NULL,
  "promptJson" JSONB NOT NULL,
  "correctAnswer" TEXT,
  "scoringRubricJson" JSONB,
  "difficultyBand" INTEGER NOT NULL,
  "isPracticeItem" BOOLEAN NOT NULL DEFAULT false,
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "firstLookReviewModelDecisionId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticSession" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "resultJson" JSONB,
  "confidenceScore" DOUBLE PRECISION,
  "confidenceExplanation" TEXT,
  "totalScoredItems" INTEGER NOT NULL DEFAULT 0,
  "audioClearItems" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DiagnosticSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticItemAttempt" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "diagnosticItemId" TEXT NOT NULL,
  "diagnosticSessionId" TEXT NOT NULL,
  "responseJson" JSONB,
  "scored" BOOLEAN NOT NULL,
  "correct" BOOLEAN,
  "responseTimeMs" INTEGER,
  "audioConfidence" DOUBLE PRECISION,
  "scoreContext" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticItemAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Passage" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceMetadataJson" JSONB,
  "wordCount" INTEGER NOT NULL,
  "phasePositionId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "contentAuditJson" JSONB NOT NULL,
  "decodabilityScore" DOUBLE PRECISION NOT NULL,
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "firstLookReviewModelDecisionId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "sourceAttributionCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Passage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL,
  "phasePositionId" TEXT NOT NULL,
  "dailyTargetId" TEXT NOT NULL,
  "passageId" TEXT,
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonPart" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "partNumber" INTEGER NOT NULL,
  "partLabel" TEXT NOT NULL,
  "kidVisibleCopy" JSONB NOT NULL,
  "tutorVisibleCopy" JSONB,
  "contentJson" JSONB NOT NULL,
  "designNotes" TEXT,
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "firstLookReviewModelDecisionId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  CONSTRAINT "LessonPart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassageReviewLog" (
  "id" TEXT NOT NULL,
  "passageId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "notes" TEXT,
  "editDiffJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PassageReviewLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HighFrequencyWord" (
  "id" TEXT NOT NULL,
  "lemma" TEXT NOT NULL,
  "forms" TEXT[],
  "isRegular" BOOLEAN NOT NULL,
  "ndlRank" INTEGER,
  "subtlexRank" INTEGER,
  "introducedAtPhase" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HighFrequencyWord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HfwMastery" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "hfwId" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'INTRODUCED',
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "lastSeenAt" TIMESTAMP(3),
  CONSTRAINT "HfwMastery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyTargetMastery" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "dailyTargetId" TEXT NOT NULL,
  "decodingStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "encodingStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "connectedTextStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "lastDecodingAccuracy" DOUBLE PRECISION,
  "lastEncodingAccuracy" DOUBLE PRECISION,
  "lastConnectedTextAccuracy" DOUBLE PRECISION,
  "evidenceJson" JSONB,
  "lastPracticedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyTargetMastery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LicenseAttribution" (
  "id" TEXT NOT NULL,
  "sourceCode" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "licenseCode" TEXT NOT NULL,
  "attributionText" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "commercialUseAllowed" BOOLEAN NOT NULL,
  "shareAlikeRequired" BOOLEAN NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LicenseAttribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Morpheme" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "morphemeType" TEXT NOT NULL,
  "meaning" TEXT,
  "frequencyRank" INTEGER,
  "decompositionJson" JSONB,
  "productivityScore" DOUBLE PRECISION,
  "allomorphs" TEXT[],
  "sourceAttributionCode" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Morpheme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonSession" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "partResultsJson" JSONB NOT NULL,
  "reteachLogJson" JSONB NOT NULL,
  "connectedTextMode" TEXT,
  "masteryConfidence" DOUBLE PRECISION,
  "durationSeconds" INTEGER,
  CONSTRAINT "LessonSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReteachEvent" (
  "id" TEXT NOT NULL,
  "lessonSessionId" TEXT NOT NULL,
  "triggeredAtPart" INTEGER NOT NULL,
  "triggerType" TEXT NOT NULL,
  "targetConcept" TEXT NOT NULL,
  "outcomeJson" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReteachEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhasePosition_phaseNumber_subPosition_key" ON "PhasePosition"("phaseNumber", "subPosition");
CREATE UNIQUE INDEX "DailyTarget_code_key" ON "DailyTarget"("code");
CREATE INDEX "DailyTarget_phasePositionId_introductionOrder_idx" ON "DailyTarget"("phasePositionId", "introductionOrder");
CREATE INDEX "DailyTarget_reviewStatus_idx" ON "DailyTarget"("reviewStatus");
CREATE INDEX "DiagnosticItem_strand_difficultyBand_idx" ON "DiagnosticItem"("strand", "difficultyBand");
CREATE INDEX "DiagnosticItem_reviewStatus_idx" ON "DiagnosticItem"("reviewStatus");
CREATE INDEX "DiagnosticItem_firstLookReviewModelDecisionId_idx" ON "DiagnosticItem"("firstLookReviewModelDecisionId");
CREATE INDEX "DiagnosticItem_phasePositionId_dailyTargetId_idx" ON "DiagnosticItem"("phasePositionId", "dailyTargetId");
CREATE INDEX "DiagnosticItemAttempt_studentUserId_diagnosticSessionId_idx" ON "DiagnosticItemAttempt"("studentUserId", "diagnosticSessionId");
CREATE INDEX "DiagnosticItemAttempt_diagnosticItemId_idx" ON "DiagnosticItemAttempt"("diagnosticItemId");
CREATE INDEX "DiagnosticSession_studentUserId_startedAt_idx" ON "DiagnosticSession"("studentUserId", "startedAt");
CREATE INDEX "Passage_phasePositionId_reviewStatus_idx" ON "Passage"("phasePositionId", "reviewStatus");
CREATE INDEX "Lesson_phasePositionId_dailyTargetId_idx" ON "Lesson"("phasePositionId", "dailyTargetId");
CREATE INDEX "Lesson_reviewStatus_idx" ON "Lesson"("reviewStatus");
CREATE UNIQUE INDEX "LessonPart_lessonId_partNumber_key" ON "LessonPart"("lessonId", "partNumber");
CREATE INDEX "LessonPart_reviewStatus_idx" ON "LessonPart"("reviewStatus");
CREATE INDEX "LessonPart_firstLookReviewModelDecisionId_idx" ON "LessonPart"("firstLookReviewModelDecisionId");
CREATE INDEX "Passage_firstLookReviewModelDecisionId_idx" ON "Passage"("firstLookReviewModelDecisionId");
CREATE UNIQUE INDEX "HighFrequencyWord_lemma_key" ON "HighFrequencyWord"("lemma");
CREATE UNIQUE INDEX "HfwMastery_studentUserId_hfwId_key" ON "HfwMastery"("studentUserId", "hfwId");
CREATE UNIQUE INDEX "DailyTargetMastery_studentUserId_dailyTargetId_key" ON "DailyTargetMastery"("studentUserId", "dailyTargetId");
CREATE INDEX "DailyTargetMastery_studentUserId_idx" ON "DailyTargetMastery"("studentUserId");
CREATE UNIQUE INDEX "LicenseAttribution_sourceCode_key" ON "LicenseAttribution"("sourceCode");
CREATE UNIQUE INDEX "Morpheme_text_morphemeType_key" ON "Morpheme"("text", "morphemeType");
CREATE INDEX "Morpheme_morphemeType_idx" ON "Morpheme"("morphemeType");
CREATE INDEX "Morpheme_sourceAttributionCode_idx" ON "Morpheme"("sourceAttributionCode");
CREATE INDEX "LessonSession_studentUserId_startedAt_idx" ON "LessonSession"("studentUserId", "startedAt");
CREATE INDEX "ReteachEvent_lessonSessionId_idx" ON "ReteachEvent"("lessonSessionId");

ALTER TABLE "LiteracyProfile" ADD CONSTRAINT "LiteracyProfile_currentDailyTargetId_fkey" FOREIGN KEY ("currentDailyTargetId") REFERENCES "DailyTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiteracyProfile" ADD CONSTRAINT "LiteracyProfile_phasePositionId_fkey" FOREIGN KEY ("phasePositionId") REFERENCES "PhasePosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyTarget" ADD CONSTRAINT "DailyTarget_phasePositionId_fkey" FOREIGN KEY ("phasePositionId") REFERENCES "PhasePosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticItem" ADD CONSTRAINT "DiagnosticItem_phasePositionId_fkey" FOREIGN KEY ("phasePositionId") REFERENCES "PhasePosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiagnosticItem" ADD CONSTRAINT "DiagnosticItem_dailyTargetId_fkey" FOREIGN KEY ("dailyTargetId") REFERENCES "DailyTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiagnosticItem" ADD CONSTRAINT "DiagnosticItem_firstLookReviewModelDecisionId_fkey" FOREIGN KEY ("firstLookReviewModelDecisionId") REFERENCES "ModelDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiagnosticItemAttempt" ADD CONSTRAINT "DiagnosticItemAttempt_diagnosticItemId_fkey" FOREIGN KEY ("diagnosticItemId") REFERENCES "DiagnosticItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticItemAttempt" ADD CONSTRAINT "DiagnosticItemAttempt_diagnosticSessionId_fkey" FOREIGN KEY ("diagnosticSessionId") REFERENCES "DiagnosticSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_phasePositionId_fkey" FOREIGN KEY ("phasePositionId") REFERENCES "PhasePosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_dailyTargetId_fkey" FOREIGN KEY ("dailyTargetId") REFERENCES "DailyTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LessonPart" ADD CONSTRAINT "LessonPart_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonPart" ADD CONSTRAINT "LessonPart_firstLookReviewModelDecisionId_fkey" FOREIGN KEY ("firstLookReviewModelDecisionId") REFERENCES "ModelDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Passage" ADD CONSTRAINT "Passage_firstLookReviewModelDecisionId_fkey" FOREIGN KEY ("firstLookReviewModelDecisionId") REFERENCES "ModelDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassageReviewLog" ADD CONSTRAINT "PassageReviewLog_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HfwMastery" ADD CONSTRAINT "HfwMastery_hfwId_fkey" FOREIGN KEY ("hfwId") REFERENCES "HighFrequencyWord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyTargetMastery" ADD CONSTRAINT "DailyTargetMastery_dailyTargetId_fkey" FOREIGN KEY ("dailyTargetId") REFERENCES "DailyTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonSession" ADD CONSTRAINT "LessonSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReteachEvent" ADD CONSTRAINT "ReteachEvent_lessonSessionId_fkey" FOREIGN KEY ("lessonSessionId") REFERENCES "LessonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
