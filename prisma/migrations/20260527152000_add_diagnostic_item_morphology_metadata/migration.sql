ALTER TABLE "DiagnosticItem"
  ADD COLUMN "phaseBand" INTEGER,
  ADD COLUMN "morphologyWave" TEXT,
  ADD COLUMN "targetMorpheme" TEXT,
  ADD COLUMN "skill" TEXT;

CREATE INDEX "DiagnosticItem_strand_phaseBand_morphologyWave_skill_idx"
  ON "DiagnosticItem"("strand", "phaseBand", "morphologyWave", "skill");

UPDATE "DiagnosticItem"
SET
  "phasePositionId" = COALESCE(
    "phasePositionId",
    (SELECT "id" FROM "PhasePosition" WHERE "phaseNumber" = 3 AND "subPosition" = 'ENTRY' LIMIT 1)
  ),
  "phaseBand" = 3,
  "morphologyWave" = 'transparent_suffixes',
  "targetMorpheme" = '-ful',
  "skill" = 'base_word_identification',
  "studentPromptJson" = jsonb_set(
    jsonb_set(
      COALESCE("studentPromptJson", '{}'::jsonb),
      '{kidPrompt}',
      to_jsonb('Which part is the base word in playful?'::text),
      true
    ),
    '{choices}',
    '["play", "-ful", "playful"]'::jsonb,
    true
  ),
  "expectedResponseJson" = jsonb_build_object(
    'canonical', 'play',
    'acceptedSemanticResponses', '["play"]'::jsonb,
    'speechTranscriptAliases', '[]'::jsonb,
    'rejectedResponses', '["-ful", "playful"]'::jsonb
  ),
  "adminReviewJson" = COALESCE("adminReviewJson", '{}'::jsonb) || jsonb_build_object(
    'phaseBand', 3,
    'morphologyWave', 'transparent_suffixes',
    'targetMorpheme', '-ful',
    'skill', 'base_word_identification'
  )
WHERE "strand" = 'MORPHOLOGY'
  AND "itemType" = 'BASE_WORD_ID'
  AND "retiredAt" IS NULL;
