CREATE TYPE "EhriPhase" AS ENUM ('PRE_ALPHABETIC', 'PARTIAL_ALPHABETIC', 'FULL_ALPHABETIC', 'CONSOLIDATED_ALPHABETIC');
CREATE TYPE "SynesisProgram" AS ENUM ('VENUS', 'MERCURY', 'MARS', 'EARTH');
CREATE TYPE "TestPrepModule" AS ENUM ('PSSA', 'STAAR', 'FSA', 'MCAS');
CREATE TYPE "LiteracyStrand" AS ENUM ('PHONEMIC_AWARENESS', 'DECODING', 'MORPHOLOGY', 'FLUENCY', 'VOCABULARY', 'COMPREHENSION');
CREATE TYPE "SyllableType" AS ENUM ('CLOSED', 'OPEN', 'VCE', 'VOWEL_TEAM', 'R_CONTROLLED', 'CONSONANT_LE');
CREATE TYPE "MasteryLevel" AS ENUM ('UNTESTED', 'NOT_YET', 'DEVELOPING', 'SOLID', 'MASTERED');

ALTER TABLE "User" ADD COLUMN "enrolledPrograms" "SynesisProgram"[] DEFAULT ARRAY['VENUS']::"SynesisProgram"[];
ALTER TABLE "User" ADD COLUMN "enrolledTestPrep" "TestPrepModule"[] DEFAULT ARRAY['PSSA']::"TestPrepModule"[];
ALTER TABLE "User" ADD COLUMN "synesisMigrationBannerDismissedAt" TIMESTAMP(3);

ALTER TABLE "Assessment" ADD COLUMN "ehriPhaseAtTime" "EhriPhase";
ALTER TABLE "Assessment" ADD COLUMN "lexileBand" INTEGER;

CREATE TABLE "LiteracyProfile" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "ehriPhase" "EhriPhase" NOT NULL DEFAULT 'PRE_ALPHABETIC',
  "ehriPhaseConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lexileEstimate" INTEGER,
  "gradeEquivalent" DOUBLE PRECISION,
  "lastDiagnosticAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiteracyProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrandScore" (
  "id" TEXT NOT NULL,
  "literacyProfileId" TEXT NOT NULL,
  "strand" "LiteracyStrand" NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "level" "MasteryLevel" NOT NULL,
  "priorityRank" INTEGER,
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StrandScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PhonogramFamily" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "syllableType" TEXT NOT NULL,
  "exampleWords" JSONB NOT NULL DEFAULT '[]',
  "introductionOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhonogramFamily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PhonogramFamily_code_key" UNIQUE ("code")
);

CREATE TABLE "PhonogramMastery" (
  "id" TEXT NOT NULL,
  "literacyProfileId" TEXT NOT NULL,
  "phonogramFamilyId" TEXT NOT NULL,
  "level" "MasteryLevel" NOT NULL DEFAULT 'UNTESTED',
  "correctAttempts" INTEGER NOT NULL DEFAULT 0,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastSeenAt" TIMESTAMP(3),
  CONSTRAINT "PhonogramMastery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyllableTypeMastery" (
  "id" TEXT NOT NULL,
  "literacyProfileId" TEXT NOT NULL,
  "syllableType" "SyllableType" NOT NULL,
  "level" "MasteryLevel" NOT NULL DEFAULT 'UNTESTED',
  "correctAttempts" INTEGER NOT NULL DEFAULT 0,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SyllableTypeMastery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DialectSettings" (
  "id" TEXT NOT NULL,
  "literacyProfileId" TEXT NOT NULL,
  "homeLanguages" TEXT[],
  "regionalDialects" TEXT[],
  "optedInAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DialectSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutopilotDecision" (
  "id" TEXT NOT NULL,
  "literacyProfileId" TEXT NOT NULL,
  "decisionType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "reasoning" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "overriddenAt" TIMESTAMP(3),
  "overriddenByUserId" TEXT,
  CONSTRAINT "AutopilotDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceSession" (
  "id" TEXT NOT NULL,
  "literacyProfileId" TEXT NOT NULL,
  "sessionType" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "audioStorageKey" TEXT,
  "transcriptJson" JSONB,
  "wordsRead" INTEGER,
  "wordsCorrect" INTEGER,
  "wordsSelfCorrected" INTEGER,
  "wordsMissed" INTEGER,
  "wpm" INTEGER,
  "retentionTier" TEXT NOT NULL DEFAULT 'SERVICE',
  "deleteAfterDate" TIMESTAMP(3),
  CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StateRequests" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "stateCode" TEXT NOT NULL,
  "requestNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StateRequests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiteracyProfile_studentUserId_key" ON "LiteracyProfile"("studentUserId");
CREATE INDEX "LiteracyProfile_ehriPhase_idx" ON "LiteracyProfile"("ehriPhase");
CREATE UNIQUE INDEX "StrandScore_literacyProfileId_strand_key" ON "StrandScore"("literacyProfileId", "strand");
CREATE UNIQUE INDEX IF NOT EXISTS "PhonogramFamily_code_key" ON "PhonogramFamily"("code");
CREATE INDEX IF NOT EXISTS "PhonogramFamily_category_introductionOrder_idx" ON "PhonogramFamily"("category", "introductionOrder");
CREATE INDEX IF NOT EXISTS "PhonogramFamily_syllableType_introductionOrder_idx" ON "PhonogramFamily"("syllableType", "introductionOrder");
CREATE UNIQUE INDEX "PhonogramMastery_literacyProfileId_phonogramFamilyId_key" ON "PhonogramMastery"("literacyProfileId", "phonogramFamilyId");
CREATE UNIQUE INDEX "SyllableTypeMastery_literacyProfileId_syllableType_key" ON "SyllableTypeMastery"("literacyProfileId", "syllableType");
CREATE UNIQUE INDEX "DialectSettings_literacyProfileId_key" ON "DialectSettings"("literacyProfileId");
CREATE INDEX "AutopilotDecision_literacyProfileId_appliedAt_idx" ON "AutopilotDecision"("literacyProfileId", "appliedAt");
CREATE INDEX "VoiceSession_literacyProfileId_startedAt_idx" ON "VoiceSession"("literacyProfileId", "startedAt");
CREATE INDEX "VoiceSession_sessionType_startedAt_idx" ON "VoiceSession"("sessionType", "startedAt");
CREATE INDEX "VoiceSession_deleteAfterDate_idx" ON "VoiceSession"("deleteAfterDate");
CREATE INDEX "StateRequests_stateCode_createdAt_idx" ON "StateRequests"("stateCode", "createdAt");

ALTER TABLE "LiteracyProfile" ADD CONSTRAINT "LiteracyProfile_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrandScore" ADD CONSTRAINT "StrandScore_literacyProfileId_fkey" FOREIGN KEY ("literacyProfileId") REFERENCES "LiteracyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhonogramMastery" ADD CONSTRAINT "PhonogramMastery_literacyProfileId_fkey" FOREIGN KEY ("literacyProfileId") REFERENCES "LiteracyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhonogramMastery" ADD CONSTRAINT "PhonogramMastery_phonogramFamilyId_fkey" FOREIGN KEY ("phonogramFamilyId") REFERENCES "PhonogramFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyllableTypeMastery" ADD CONSTRAINT "SyllableTypeMastery_literacyProfileId_fkey" FOREIGN KEY ("literacyProfileId") REFERENCES "LiteracyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DialectSettings" ADD CONSTRAINT "DialectSettings_literacyProfileId_fkey" FOREIGN KEY ("literacyProfileId") REFERENCES "LiteracyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutopilotDecision" ADD CONSTRAINT "AutopilotDecision_literacyProfileId_fkey" FOREIGN KEY ("literacyProfileId") REFERENCES "LiteracyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_literacyProfileId_fkey" FOREIGN KEY ("literacyProfileId") REFERENCES "LiteracyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StateRequests" ADD CONSTRAINT "StateRequests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
