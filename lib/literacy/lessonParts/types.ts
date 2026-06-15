import type { DailyTarget, Passage, PhasePosition } from "@prisma/client";
import type { PassageAuditResult } from "../passageAudit";
import type { PresentationProfile } from "../presentationProfile";

export type GeneratedLessonPart = {
  partNumber: number;
  partLabel: string;
  partType: string;
  kidVisibleCopy: Record<string, unknown>;
  tutorVisibleCopy: Record<string, unknown>;
  contentJson: Record<string, unknown>;
  contentAuditJson?: Record<string, unknown>;
  wordTagsJson?: Record<string, unknown>;
  scoringRubricJson?: Record<string, unknown>;
  studentDisplayMode?: string;
  responseMode?: string;
  assistedModeAllowed?: boolean;
  independentScoreEligible?: boolean;
  designNotes?: string;
};

export type LessonGeneratorContext = {
  phasePosition: Pick<PhasePosition, "id" | "phaseNumber" | "label">;
  presentationProfile?: PresentationProfile;
  dailyTarget: Pick<DailyTarget, "id" | "code" | "kidVisibleLabel" | "tutorLabel" | "targetPatternsJson" | "allowedPatternCodes" | "blockedPatternCodes" | "exampleWords" | "exampleNonwords">;
  targetPattern: string;
  targetPatterns: string[];
  pseudowordPatterns: string[];
  targetWords: string[];
  reviewWords: string[];
  pseudowords: string[];
  heartWordsPreviewedThisLesson: string[];
  heartWordsAssumedKnown: string[];
  vocabularyWords: string[];
  selectedPassage?: Pick<Passage, "id" | "text" | "contentAuditJson" | "decodabilityScore">;
  selectedPassageAudit?: PassageAuditResult;
};

export function withCommonPartMetadata(
  ctx: LessonGeneratorContext,
  part: GeneratedLessonPart,
  extras: Record<string, unknown> = {},
): GeneratedLessonPart {
  const contentJson = {
    partType: part.partType,
    dailyTargetCode: ctx.dailyTarget.code,
    targetPattern: ctx.targetPattern,
    targetPatterns: ctx.targetPatterns,
    pseudowordPatterns: ctx.pseudowordPatterns,
    ...part.contentJson,
    ...extras,
  };
  return {
    ...part,
    contentJson,
  };
}
