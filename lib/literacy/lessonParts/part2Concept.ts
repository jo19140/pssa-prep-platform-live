import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { wordMatchesPattern } from "../passageClassifier";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

export function generatePart2Concept(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const content = phase3EntryLessonContentFor(ctx.dailyTarget.code);
  const demoMode = content.demoMode ?? "minimal_pairs";
  const demonstrationPairs = content.demonstrationPairs ?? [];
  const demonstrationExamples = content.demonstrationExamples ?? [];
  const allExamples = [...ctx.targetWords, ...demonstrationExamples, ...demonstrationPairs.map((pair) => pair.target)];
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
      demoMode,
      demonstrationPairs,
      demonstrationExamples,
    },
    contentJson: {
      skillFocus: "explicit_target_instruction",
      conceptExamples: ctx.targetWords,
      demoMode,
      demonstrationPairs,
      demonstrationExamples,
      teachingLanguage: ctx.phasePosition.phaseNumber >= 4
        ? "These letters work together to help the vowel sound stay long."
        : "Silent e helps the vowel say its name in these words.",
      studentDisplayMode: "EXAMPLE_CARDS",
      responseMode: "listen_and_repeat",
    },
    wordTagsJson: {
      words: Array.from(new Set(allExamples)).map((word) => ({
        word,
        tag: "target",
        pattern: ctx.targetPatterns.find((pattern) => wordMatchesPattern(word, pattern, { strictPhonemeLexicon: ctx.phasePosition.phaseNumber >= 4 })) ?? ctx.targetPattern,
      })),
    },
    studentDisplayMode: "EXAMPLE_CARDS",
    responseMode: "listen_and_repeat",
  });
}
