-- Split diagnostic item content by audience so student renderers cannot
-- accidentally receive backend scoring or reviewer-only context.
ALTER TABLE "DiagnosticItem"
  ADD COLUMN "studentPromptJson" JSONB,
  ADD COLUMN "stimulusJson" JSONB,
  ADD COLUMN "expectedResponseJson" JSONB,
  ADD COLUMN "adminReviewJson" JSONB;

UPDATE "DiagnosticItem"
SET
  "studentPromptJson" = jsonb_strip_nulls(
    jsonb_build_object(
      'kidPrompt', "promptJson"->'kidPrompt',
      'displayText', "promptJson"->'displayText',
      'choices', CASE WHEN "strand" = 'PA' THEN NULL ELSE "promptJson"->'choices' END,
      'noVisibleTimer', "promptJson"->'noVisibleTimer'
    )
  ),
  "stimulusJson" = NULLIF(
    jsonb_strip_nulls(
      jsonb_build_object(
        'audioScript', "promptJson"->'audioScript',
        'image', "promptJson"->'image',
        'passage', "promptJson"->'passage'
      )
    ),
    '{}'::jsonb
  ),
  "expectedResponseJson" = jsonb_strip_nulls(
    jsonb_build_object(
      'correctAnswer', to_jsonb("correctAnswer"),
      'acceptedResponses', COALESCE("scoringRubricJson"->'acceptedResponses', CASE WHEN "correctAnswer" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array("correctAnswer") END),
      'choices', "promptJson"->'choices'
    )
  ),
  "scoringRubricJson" = COALESCE("scoringRubricJson", '{}'::jsonb),
  "adminReviewJson" = jsonb_strip_nulls(
    jsonb_build_object(
      'legacyPromptJson', "promptJson",
      'legacyCorrectAnswer', to_jsonb("correctAnswer"),
      'reviewerNotes', 'Migrated from promptJson/correctAnswer during content v3 review-pipeline hardening.'
    )
  );

ALTER TABLE "DiagnosticItem"
  ALTER COLUMN "studentPromptJson" SET NOT NULL,
  ALTER COLUMN "expectedResponseJson" SET NOT NULL,
  ALTER COLUMN "scoringRubricJson" SET NOT NULL;

ALTER TABLE "DiagnosticItem"
  DROP COLUMN "promptJson",
  DROP COLUMN "correctAnswer";
