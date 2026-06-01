import { validatePseudowordSet } from "../pseudowordValidator";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

const LINE_2 = ["cap", "cape", "man", "mane", "tap", "tape", "hat", "hate"];
const LINE_3 = ["ran", "lake", "hand", "gave", "fast", "name", "desk"];

export function generatePart3Decoding(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const pseudowordValidation = validatePseudowordSet(ctx.pseudowords, ctx.targetPattern);
  const contrastiveLines = [
    { lineNumber: 1, role: "target_real_words", words: ctx.targetWords },
    { lineNumber: 2, role: "contrastive_target_vs_review", words: LINE_2 },
    { lineNumber: 3, role: "cumulative_review", words: LINE_3 },
    { lineNumber: 4, role: "target_pseudowords", words: ctx.pseudowords },
  ];
  const allWords = contrastiveLines.flatMap((line) => line.words.map((word) => ({
    word,
    tag: line.role === "target_pseudowords" ? "target" : tagForWord(word, ctx.targetWords),
    lineNumber: line.lineNumber,
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

function tagForWord(word: string, targetWords: string[]) {
  if (targetWords.includes(word) || ["cape", "mane", "tape", "hate", "lake", "gave", "name"].includes(word)) return "target";
  return "prerequisite";
}
