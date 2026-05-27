export type FirstLookArtifactType = "DIAGNOSTIC_ITEM" | "LESSON_PART" | "PASSAGE";

export type FirstLookChecklist = {
  key: string;
  version: string;
  artifactType: FirstLookArtifactType;
  items: string[];
};

export const FIRST_LOOK_CHECKLISTS: Record<FirstLookArtifactType, FirstLookChecklist> = {
  DIAGNOSTIC_ITEM: {
    key: "content-v3-diagnostic-item-first-look",
    version: "2026-05-27",
    artifactType: "DIAGNOSTIC_ITEM",
    items: [
      "Item type matches the strand's expected diagnostic evidence.",
      "Difficulty band aligns with the target phase position.",
      "Prompt is unambiguous and age-appropriate for grades 3-8.",
      "Correct answer is unique and defensible.",
      "Distractors, when present, are plausible and reflect the same error family.",
      "Kid-facing prompt contains no phoneme notation, phase code, item counter, or curriculum metadata.",
      "Prompt gives no correctness feedback or hint that would teach during a scored diagnostic item.",
      "Prompt shows no visible timer, countdown, item number, phase label, or placement metadata to the student.",
      "Phonemic-awareness audio scripts use plain kid-spoken words and contain no IPA, slash notation, macrons, breves, or phoneme-code symbols.",
      "Pseudowords do not resemble common misspellings of real words.",
      "Pseudoword pronunciation target is unambiguous and uses only patterns already allowed for this item.",
    ],
  },
  LESSON_PART: {
    key: "content-v3-lesson-part-first-look",
    version: "2026-05-27",
    artifactType: "LESSON_PART",
    items: [
      "Kid-visible copy passes the content-v3 kid-view linter: no phoneme notation, no internal codes, no curriculum metadata.",
      "Kid-visible copy contains no phase/position codes, framework codes, review-status labels, item counters, scoring labels, or design notes.",
      "Part 1 contains zero instances of today's daily target pattern.",
      "Part 3 word lines follow contrastive structure: closed review, contrast, target, pseudoword.",
      "Part 3 pseudowords use today's one specific target pattern and do not resemble real-word misspellings.",
      "Part 4 heart-word previews match the heart words used in the connected text.",
      "Part 6 dictation includes target words and prerequisite review.",
      "Part 8 questions are open-ended and discussion-oriented, not yes/no.",
      "Tutor-visible notes are separated from kid-visible copy.",
    ],
  },
  PASSAGE: {
    key: "content-v3-passage-first-look",
    version: "2026-05-27",
    artifactType: "PASSAGE",
    items: [
      "Passage is coherent and age-appropriate.",
      "Passage is culturally respectful and avoids stereotypes or inadvertent othering.",
      "Nonfiction claims are factually safe and not over-specific without sourcing.",
      "Tone matches the target grade range and intervention context.",
      "Mechanical word audit categories look plausible.",
      "Narrow-target sanity: target words match exactly one DailyTarget pattern, allowedPatternCodes are prerequisite/review only, and blockedPatternCodes are absent from the passage.",
      "Decodability red flags are checked: no unclassified words, no unpreviewed heart words, no broad silent-e category leakage, and decodability meets the phase threshold.",
      "Student-visible passage text and any preview copy contain no phoneme notation, phase labels, curriculum metadata, item counters, or scoring jargon.",
      "The passage does not include words that dilute the daily target by overusing neighboring patterns such as i_e, o_e, u_e, e_e, ai, or ay during an a_e lesson.",
      "Engagement potential is strong enough for a real child to want to read it.",
      "No unreviewed source attribution or licensing issue is apparent.",
    ],
  },
};

export function checklistForArtifact(artifactType: FirstLookArtifactType) {
  return FIRST_LOOK_CHECKLISTS[artifactType];
}
