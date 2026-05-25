-- CreateTable
CREATE TABLE "HeroMatchCache" (
    "id" TEXT NOT NULL,
    "lessonSkill" TEXT NOT NULL,
    "lessonStandardCode" TEXT,
    "candidateUrl" TEXT NOT NULL,
    "matches" BOOLEAN NOT NULL,
    "confidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroMatchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeroMatchCache_lessonSkill_candidateUrl_key" ON "HeroMatchCache"("lessonSkill", "candidateUrl");

-- CreateIndex
CREATE INDEX "HeroMatchCache_expiresAt_idx" ON "HeroMatchCache"("expiresAt");
