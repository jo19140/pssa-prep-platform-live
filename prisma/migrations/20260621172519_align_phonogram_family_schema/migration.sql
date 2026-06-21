-- DropIndex
DROP INDEX "PhonogramFamily_syllableType_introductionOrder_idx";

-- AlterTable
ALTER TABLE "PhonogramFamily" ALTER COLUMN "exampleWords" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
