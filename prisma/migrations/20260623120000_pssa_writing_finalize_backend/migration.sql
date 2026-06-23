-- Additive finalize backend for diagnostic writing teacher review.
ALTER TABLE "PssaFormResponse"
ADD COLUMN "conditionCode" "PssaWritingNonScorableReason";

CREATE TABLE "PssaWritingFinalizeReceipt" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "resultAttemptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaWritingFinalizeReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PssaWritingFinalizeReceipt_idempotencyKey_key" ON "PssaWritingFinalizeReceipt"("idempotencyKey");
CREATE INDEX "PssaWritingFinalizeReceipt_evaluationId_idx" ON "PssaWritingFinalizeReceipt"("evaluationId");
CREATE INDEX "PssaWritingFinalizeReceipt_teacherUserId_idx" ON "PssaWritingFinalizeReceipt"("teacherUserId");
CREATE INDEX "PssaWritingFinalizeReceipt_resultAttemptId_idx" ON "PssaWritingFinalizeReceipt"("resultAttemptId");

ALTER TABLE "PssaWritingFinalizeReceipt"
ADD CONSTRAINT "PssaWritingFinalizeReceipt_evaluationId_fkey"
FOREIGN KEY ("evaluationId") REFERENCES "PssaWritingEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PssaWritingFinalizeReceipt"
ADD CONSTRAINT "PssaWritingFinalizeReceipt_teacherUserId_fkey"
FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PssaWritingFinalizeReceipt"
ADD CONSTRAINT "PssaWritingFinalizeReceipt_resultAttemptId_fkey"
FOREIGN KEY ("resultAttemptId") REFERENCES "PssaWritingEvaluationAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
