import { check, type FirstLookChecklist } from "../index";

export const decodingDiagnosticChecklist: FirstLookChecklist = {
  key: "content-v3-diagnostic-item-decoding-first-look",
  version: "2026-05-27",
  artifactType: "DIAGNOSTIC_ITEM",
  items: [
    check("DECODING_ONE_CARD_NO_CONTEXT", "BLOCKER", "Kid view presents one word or pseudoword card with no sentence context or clueing."),
    check("DECODING_VARIANT_MATCHES_BAND", "WARNING", "Real-word and pseudoword variants match the target phase/difficulty band."),
    check("DECODING_PSEUDOWORD_NOT_MISSPELLING", "BLOCKER", "Pseudowords do not resemble common real-word misspellings or offensive/loaded words."),
    check("PSEUDOWORD_NO_REALWORD_HOMOPHONE", "BLOCKER", "Pseudoword candidates are not real-word homophones or near-homophones of common words."),
    check("PSEUDOWORD_NO_NEAR_MISSPELLING", "BLOCKER", "Pseudoword candidates are not near-misspellings or near-neighbors of common target-pattern words."),
    check("DECODING_NO_PHONEME_NOTATION", "BLOCKER", "Kid view contains no IPA, slash notation, macrons, breves, sound boxes, or phoneme-code symbols."),
    check("DECODING_AUDIO_PROMPT_CLEAN", "BLOCKER", "Audio prompt is phoneme-notation-free and says only what the student should do."),
    check("DECODING_TARGET_PATTERN_ONLY", "BLOCKER", "Displayed word uses the intended daily target or prerequisite pattern and does not introduce blocked neighboring patterns."),
    check("DECODING_NO_VISIBLE_TIMER", "BLOCKER", "No timer, item counter, phase label, or placement metadata is visible to the student."),
    check("DECODE_LATENCY_NOT_PLACEMENT", "BLOCKER", "Decoding placement evidence uses accuracy only; latency is stored separately for fluency/automaticity evidence."),
    check("ITEM_POOL_STATUS_NOT_CALIBRATED_BY_DEFAULT", "BLOCKER", "Generated items enter as candidate content and are not labeled calibrated until response data supports calibration."),
  ],
};
