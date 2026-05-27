import { check, type FirstLookChecklist } from "../index";

export const comprehensionDiagnosticChecklist: FirstLookChecklist = {
  key: "content-v3-diagnostic-item-comprehension-first-look",
  version: "2026-05-27",
  artifactType: "DIAGNOSTIC_ITEM",
  items: [
    check("COMP_STIMULUS_COMPLETE", "BLOCKER", "Listening or reading stimulus is complete enough to support the comprehension question."),
    check("COMP_QUESTION_MATCHES_STIMULUS", "BLOCKER", "Question can be answered from the stimulus and has one best answer."),
    check("COMP_DISTRACTORS_TEXT_BASED", "WARNING", "Distractors are text-based and plausible without being trick questions."),
    check("COMP_MEMORY_LOAD_REASONABLE", "WARNING", "Listening stimulus and answer choices keep memory load reasonable for a diagnostic item."),
    check("COMP_NO_KID_METADATA", "BLOCKER", "Kid-visible copy contains no phase codes, item counters, curriculum metadata, scoring jargon, or phoneme notation."),
    check("COMP_AUDIO_PROMPT_CLEAN", "BLOCKER", "Audio stimulus and kid-spoken prompt contain no IPA, slash notation, macrons, breves, or phoneme-code symbols."),
  ],
};
