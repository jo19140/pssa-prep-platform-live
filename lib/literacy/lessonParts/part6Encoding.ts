import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { wordMatchesPattern } from "../passageClassifier";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

export function generatePart6Encoding(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const content = phase3EntryLessonContentFor(ctx.dailyTarget.code, ctx.presentationProfile);
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
      dictatedWords: content.dictatedWords,
      dictatedSentences: content.dictatedSentences,
    },
    contentJson: {
      skillFocus: "encoding_spelling",
      dictatedWords: content.dictatedWords,
      dictatedSentences: content.dictatedSentences,
      expectedSpellings: [...content.dictatedWords, ...content.dictatedSentences],
      commonErrorPatterns: ["missing silent e", "short-vowel substitution"],
      studentDisplayMode: "DICTATION",
      responseMode: "text_response",
    },
    wordTagsJson: {
      words: content.dictatedWords.map((word) => ({
        word,
        tag: ctx.targetWords.includes(word) || ctx.targetPatterns.some((pattern) => wordMatchesPattern(word, pattern)) ? "target" : "prerequisite",
      })),
    },
    scoringRubricJson: { scoring: "spelling_match", evidence: "dictated word and sentence spelling" },
    studentDisplayMode: "DICTATION",
    responseMode: "text_response",
  });
}
