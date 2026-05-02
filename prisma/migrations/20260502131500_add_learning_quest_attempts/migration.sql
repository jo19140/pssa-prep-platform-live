CREATE TABLE "LearningQuestAttempt" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "worldKey" TEXT NOT NULL,
    "questKey" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "standardCode" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "responses" JSONB NOT NULL,
    "feedback" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningQuestAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningQuestAttempt_userId_createdAt_idx" ON "LearningQuestAttempt"("userId", "createdAt");
CREATE INDEX "LearningQuestAttempt_lessonId_userId_idx" ON "LearningQuestAttempt"("lessonId", "userId");
CREATE INDEX "LearningQuestAttempt_standardCode_skill_idx" ON "LearningQuestAttempt"("standardCode", "skill");

ALTER TABLE "LearningQuestAttempt" ADD CONSTRAINT "LearningQuestAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningQuestAttempt" ADD CONSTRAINT "LearningQuestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
