-- CreateTable
CREATE TABLE "LessonCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "standardCode" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "commonError" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "modelHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonCache_cacheKey_key" ON "LessonCache"("cacheKey");

-- CreateIndex
CREATE INDEX "LessonCache_gradeLevel_standardCode_skill_idx" ON "LessonCache"("gradeLevel", "standardCode", "skill");
