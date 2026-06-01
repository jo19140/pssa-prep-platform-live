import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

const DICTATED_WORDS = ["cake", "made", "lake", "game", "ran", "hand"];
const DICTATED_SENTENCES = ["Dave made a cake.", "Jane came to the lake."];

export function generatePart6Encoding(ctx: LessonGeneratorContext): GeneratedLessonPart {
  return withCommonPartMetadata(ctx, {
    partNumber: 6,
    partLabel: "Encoding and spelling",
    partType: "ENCODING_SPELLING",
    kidVisibleCopy: {
      title: "Spell with Harper",
      directions: "Listen to each word or sentence, then spell it.",
    },
    tutorVisibleCopy: {
      purpose: "Dictation checks whether the student can spell today-pattern words and prerequisite review words.",
      dictatedWords: DICTATED_WORDS,
      dictatedSentences: DICTATED_SENTENCES,
    },
    contentJson: {
      skillFocus: "encoding_spelling",
      dictatedWords: DICTATED_WORDS,
      dictatedSentences: DICTATED_SENTENCES,
      expectedSpellings: [...DICTATED_WORDS, ...DICTATED_SENTENCES],
      commonErrorPatterns: ["missing silent e", "short-vowel substitution"],
      studentDisplayMode: "DICTATION",
      responseMode: "text_response",
    },
    wordTagsJson: {
      words: DICTATED_WORDS.map((word) => ({
        word,
        tag: ctx.targetWords.includes(word) || ["made", "lake", "game"].includes(word) ? "target" : "prerequisite",
      })),
    },
    scoringRubricJson: { scoring: "spelling_match", evidence: "dictated word and sentence spelling" },
    studentDisplayMode: "DICTATION",
    responseMode: "text_response",
  });
}
