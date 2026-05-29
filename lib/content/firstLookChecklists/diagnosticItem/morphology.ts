import { check, type FirstLookChecklist } from "../index";

export const morphologyDiagnosticChecklist: FirstLookChecklist = {
  key: "content-v3-diagnostic-item-morphology-first-look",
  version: "2026-05-27",
  artifactType: "DIAGNOSTIC_ITEM",
  items: [
    check("MORPH_UNAMBIGUOUS_BASE_AFFIX_ROOT", "BLOCKER", "PASS transparent single-base plus single-affix items such as play + -ful -> playful. FAIL only when the decomposition is theory-dependent or has multiple defensible parses, such as un+happiness vs unhappy+ness."),
    check("MORPH_TRANSPARENT_BAND_APPROPRIATE", "BLOCKER", "PASS basic derivational and inflectional morphology with transparent affixes. FAIL only when the item requires historical, etymological, Latin/Greek, or cross-linguistic knowledge to answer."),
    check("MORPH_DISTRACTORS_SAME_SKILL", "WARNING", "Distractors test the same morphology skill without depending on decoding difficulty."),
    check("MORPH_NO_KID_METADATA", "BLOCKER", "Kid-visible copy contains no phase codes, curriculum metadata, item counters, or scoring jargon."),
    check("MORPH_AGE_RESPECTFUL", "WARNING", "Words and examples respect grades 3-8 intervention students."),
  ],
};
