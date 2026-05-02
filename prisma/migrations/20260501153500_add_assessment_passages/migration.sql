CREATE TABLE "AssessmentPassage" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "passageKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passageType" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wordCountTarget" INTEGER NOT NULL,
    "actualWordCount" INTEGER NOT NULL,
    "hasTable" BOOLEAN NOT NULL DEFAULT false,
    "hasSections" BOOLEAN NOT NULL DEFAULT false,
    "gradeLevel" INTEGER NOT NULL,
    "tableData" JSONB,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentPassage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentPassage_assessmentId_passageKey_key" ON "AssessmentPassage"("assessmentId", "passageKey");

ALTER TABLE "AssessmentPassage" ADD CONSTRAINT "AssessmentPassage_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
