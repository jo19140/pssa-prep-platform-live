import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

export function generatePart7ConnectedText(ctx: LessonGeneratorContext): GeneratedLessonPart {
  if (!ctx.selectedPassage || !ctx.selectedPassageAudit) {
    throw new Error("Part 7 requires an approved selected passage and fresh content audit.");
  }
  const audit = ctx.selectedPassageAudit;
  const content = phase3EntryLessonContentFor(ctx.dailyTarget.code, ctx.presentationProfile);
  return withCommonPartMetadata(ctx, {
    partNumber: 7,
    partLabel: "Connected-text reading",
    partType: "CONNECTED_TEXT_READING",
    kidVisibleCopy: {
      title: ctx.phasePosition.phaseNumber >= 4 ? content.fullAuditPassageTitle || content.mockPassageTitle : content.mockPassageTitle,
      directions: "Choose listen first or read on your own. Harper will help when you need it.",
      passageText: ctx.selectedPassage.text,
    },
    tutorVisibleCopy: {
      purpose: "Apply today's target in controlled connected text with assisted-vs-independent scoring kept separate.",
      auditSummary: {
        decodabilityScore: audit.decodabilityScore,
        targetWords: audit.targetWords,
        prerequisiteWords: audit.prerequisiteWords,
        heartWords: audit.heartWords,
        vocabularyWords: audit.vocabularyWords,
        unclassifiedWords: audit.unclassifiedWords,
      },
    },
    contentJson: {
      skillFocus: "connected_text_reading",
      passageId: ctx.selectedPassage.id,
      passageText: ctx.selectedPassage.text,
      contentAuditJson: audit,
      targetWords: audit.targetWords,
      prerequisiteWords: audit.prerequisiteWords,
      heartWords: audit.heartWords,
      vocabularyWords: audit.vocabularyWords,
      unclassifiedWords: audit.unclassifiedWords,
      heartWordsUsedInConnectedText: audit.heartWords,
      listenFirstAllowed: true,
      readOnOwnAllowed: true,
      connectedTextMode: "ASSISTED_OR_INDEPENDENT",
      studentDisplayMode: "CONNECTED_TEXT",
      responseMode: "speech_response",
    },
    contentAuditJson: audit as unknown as Record<string, unknown>,
    wordTagsJson: { words: audit.words },
    scoringRubricJson: {
      scoring: "speech_match",
      assistedMode: "listen_first",
      independentMode: "read_on_own",
      independentScoreEligibleWhen: "read_on_own",
    },
    studentDisplayMode: "CONNECTED_TEXT",
    responseMode: "speech_response",
    assistedModeAllowed: true,
    independentScoreEligible: false,
  });
}
