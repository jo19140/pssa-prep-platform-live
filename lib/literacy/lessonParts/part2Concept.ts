import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

const DEMONSTRATION_PAIRS = [
  { closed: "cap", target: "cape" },
  { closed: "at", target: "ate" },
  { closed: "man", target: "mane" },
  { closed: "tap", target: "tape" },
  { closed: "hat", target: "hate" },
];

export function generatePart2Concept(ctx: LessonGeneratorContext): GeneratedLessonPart {
  return withCommonPartMetadata(ctx, {
    partNumber: 2,
    partLabel: "Explicit target concept",
    partType: "EXPLICIT_TARGET_INSTRUCTION",
    kidVisibleCopy: {
      title: "New thing to learn",
      teachingLanguage: "Today, a word can have a silent e at the end. The silent e helps the vowel say its name.",
      examples: ctx.targetWords,
    },
    tutorVisibleCopy: {
      purpose: "Introduce the specific daily target without using phoneme notation or broad category language.",
      demonstrationPairs: DEMONSTRATION_PAIRS,
    },
    contentJson: {
      skillFocus: "explicit_target_instruction",
      conceptExamples: ctx.targetWords,
      demonstrationPairs: DEMONSTRATION_PAIRS,
      teachingLanguage: "Silent e helps the vowel say its name in these words.",
      studentDisplayMode: "EXAMPLE_CARDS",
      responseMode: "listen_and_repeat",
    },
    wordTagsJson: { words: ctx.targetWords.map((word) => ({ word, tag: "target", pattern: ctx.targetPattern })) },
    studentDisplayMode: "EXAMPLE_CARDS",
    responseMode: "listen_and_repeat",
  });
}
