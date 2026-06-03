import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { wordMatchesPattern } from "../passageClassifier";
import { detectPatternCandidates, validatePseudowordCandidate } from "../pseudowordValidator";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

export function generatePart3Decoding(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const content = phase3EntryLessonContentFor(ctx.dailyTarget.code);
  const pseudowordValidation = ctx.pseudowords.map((word) => {
    const detectedPattern = selectPseudowordPattern(word, ctx.pseudowordPatterns);
    return detectedPattern
      ? validatePseudowordCandidate(word, detectedPattern, { strictLexicon: true })
      : validatePseudowordCandidate(word, ctx.pseudowordPatterns[0] ?? ctx.targetPatterns[0] ?? "a_e", { strictLexicon: true });
  });
  const contrastiveLines = [
    { lineNumber: 1, role: "target_real_words", words: ctx.targetWords },
    { lineNumber: 2, role: "contrastive_target_vs_review", words: content.contrastiveLine2 },
    { lineNumber: 3, role: "cumulative_review", words: content.contrastiveLine3 },
    { lineNumber: 4, role: "target_pseudowords", words: ctx.pseudowords },
  ];
  const allWords = contrastiveLines.flatMap((line) => line.words.map((word) => ({
    word,
    tag: line.role === "target_pseudowords" ? "target" : tagForWord(word, ctx.targetWords, ctx.targetPatterns),
    lineNumber: line.lineNumber,
    matchedPattern: line.role === "target_pseudowords"
      ? selectPseudowordPattern(word, ctx.pseudowordPatterns) ?? undefined
      : ctx.targetPatterns.find((pattern) => wordMatchesPattern(word, pattern, { strictPhonemeLexicon: ctx.phasePosition.phaseNumber >= 4 })),
    selectedPattern: line.role === "target_pseudowords" ? selectPseudowordPattern(word, ctx.pseudowordPatterns) ?? undefined : undefined,
    expectedPronunciation: line.role === "target_pseudowords"
      ? pseudowordValidation.find((entry) => entry.pseudoword === word)?.expectedPronunciation
      : undefined,
  })));

  return withCommonPartMetadata(ctx, {
    partNumber: 3,
    partLabel: "Word-level decoding",
    partType: "WORD_LEVEL_DECODING",
    kidVisibleCopy: {
      title: "Read the word lines",
      directions: "Read each line with Harper. Take your time and try each word.",
      contrastiveLines,
    },
    tutorVisibleCopy: {
      purpose: "Practice target real words, contrast target words against closed-syllable review, then read target-only pseudowords.",
      pseudowordValidation,
    },
    contentJson: {
      skillFocus: "word_level_decoding",
      contrastiveLines,
      pseudowordValidation,
      studentDisplayMode: "WORD_LINES",
      responseMode: "speech_response",
    },
    wordTagsJson: { words: allWords },
    scoringRubricJson: { scoring: "speech_match", evidence: "word-level decoding accuracy" },
    studentDisplayMode: "WORD_LINES",
    responseMode: "speech_response",
  });
}

function tagForWord(word: string, targetWords: string[], targetPatterns: string[]) {
  if (targetWords.includes(word)) return "target";
  if (targetPatterns.some((pattern) => wordMatchesPattern(word, pattern, { strictPhonemeLexicon: true }))) return "target";
  return "prerequisite";
}

function selectPseudowordPattern(word: string, orderedPatterns: string[]) {
  const candidates = detectPatternCandidates(word);
  return orderedPatterns.find((pattern) => candidates.includes(pattern)) ?? null;
}
