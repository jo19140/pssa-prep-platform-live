import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

const WARMUP_WORDS = ["cat", "ran", "hand", "pin", "did", "fish", "top", "hot", "dog", "bug", "run", "cup", "pet", "red", "ten"];

export function generatePart1Warmup(ctx: LessonGeneratorContext): GeneratedLessonPart {
  // Targets whose stem patterns overlap the default closed-word warmup (e.g. morphology
  // doubling) provide their own review words; everything else keeps the standard list.
  const warmupWords = ctx.reviewWords?.length ? ctx.reviewWords : WARMUP_WORDS;
  return withCommonPartMetadata(ctx, {
    partNumber: 1,
    partLabel: "Cumulative code review",
    partType: "CUMULATIVE_CODE_REVIEW",
    kidVisibleCopy: {
      title: "Warm-up words",
      directions: "Read each word with Harper.",
      words: warmupWords,
    },
    tutorVisibleCopy: {
      purpose: "Review prerequisite words before introducing today's new pattern.",
    },
    contentJson: {
      skillFocus: "prerequisite_review",
      warmupWords,
      mayIncludeTodayPattern: false,
      studentDisplayMode: "WORD_LIST",
      responseMode: "speech_response",
    },
    wordTagsJson: { words: warmupWords.map((word) => ({ word, tag: "prerequisite" })) },
    studentDisplayMode: "WORD_LIST",
    responseMode: "speech_response",
  });
}
