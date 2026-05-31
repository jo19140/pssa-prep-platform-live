import { check, type FirstLookChecklist } from "../index";

export const passageFirstLookChecklist: FirstLookChecklist = {
  key: "content-v3-passage-first-look",
  version: "2026-05-31",
  artifactType: "PASSAGE",
  items: [
    check("PASSAGE_AUDIT_GATE_PASSED", "BLOCKER", "Mechanical contentAuditJson.passesAuditGate is true before AI review."),
    check("PASSAGE_WORD_COUNT_WITHIN_PHASE_BAND", "BLOCKER", "Passage word count falls inside the phase-specific §6.10 word-count band."),
    check("PASSAGE_ZERO_UNCLASSIFIED_WORDS", "BLOCKER", "Mechanical word audit has zero unclassified words."),
    check("PASSAGE_NO_BLOCKED_PATTERN_VIOLATIONS", "BLOCKER", "No words match DailyTarget.blockedPatternCodes unless shielded as target, heart, or approved vocabulary."),
    check("PASSAGE_DECODABILITY_THRESHOLD", "BLOCKER", "Decodability score meets the phase threshold from §6.1."),
    check("PASSAGE_QUALITY_GATE", "BLOCKER", "Quality audit passes: coherent text, terminal punctuation, unique sentences, no repeated trigrams, and no near duplicate."),
    check("PASSAGE_NARROW_TARGET_DISCIPLINE", "BLOCKER", "Passage teaches exactly one specific DailyTarget pattern, not a broad category such as silent-e."),
    check("PASSAGE_KID_VIEW_NO_INTERNAL_METADATA", "BLOCKER", "Student-visible passage text contains no phoneme notation, phase labels, item counters, scoring jargon, or curriculum metadata."),
    check("PASSAGE_AGE_APPROPRIATE_COHERENT", "BLOCKER", "Passage is coherent and age-respectful for the target grade/phase."),
    check("PASSAGE_CULTURALLY_RESPECTFUL", "BLOCKER", "Passage avoids stereotypes, inadvertent othering, or unsafe framing."),
    check("PASSAGE_LICENSE_SAFE", "BLOCKER", "Passage source and attribution are license-safe; AI-generated passages use AI_GENERATED attribution."),
    check("PASSAGE_ENGAGING_FOR_CHILD", "INFO", "Passage is engaging enough for a child to want to read aloud."),
  ],
};
