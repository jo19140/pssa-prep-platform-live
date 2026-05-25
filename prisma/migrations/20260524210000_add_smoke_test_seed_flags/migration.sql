-- AlterTable
ALTER TABLE "User" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ParentProfile" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ParentStudentLink" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AssessmentPassage" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AssessmentQuestion" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PhonogramFamily" ADD COLUMN "isPlaceholderSmokeTest" BOOLEAN NOT NULL DEFAULT false;
