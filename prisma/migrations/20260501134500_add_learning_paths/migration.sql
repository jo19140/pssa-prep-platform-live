-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'DETERMINISTIC',
    "aiStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPathItem" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "standardCode" TEXT NOT NULL,
    "standardLabel" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "practicePrompt" TEXT NOT NULL,
    "aiExplanation" TEXT,
    "sourcePayload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPathItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_sessionId_key" ON "LearningPath"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPathItem_learningPathId_order_key" ON "LearningPathItem"("learningPathId", "order");

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathItem" ADD CONSTRAINT "LearningPathItem_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
