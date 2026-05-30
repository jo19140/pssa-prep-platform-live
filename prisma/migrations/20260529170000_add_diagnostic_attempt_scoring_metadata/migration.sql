ALTER TABLE "DiagnosticItemAttempt"
  ADD COLUMN "delayed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scoreConfidence" DOUBLE PRECISION,
  ADD COLUMN "scorerReasoningJson" JSONB,
  ADD COLUMN "isPracticeAttempt" BOOLEAN NOT NULL DEFAULT false;
