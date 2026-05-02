-- Add a first-class school layer while preserving existing schoolName text fields.
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtName" TEXT,
    "city" TEXT,
    "state" TEXT NOT NULL DEFAULT 'PA',
    "gradeSpan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "School_name_districtName_key" ON "School"("name", "districtName");
CREATE INDEX "School_name_idx" ON "School"("name");

ALTER TABLE "TeacherProfile" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "ClassRoom" ADD COLUMN "schoolId" TEXT;

-- Backfill schools from the existing profile school names.
INSERT INTO "School" ("id", "name", "districtName", "state", "gradeSpan", "createdAt", "updatedAt")
SELECT
  'school_' || md5("schoolName"),
  "schoolName",
  NULL,
  'PA',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "schoolName" FROM "TeacherProfile" WHERE "schoolName" IS NOT NULL AND "schoolName" <> ''
  UNION
  SELECT DISTINCT "schoolName" FROM "StudentProfile" WHERE "schoolName" IS NOT NULL AND "schoolName" <> ''
) schools
ON CONFLICT ("name", "districtName") DO NOTHING;

UPDATE "TeacherProfile"
SET "schoolId" = "School"."id"
FROM "School"
WHERE "TeacherProfile"."schoolName" = "School"."name";

UPDATE "StudentProfile"
SET "schoolId" = "School"."id"
FROM "School"
WHERE "StudentProfile"."schoolName" = "School"."name";

UPDATE "ClassRoom"
SET "schoolId" = "TeacherProfile"."schoolId"
FROM "TeacherProfile"
WHERE "ClassRoom"."teacherId" = "TeacherProfile"."id";

CREATE INDEX "StudentProfile_schoolId_grade_idx" ON "StudentProfile"("schoolId", "grade");
CREATE INDEX "ClassRoom_schoolId_grade_idx" ON "ClassRoom"("schoolId", "grade");

ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
