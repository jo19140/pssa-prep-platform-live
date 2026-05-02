-- CreateTable
CREATE TABLE "TutorAgentMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gradeLevel" INTEGER,
    "learnerSummary" TEXT NOT NULL,
    "weakStandards" JSONB NOT NULL,
    "masteredSkills" JSONB NOT NULL,
    "preferredSupports" JSONB NOT NULL,
    "lastInteractionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorAgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorAgentMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "artifacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorAgentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorAgentMemory_userId_key" ON "TutorAgentMemory"("userId");

-- CreateIndex
CREATE INDEX "TutorAgentMessage_userId_createdAt_idx" ON "TutorAgentMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TutorAgentMemory" ADD CONSTRAINT "TutorAgentMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorAgentMessage" ADD CONSTRAINT "TutorAgentMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
