-- CreateTable
CREATE TABLE "ResourceSuggestion" (
    "id" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "gradeLevel" INTEGER,
    "standardCode" TEXT,
    "skill" TEXT,
    "description" TEXT,
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "resourceLinkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceSuggestion_status_createdAt_idx" ON "ResourceSuggestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceSuggestion_teacherUserId_idx" ON "ResourceSuggestion"("teacherUserId");

-- AddForeignKey
ALTER TABLE "ResourceSuggestion" ADD CONSTRAINT "ResourceSuggestion_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSuggestion" ADD CONSTRAINT "ResourceSuggestion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSuggestion" ADD CONSTRAINT "ResourceSuggestion_resourceLinkId_fkey" FOREIGN KEY ("resourceLinkId") REFERENCES "ResourceLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
