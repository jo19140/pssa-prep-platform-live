-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('UNGRADED', 'PROVISIONAL', 'FINALIZED', 'NON_SCORABLE');

-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('AUTO', 'RUBRIC_AI_DRAFT', 'TEACHER_FINAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('LESSON', 'DIAGNOSTIC_WRITING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentOrigin" AS ENUM ('MANUAL', 'REPORT_RECOMMENDATION');

-- CreateTable
CREATE TABLE "LearningAssignment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL DEFAULT 'LESSON',
    "origin" "AssignmentOrigin" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "classRoomId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "standards" TEXT[],
    "rubricId" TEXT,
    "lessonId" TEXT,
    "pssaFormId" TEXT,
    "dueDate" TIMESTAMP(3),
    "audienceLabel" TEXT,
    "originContextJson" JSONB,
    "reportFormId" TEXT,
    "reportGroupId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "originKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRecipient" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "openLessonStudentKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeRecord" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "GradeStatus" NOT NULL DEFAULT 'UNGRADED',
    "pointsEarned" DECIMAL(10,2),
    "pointsPossible" DECIMAL(10,2),
    "rubricId" TEXT,
    "scoreSource" "ScoreSource",
    "gradeLevelAtAssignment" INTEGER NOT NULL,
    "selectedAttemptId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeAttempt" (
    "id" TEXT NOT NULL,
    "gradeRecordId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "completionKey" TEXT NOT NULL,
    "snapshotVersion" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "completionState" "RecipientStatus" NOT NULL,
    "pointsEarned" DECIMAL(10,2),
    "pointsPossible" DECIMAL(10,2),
    "rubricId" TEXT,
    "rubricVersion" TEXT,
    "scoringStatus" "GradeStatus" NOT NULL,
    "responseSnapshotJson" JSONB,
    "scoringSnapshotJson" JSONB,
    "sourceProgressId" TEXT,
    "pssaFormResponseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningAssignment_origin_originKey_idx" ON "LearningAssignment"("origin", "originKey");

-- CreateIndex
CREATE INDEX "LearningAssignment_classRoomId_status_idx" ON "LearningAssignment"("classRoomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAssignment_assignedByUserId_idempotencyKey_key" ON "LearningAssignment"("assignedByUserId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRecipient_openLessonStudentKey_key" ON "AssignmentRecipient"("openLessonStudentKey");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRecipient_assignmentId_studentProfileId_key" ON "AssignmentRecipient"("assignmentId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeRecord_recipientId_key" ON "GradeRecord"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeRecord_selectedAttemptId_key" ON "GradeRecord"("selectedAttemptId");

-- CreateIndex
CREATE INDEX "GradeRecord_status_idx" ON "GradeRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GradeAttempt_completionKey_key" ON "GradeAttempt"("completionKey");

-- CreateIndex
CREATE INDEX "GradeAttempt_gradeRecordId_idx" ON "GradeAttempt"("gradeRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeAttempt_gradeRecordId_attemptNumber_key" ON "GradeAttempt"("gradeRecordId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRecipient" ADD CONSTRAINT "AssignmentRecipient_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LearningAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRecipient" ADD CONSTRAINT "AssignmentRecipient_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "AssignmentRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_selectedAttemptId_fkey" FOREIGN KEY ("selectedAttemptId") REFERENCES "GradeAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeAttempt" ADD CONSTRAINT "GradeAttempt_gradeRecordId_fkey" FOREIGN KEY ("gradeRecordId") REFERENCES "GradeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

