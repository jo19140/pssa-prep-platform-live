import { check, type FirstLookChecklist } from "../index";

export const vocabularyDiagnosticChecklist: FirstLookChecklist = {
  key: "content-v3-diagnostic-item-vocabulary-first-look",
  version: "2026-05-27",
  artifactType: "DIAGNOSTIC_ITEM",
  items: [
    check("VOCAB_CONTEXT_SUFFICIENT", "BLOCKER", "Context gives enough information to infer the target meaning without teaching the answer."),
    check("VOCAB_SINGLE_DEFENSIBLE_ANSWER", "BLOCKER", "Correct answer is unique and defensible from the sentence or short context."),
    check("VOCAB_DISTRACTORS_PLAUSIBLE", "WARNING", "Distractors are plausible but clearly wrong for the context."),
    check("VOCAB_GRADE_APPROPRIATE", "WARNING", "Target word and choices are age-respectful and suitable for grades 3-8 intervention."),
    check("VOCAB_NO_KID_METADATA", "BLOCKER", "Kid-visible copy contains no phase codes, item counters, curriculum metadata, scoring jargon, or correctness feedback."),
  ],
};
