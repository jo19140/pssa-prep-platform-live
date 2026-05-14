-- AlterTable
ALTER TABLE "LearningLesson" ADD COLUMN     "heroResourceLinkId" TEXT;

-- CreateTable
CREATE TABLE "LessonStep" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stepType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "narrationScript" TEXT NOT NULL,
    "audioUrl" TEXT,
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "checkQuestion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonStep_lessonId_idx" ON "LessonStep"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonStep_lessonId_order_key" ON "LessonStep"("lessonId", "order");

-- AddForeignKey
ALTER TABLE "LearningLesson" ADD CONSTRAINT "LearningLesson_heroResourceLinkId_fkey" FOREIGN KEY ("heroResourceLinkId") REFERENCES "ResourceLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
