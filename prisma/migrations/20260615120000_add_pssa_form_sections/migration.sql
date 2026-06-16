ALTER TABLE "PssaForm"
  ADD COLUMN "hasSections" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PssaFormPassage"
  ADD COLUMN "sectionIndex" INTEGER;

ALTER TABLE "PssaFormItem"
  ADD COLUMN "sectionIndex" INTEGER;

CREATE TABLE "PssaFormSection" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "sectionIndex" INTEGER NOT NULL,
  "sectionType" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "estimatedMinutes" INTEGER NOT NULL,

  CONSTRAINT "PssaFormSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PssaFormSection_formId_sectionIndex_key" ON "PssaFormSection"("formId", "sectionIndex");
CREATE INDEX "PssaFormSection_formId_idx" ON "PssaFormSection"("formId");

ALTER TABLE "PssaFormSection"
  ADD CONSTRAINT "PssaFormSection_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "PssaForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
