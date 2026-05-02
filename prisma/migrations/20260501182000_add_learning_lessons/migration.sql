-- CreateTable
CREATE TABLE "LearningLesson" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "learningPathItemId" TEXT,
    "gradeLevel" INTEGER NOT NULL,
    "standardCode" TEXT NOT NULL,
    "standardLabel" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "whyAssigned" TEXT NOT NULL,
    "lessonExplanation" TEXT NOT NULL,
    "workedExample" TEXT NOT NULL,
    "resourceTitle" TEXT,
    "resourceUrl" TEXT,
    "resourceProvider" TEXT,
    "resourceDescription" TEXT,
    "guidedPractice" JSONB NOT NULL,
    "independentPractice" JSONB NOT NULL,
    "exitTicket" JSONB NOT NULL,
    "masteryCheck" JSONB NOT NULL,
    "retestRecommendation" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'DETERMINISTIC',
    "aiStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "sourcePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningLessonItem" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningLessonItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLessonProgress" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "guidedResponses" JSONB,
    "independentResponses" JSONB,
    "exitTicketResponses" JSONB,
    "masteryScore" INTEGER,
    "masteryStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceLink" (
    "id" TEXT NOT NULL,
    "gradeLevel" INTEGER,
    "standardCode" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningLesson_learningPathItemId_key" ON "LearningLesson"("learningPathItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningLessonItem_lessonId_order_key" ON "LearningLessonItem"("lessonId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLessonProgress_lessonId_userId_key" ON "StudentLessonProgress"("lessonId", "userId");

-- CreateIndex
CREATE INDEX "ResourceLink_gradeLevel_standardCode_idx" ON "ResourceLink"("gradeLevel", "standardCode");

-- CreateIndex
CREATE INDEX "ResourceLink_skill_idx" ON "ResourceLink"("skill");

-- AddForeignKey
ALTER TABLE "LearningLesson" ADD CONSTRAINT "LearningLesson_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningLesson" ADD CONSTRAINT "LearningLesson_learningPathItemId_fkey" FOREIGN KEY ("learningPathItemId") REFERENCES "LearningPathItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningLessonItem" ADD CONSTRAINT "LearningLessonItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLessonProgress" ADD CONSTRAINT "StudentLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLessonProgress" ADD CONSTRAINT "StudentLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
