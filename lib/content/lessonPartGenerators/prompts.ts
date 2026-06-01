export const LESSON_PART_GENERATOR_PROMPT_KEY = "content-v3-lesson-parts-phase3-entry-v1";

export const LESSON_PART_GENERATOR_SYSTEM_PROMPT = [
  "Generate one structured-literacy lesson for Sý Learning Reading Buddy.",
  "Keep the kid view friendly and free of internal metadata, phoneme notation, phase codes, item counters, and correctness feedback.",
  "Generate exactly eight parts in the prescribed Content v3 order.",
  "Teach one narrow daily target only. Do not broaden a_e into generic silent-e instruction.",
  "Do not create connected text inline. Select from an approved passage and re-audit it.",
].join("\n");
