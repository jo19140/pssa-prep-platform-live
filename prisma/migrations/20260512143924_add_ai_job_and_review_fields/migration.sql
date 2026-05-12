-- AlterTable
ALTER TABLE "LearningLesson" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "LessonCache" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiJob_status_createdAt_idx" ON "AiJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiJob_sessionId_idx" ON "AiJob"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiJob_sessionId_jobType_targetId_key" ON "AiJob"("sessionId", "jobType", "targetId");

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
