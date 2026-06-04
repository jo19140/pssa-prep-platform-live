-- DB-6: governed PSSA form assembly tables.
-- Additive only: no ALTER/DROP on existing tables, and no Assessment/TestSession linkage.

CREATE TYPE "PssaFormStatus" AS ENUM ('draft', 'assembled', 'invalidated');
CREATE TYPE "PssaFormSlotType" AS ENUM ('reading_1pt', 'conventions_1pt', 'multipoint', 'short_answer');

CREATE TABLE "PssaForm" (
    "id" TEXT NOT NULL,
    "module" "TestPrepModule" NOT NULL DEFAULT 'PSSA',
    "subject" TEXT NOT NULL DEFAULT 'ELA',
    "gradeLevel" INTEGER NOT NULL,
    "blueprintVersion" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "formStatus" "PssaFormStatus" NOT NULL DEFAULT 'draft',
    "totalPoints" INTEGER NOT NULL,
    "categoryPointsJson" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "auditContractVersion" TEXT NOT NULL,
    "sourceScanVersion" TEXT NOT NULL,
    "assembledAt" TIMESTAMP(3),
    "assembledBy" TEXT NOT NULL,
    "assemblyRunId" TEXT NOT NULL,
    "invalidatedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PssaFormPassage" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "approvedPassageContentHashSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaFormPassage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PssaFormItem" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "slotType" "PssaFormSlotType" NOT NULL,
    "approvedContentHashSnapshot" TEXT NOT NULL,
    "passageIdSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PssaFormItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PssaForm_contentHash_key" ON "PssaForm"("contentHash");
CREATE INDEX "PssaForm_gradeLevel_formStatus_idx" ON "PssaForm"("gradeLevel", "formStatus");
CREATE INDEX "PssaForm_blueprintVersion_idx" ON "PssaForm"("blueprintVersion");
CREATE INDEX "PssaForm_assemblyRunId_idx" ON "PssaForm"("assemblyRunId");

CREATE UNIQUE INDEX "PssaFormPassage_formId_position_key" ON "PssaFormPassage"("formId", "position");
CREATE UNIQUE INDEX "PssaFormPassage_formId_passageId_key" ON "PssaFormPassage"("formId", "passageId");
CREATE INDEX "PssaFormPassage_formId_idx" ON "PssaFormPassage"("formId");
CREATE INDEX "PssaFormPassage_passageId_idx" ON "PssaFormPassage"("passageId");

CREATE UNIQUE INDEX "PssaFormItem_formId_position_key" ON "PssaFormItem"("formId", "position");
CREATE UNIQUE INDEX "PssaFormItem_formId_itemId_key" ON "PssaFormItem"("formId", "itemId");
CREATE INDEX "PssaFormItem_formId_idx" ON "PssaFormItem"("formId");
CREATE INDEX "PssaFormItem_itemId_idx" ON "PssaFormItem"("itemId");
CREATE INDEX "PssaFormItem_passageIdSnapshot_idx" ON "PssaFormItem"("passageIdSnapshot");

ALTER TABLE "PssaFormPassage" ADD CONSTRAINT "PssaFormPassage_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PssaForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PssaFormPassage" ADD CONSTRAINT "PssaFormPassage_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "PssaPassage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PssaFormItem" ADD CONSTRAINT "PssaFormItem_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PssaForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PssaFormItem" ADD CONSTRAINT "PssaFormItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PssaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
