import { check, type FirstLookChecklist } from "../index";

export const paDiagnosticChecklist: FirstLookChecklist = {
  key: "content-v3-diagnostic-item-pa-first-look",
  version: "2026-05-27",
  artifactType: "DIAGNOSTIC_ITEM",
  items: [
    check("PA_REQUIRES_AUDIO_DELIVERY", "BLOCKER", "Prompt is delivered through audio/oral stimulus; audio-only design is required for PA items."),
    check("PA_NO_VISIBLE_PRINTED_CHOICES", "BLOCKER", "Student-visible prompt contains no printed answer choices for phonemic-awareness items unless the item type explicitly requires a visual response."),
    check("PA_SCORING_SPEECH_RESPONSE", "BLOCKER", "PA items use speech_response scoring, not selected_choice scoring."),
    check("PA_UNAMBIGUOUS_CORRECT_ANSWER", "BLOCKER", "Correct answer is unique, defensible, and matches the spoken stimulus."),
    check("PA_DISTRACTORS_SAME_SKILL", "WARNING", "Distractors test the same phonemic-awareness skill without adding decoding, vocabulary, or memory load."),
    check("PA_AGE_RESPECTFUL_WORD_CHOICE", "WARNING", "Words are age-respectful for grades 3-8 intervention students and not babyish."),
    check("PA_TTS_PRONUNCIATION_RELIABLE", "WARNING", "Audio stimulus uses words or segments that TTS can pronounce reliably without phoneme notation."),
    check("PA_SPEECH_SCORING_ALIASES", "WARNING", "Expected response includes speech-scoring aliases or accepted variants where dialect/accent may affect the transcript."),
    check("PA_DIALECT_ACCENT_SENSITIVE", "WARNING", "The item does not penalize dialect or accent patterns as wrong speech."),
    check("NO_KID_METADATA", "BLOCKER", "Kid-facing prompt contains no phoneme notation, phase code, item counter, timer, correctness feedback, or curriculum metadata."),
  ],
};
