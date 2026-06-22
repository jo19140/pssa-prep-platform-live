-- CreateEnum
CREATE TYPE "PssaWritingEvaluationStatus" AS ENUM ('PENDING', 'DRAFTED', 'FAILED', 'FINALIZED', 'NON_SCORABLE');

-- CreateEnum
CREATE TYPE "PssaWritingAttemptKind" AS ENUM ('AI_DRAFT', 'TEACHER_FINAL', 'TEACHER_OVERRIDE');

-- CreateEnum
CREATE TYPE "PssaWritingNonScorableReason" AS ENUM ('BLANK', 'REFUSAL', 'OFF_TOPIC', 'COPIED', 'OTHER');

-- CreateEnum
CREATE TYPE "PssaWritingGradingJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "PssaWritingEvaluation" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "responseHash" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "rubricVersion" TEXT NOT NULL,
    "rubricContentHash" TEXT NOT NULL,
    "currentInputHash" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "passageContentHash" TEXT NOT NULL,
    "anchorSetContentHash" TEXT,
    "status" "PssaWritingEvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "currentDraftAttemptId" TEXT,
    "currentFinalAttemptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaWritingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaWritingEvaluationAttempt" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "kind" "PssaWritingAttemptKind" NOT NULL,
    "attemptIdempotencyKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "responseHash" TEXT NOT NULL,
    "score" INTEGER,
    "nonScorableReason" "PssaWritingNonScorableReason",
    "rationale" TEXT,
    "instructionalProfileJson" JSONB,
    "scorerVersion" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "modelId" TEXT,
    "anchorSetVersion" TEXT,
    "reviewedByUserId" TEXT,
    "overrideReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaWritingEvaluationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PssaWritingGradingJob" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "status" "PssaWritingGradingJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaWritingGradingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PssaWritingEvaluation_responseId_key" ON "PssaWritingEvaluation"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "PssaWritingEvaluation_currentDraftAttemptId_key" ON "PssaWritingEvaluation"("currentDraftAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "PssaWritingEvaluation_currentFinalAttemptId_key" ON "PssaWritingEvaluation"("currentFinalAttemptId");

-- CreateIndex
CREATE INDEX "PssaWritingEvaluation_status_updatedAt_idx" ON "PssaWritingEvaluation"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "PssaWritingEvaluation_currentInputHash_idx" ON "PssaWritingEvaluation"("currentInputHash");

-- CreateIndex
CREATE UNIQUE INDEX "PssaWritingEvaluationAttempt_attemptIdempotencyKey_key" ON "PssaWritingEvaluationAttempt"("attemptIdempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PssaWritingEvaluationAttempt_evaluationId_attemptNumber_key" ON "PssaWritingEvaluationAttempt"("evaluationId", "attemptNumber");

-- CreateIndex
CREATE INDEX "PssaWritingEvaluationAttempt_evaluationId_kind_inputHash_idx" ON "PssaWritingEvaluationAttempt"("evaluationId", "kind", "inputHash");

-- CreateIndex
CREATE INDEX "PssaWritingEvaluationAttempt_inputHash_idx" ON "PssaWritingEvaluationAttempt"("inputHash");

-- CreateIndex
CREATE INDEX "PssaWritingEvaluationAttempt_reviewedByUserId_idx" ON "PssaWritingEvaluationAttempt"("reviewedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PssaWritingGradingJob_jobKey_key" ON "PssaWritingGradingJob"("jobKey");

-- CreateIndex
CREATE INDEX "PssaWritingGradingJob_status_createdAt_idx" ON "PssaWritingGradingJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PssaWritingGradingJob_evaluationId_idx" ON "PssaWritingGradingJob"("evaluationId");

-- CreateIndex
CREATE INDEX "PssaWritingGradingJob_responseId_idx" ON "PssaWritingGradingJob"("responseId");

-- CreateIndex
CREATE INDEX "PssaWritingGradingJob_inputHash_idx" ON "PssaWritingGradingJob"("inputHash");

-- AddForeignKey
ALTER TABLE "PssaWritingEvaluation" ADD CONSTRAINT "PssaWritingEvaluation_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "PssaFormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaWritingEvaluation" ADD CONSTRAINT "PssaWritingEvaluation_currentDraftAttemptId_fkey" FOREIGN KEY ("currentDraftAttemptId") REFERENCES "PssaWritingEvaluationAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaWritingEvaluation" ADD CONSTRAINT "PssaWritingEvaluation_currentFinalAttemptId_fkey" FOREIGN KEY ("currentFinalAttemptId") REFERENCES "PssaWritingEvaluationAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaWritingEvaluationAttempt" ADD CONSTRAINT "PssaWritingEvaluationAttempt_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PssaWritingEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaWritingEvaluationAttempt" ADD CONSTRAINT "PssaWritingEvaluationAttempt_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PssaWritingGradingJob" ADD CONSTRAINT "PssaWritingGradingJob_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PssaWritingEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
