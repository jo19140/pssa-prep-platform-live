ALTER TABLE "EssayEvaluation"
ADD COLUMN "teacherScore" INTEGER,
ADD COLUMN "teacherFeedback" TEXT,
ADD COLUMN "teacherRubricBreakdown" JSONB,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT;
