import type { DailyTarget, PhasePosition } from "@prisma/client";
import { classifyPassageWords, type PassageClassification } from "./passageClassifier";
import { runPassageQualityAudit, type PassageQualityAudit } from "./passageQualityAudit";

export type PassageAuditContext = {
  phasePosition: Pick<PhasePosition, "id" | "phaseNumber" | "label">;
  dailyTarget: Pick<DailyTarget, "code" | "targetPatternsJson" | "allowedPatternCodes" | "blockedPatternCodes">;
  heartWords: string[];
  vocabularyAllowlist: string[];
  nearDuplicateExistingPassageIds?: string[];
};

export type PassageAuditResult = PassageClassification & {
  phaseNumber: number;
  dailyTargetCode: string;
  wordCountBand: { min: number; max: number; target: number } | null;
  wordCountWithinBand: boolean;
  decodabilityThreshold: number;
  quality: PassageQualityAudit;
  unclassifiedCount: number;
  passesAuditGate: boolean;
};

export function phaseWordCountBand(phaseNumber: number) {
  const bands: Record<number, { min: number; max: number }> = {
    1: { min: 15, max: 25 },
    2: { min: 25, max: 45 },
    3: { min: 45, max: 80 },
    4: { min: 80, max: 120 },
    5: { min: 120, max: 180 },
    6: { min: 180, max: 280 },
  };
  const band = bands[phaseNumber] || null;
  return band ? { ...band, target: Math.round((band.min + band.max) / 2) } : null;
}

export function decodabilityThresholdForPhase(phaseNumber: number) {
  if (phaseNumber <= 2) return 0.98;
  if (phaseNumber <= 5) return 0.95;
  return 0.92;
}

export function auditPassage(text: string, context: PassageAuditContext): PassageAuditResult {
  const targetPatternCodes = patternCodesFromDailyTarget(context.dailyTarget);
  const classification = classifyPassageWords(text, {
    targetPatternCodes,
    allowedPatternCodes: context.dailyTarget.allowedPatternCodes,
    blockedPatternCodes: context.dailyTarget.blockedPatternCodes,
    heartWords: context.heartWords,
    vocabularyAllowlist: context.vocabularyAllowlist,
  });
  const wordCountBand = phaseWordCountBand(context.phasePosition.phaseNumber);
  const wordCountWithinBand = Boolean(wordCountBand && classification.wordCount >= wordCountBand.min && classification.wordCount <= wordCountBand.max);
  const quality = runPassageQualityAudit(text, context.nearDuplicateExistingPassageIds || []);
  const decodabilityThreshold = decodabilityThresholdForPhase(context.phasePosition.phaseNumber);
  const unclassifiedCount = classification.unclassifiedWords.length;
  const passesAuditGate =
    wordCountWithinBand &&
    unclassifiedCount === 0 &&
    classification.blockedPatternViolations.length === 0 &&
    classification.decodabilityScore >= decodabilityThreshold &&
    quality.passesQualityGate;

  return {
    ...classification,
    phaseNumber: context.phasePosition.phaseNumber,
    dailyTargetCode: context.dailyTarget.code,
    wordCountBand,
    wordCountWithinBand,
    decodabilityThreshold,
    quality,
    unclassifiedCount,
    passesAuditGate,
  };
}

export function patternCodesFromDailyTarget(dailyTarget: Pick<DailyTarget, "code" | "targetPatternsJson">): string[] {
  const json = dailyTarget.targetPatternsJson;
  const patterns = new Set<string>();
  collectStrings(json).forEach((value) => {
    if (/^[a-z]+_e$|^closed_short_[aeiou]$|^[a-z]{2,4}$/.test(value)) patterns.add(value);
  });
  return patterns.size ? Array.from(patterns) : [dailyTarget.code];
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  return [];
}
