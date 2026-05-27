-- Separate semantic answers from ASR transcript aliases for diagnostic items.
UPDATE "DiagnosticItem"
SET
  "expectedResponseJson" = jsonb_build_object(
    'canonical', COALESCE("expectedResponseJson"->>'canonical', "expectedResponseJson"->>'correctAnswer', ''),
    'acceptedSemanticResponses',
      CASE
        WHEN jsonb_typeof("expectedResponseJson"->'acceptedSemanticResponses') = 'array'
          THEN "expectedResponseJson"->'acceptedSemanticResponses'
        WHEN jsonb_typeof("expectedResponseJson"->'acceptedResponses') = 'array'
          THEN "expectedResponseJson"->'acceptedResponses'
        WHEN COALESCE("expectedResponseJson"->>'canonical', "expectedResponseJson"->>'correctAnswer') IS NOT NULL
          THEN jsonb_build_array(COALESCE("expectedResponseJson"->>'canonical', "expectedResponseJson"->>'correctAnswer'))
        ELSE '[]'::jsonb
      END,
    'speechTranscriptAliases',
      COALESCE("expectedResponseJson"->'speechTranscriptAliases', '[]'::jsonb),
    'rejectedResponses',
      CASE
        WHEN jsonb_typeof("expectedResponseJson"->'rejectedResponses') = 'array'
          THEN "expectedResponseJson"->'rejectedResponses'
        WHEN jsonb_typeof("expectedResponseJson"->'choices') = 'array'
          THEN (
            SELECT COALESCE(jsonb_agg(choice), '[]'::jsonb)
            FROM jsonb_array_elements_text("expectedResponseJson"->'choices') AS choice
            WHERE choice <> COALESCE("expectedResponseJson"->>'canonical', "expectedResponseJson"->>'correctAnswer', '')
          )
        ELSE '[]'::jsonb
      END
  ),
  "scoringRubricJson" = (
    CASE
      WHEN "strand" = 'PA'
        THEN jsonb_set(COALESCE("scoringRubricJson", '{}'::jsonb), '{scoring}', to_jsonb('speech_response'::text), true)
      ELSE COALESCE("scoringRubricJson", '{}'::jsonb)
    END
  ) - 'acceptedResponses';
