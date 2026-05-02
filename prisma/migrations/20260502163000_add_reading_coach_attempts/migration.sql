CREATE TABLE "ReadingCoachAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "expectedText" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "correctWords" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "wordsPerMinute" INTEGER,
    "focusAreas" JSONB NOT NULL,
    "miscues" JSONB NOT NULL,
    "feedback" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "audioSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingCoachAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadingCoachAttempt_userId_createdAt_idx" ON "ReadingCoachAttempt"("userId", "createdAt");
CREATE INDEX "ReadingCoachAttempt_gradeLevel_activityType_idx" ON "ReadingCoachAttempt"("gradeLevel", "activityType");

ALTER TABLE "ReadingCoachAttempt" ADD CONSTRAINT "ReadingCoachAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
