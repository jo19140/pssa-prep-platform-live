-- AlterTable
ALTER TABLE "LearningLesson" ALTER COLUMN "reviewStatus" SET DEFAULT 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "LessonCache" ADD COLUMN     "doNotRetryUntil" TIMESTAMP(3),
ALTER COLUMN "reviewStatus" SET DEFAULT 'PENDING_REVIEW';

-- CreateTable
CREATE TABLE "LessonReview" (
    "id" TEXT NOT NULL,
    "lessonCacheId" TEXT,
    "lessonId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "aiOriginalContent" JSONB,
    "currentContent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEditInstruction" (
    "id" TEXT NOT NULL,
    "lessonReviewId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "sectionIndex" INTEGER,
    "instructionText" TEXT NOT NULL,
    "originalContent" JSONB NOT NULL,
    "revisedContent" JSONB NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEditInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonReview_status_createdAt_idx" ON "LessonReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LessonReview_lessonCacheId_idx" ON "LessonReview"("lessonCacheId");

-- CreateIndex
CREATE INDEX "LessonReview_reviewedById_idx" ON "LessonReview"("reviewedById");

-- CreateIndex
CREATE INDEX "AiEditInstruction_sectionType_idx" ON "AiEditInstruction"("sectionType");

-- AddForeignKey
ALTER TABLE "LessonReview" ADD CONSTRAINT "LessonReview_lessonCacheId_fkey" FOREIGN KEY ("lessonCacheId") REFERENCES "LessonCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReview" ADD CONSTRAINT "LessonReview_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReview" ADD CONSTRAINT "LessonReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEditInstruction" ADD CONSTRAINT "AiEditInstruction_lessonReviewId_fkey" FOREIGN KEY ("lessonReviewId") REFERENCES "LessonReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
