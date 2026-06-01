import { classifyPassageWords } from "../passageClassifier";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

const SENTENCES = [
  "Dave made a cake.",
  "The cake is a gift.",
  "Jane came to the lake.",
  "They gave Jane a wave.",
  "\"I made this cake,\" said Dave.",
  "Jane is a pal to Dave.",
];

export function generatePart5Sentences(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const classification = classifyPassageWords(SENTENCES.join(" "), {
    targetPatternCodes: [ctx.targetPattern],
    allowedPatternCodes: ctx.dailyTarget.allowedPatternCodes,
    blockedPatternCodes: ctx.dailyTarget.blockedPatternCodes,
    heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown, "is"],
    vocabularyAllowlist: [...ctx.vocabularyWords, "dave", "jane"],
  });
  return withCommonPartMetadata(ctx, {
    partNumber: 5,
    partLabel: "Sentence-level reading",
    partType: "SENTENCE_READING",
    kidVisibleCopy: {
      title: "Read the sentences",
      directions: "Read each sentence out loud.",
      sentences: SENTENCES,
    },
    tutorVisibleCopy: {
      purpose: "Move from word-level target practice into short sentence reading.",
    },
    contentJson: {
      skillFocus: "sentence_reading",
      sentences: SENTENCES,
      targetPatternCoverage: classification.targetWords.length,
      unclassifiedWords: classification.unclassifiedWords,
      studentDisplayMode: "SENTENCE_LIST",
      responseMode: "speech_response",
    },
    contentAuditJson: classification as unknown as Record<string, unknown>,
    wordTagsJson: { words: classification.words },
    scoringRubricJson: { scoring: "speech_match", evidence: "sentence reading accuracy" },
    studentDisplayMode: "SENTENCE_LIST",
    responseMode: "speech_response",
  });
}
