ALTER TABLE "ClassRoom" ADD COLUMN "joinCode" TEXT;
ALTER TABLE "ClassRoom" ADD COLUMN "joinEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "ClassRoom_joinCode_key" ON "ClassRoom"("joinCode");
