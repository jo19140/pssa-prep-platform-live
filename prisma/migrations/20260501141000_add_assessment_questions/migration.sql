-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionNo" INTEGER NOT NULL,
    "standardCode" TEXT NOT NULL,
    "standardLabel" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "questionPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_questionNo_key" ON "AssessmentQuestion"("assessmentId", "questionNo");

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
