ALTER TABLE "PssaPassage"
  ADD COLUMN "staminaBand" TEXT,
  ADD COLUMN "genre" TEXT,
  ADD COLUMN "textFeaturesJson" JSONB,
  ADD COLUMN "domainVocabularyLoad" TEXT,
  ADD COLUMN "factCheckNotesJson" JSONB;

ALTER TABLE "PssaItem"
  ADD COLUMN "targetWordOrPhrase" TEXT,
  ADD COLUMN "testsApplicationNotDefinition" BOOLEAN;
