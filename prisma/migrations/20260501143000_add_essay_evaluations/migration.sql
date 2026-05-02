-- CreateTable
CREATE TABLE "EssayEvaluation" (
    "id" TEXT NOT NULL,
    "responseRecordId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 4,
    "performanceBand" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "areasForGrowth" JSONB NOT NULL,
    "feedback" TEXT NOT NULL,
    "nextSteps" JSONB NOT NULL,
    "rubricBreakdown" JSONB NOT NULL,
    "gradingProvider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EssayEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EssayEvaluation_responseRecordId_key" ON "EssayEvaluation"("responseRecordId");

-- AddForeignKey
ALTER TABLE "EssayEvaluation" ADD CONSTRAINT "EssayEvaluation_responseRecordId_fkey" FOREIGN KEY ("responseRecordId") REFERENCES "ResponseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
