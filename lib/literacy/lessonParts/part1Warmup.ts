import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

const WARMUP_WORDS = ["cat", "ran", "hand", "pin", "did", "fish", "top", "hot", "dog", "bug", "run", "cup", "pet", "red", "ten"];

export function generatePart1Warmup(ctx: LessonGeneratorContext): GeneratedLessonPart {
  return withCommonPartMetadata(ctx, {
    partNumber: 1,
    partLabel: "Cumulative code review",
    partType: "CUMULATIVE_CODE_REVIEW",
    kidVisibleCopy: {
      title: "Warm-up words",
      directions: "Read each word with Harper.",
      words: WARMUP_WORDS,
    },
    tutorVisibleCopy: {
      purpose: "Review closed-syllable prerequisite words before introducing today's new pattern.",
    },
    contentJson: {
      skillFocus: "prerequisite_review",
      warmupWords: WARMUP_WORDS,
      mayIncludeTodayPattern: false,
      studentDisplayMode: "WORD_LIST",
      responseMode: "speech_response",
    },
    wordTagsJson: { words: WARMUP_WORDS.map((word) => ({ word, tag: "prerequisite" })) },
    studentDisplayMode: "WORD_LIST",
    responseMode: "speech_response",
  });
}
