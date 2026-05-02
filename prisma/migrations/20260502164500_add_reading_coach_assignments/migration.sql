-- CreateTable
CREATE TABLE "ReadingCoachAssignment" (
    "id" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL DEFAULT 'READ_ALOUD',
    "expectedText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingCoachAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ReadingCoachAttempt" ADD COLUMN "assignmentId" TEXT;

-- CreateIndex
CREATE INDEX "ReadingCoachAssignment_classRoomId_status_idx" ON "ReadingCoachAssignment"("classRoomId", "status");

-- CreateIndex
CREATE INDEX "ReadingCoachAssignment_assignedById_createdAt_idx" ON "ReadingCoachAssignment"("assignedById", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingCoachAttempt_assignmentId_idx" ON "ReadingCoachAttempt"("assignmentId");

-- AddForeignKey
ALTER TABLE "ReadingCoachAssignment" ADD CONSTRAINT "ReadingCoachAssignment_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingCoachAssignment" ADD CONSTRAINT "ReadingCoachAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingCoachAttempt" ADD CONSTRAINT "ReadingCoachAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReadingCoachAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
