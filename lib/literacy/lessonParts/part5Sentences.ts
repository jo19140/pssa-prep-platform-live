import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { classifyPassageWords } from "../passageClassifier";
import { morphologyConfigFromTargetPatternsJson } from "../morphologyAnalyzer";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

export function generatePart5Sentences(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const content = phase3EntryLessonContentFor(ctx.dailyTarget.code);
  const classification = classifyPassageWords(content.sentences.join(" "), {
    targetPatternCodes: ctx.targetPatterns,
    allowedPatternCodes: ctx.dailyTarget.allowedPatternCodes,
    blockedPatternCodes: ctx.dailyTarget.blockedPatternCodes,
    heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown, "is"],
    vocabularyAllowlist: ctx.vocabularyWords,
    morphology: morphologyConfigFromTargetPatternsJson(ctx.dailyTarget.targetPatternsJson),
  });
  return withCommonPartMetadata(ctx, {
    partNumber: 5,
    partLabel: "Sentence-level reading",
    partType: "SENTENCE_READING",
    kidVisibleCopy: {
      title: "Read the sentences",
      directions: "Read each sentence out loud.",
      sentences: content.sentences,
    },
    tutorVisibleCopy: {
      purpose: "Move from word-level target practice into short sentence reading.",
    },
    contentJson: {
      skillFocus: "sentence_reading",
      sentences: content.sentences,
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
