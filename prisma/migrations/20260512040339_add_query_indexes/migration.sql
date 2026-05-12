-- CreateIndex
CREATE INDEX "Assignment_classRoomId_status_idx" ON "Assignment"("classRoomId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_studentProfileId_idx" ON "Enrollment"("studentProfileId");

-- CreateIndex
CREATE INDEX "ResponseRecord_sessionId_idx" ON "ResponseRecord"("sessionId");

-- CreateIndex
CREATE INDEX "StudentLessonProgress_userId_idx" ON "StudentLessonProgress"("userId");

-- CreateIndex
CREATE INDEX "TestSession_userId_assessmentId_submittedAt_idx" ON "TestSession"("userId", "assessmentId", "submittedAt");
