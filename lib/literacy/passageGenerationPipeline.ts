import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { runAIFirstLookReview, type FirstLookModelRunner } from "@/lib/content/aiFirstLookReviewer";
import { auditPassage, patternCodesFromDailyTarget } from "./passageAudit";
import { findNearDuplicatePassages } from "./findNearDuplicatePassages";
import { generatePassageCandidate, type PassageModelRunner } from "./passageGenerator";

export type PassageGenerationPipelineOptions = {
  phasePositionId: string;
  dailyTargetId: string;
  count?: number;
  maxAttemptsPerCandidate?: number;
  vocabularyAllowlist?: string[];
  modelRunner?: PassageModelRunner;
  firstLookModelRunner?: FirstLookModelRunner;
};

export type PassageGenerationPipelineResult = {
  insertedPassageIds: string[];
  failedAttempts: Array<{ attempt: number; text: string; reasons: string[] }>;
};

export async function generatePassagesForTarget(options: PassageGenerationPipelineOptions): Promise<PassageGenerationPipelineResult> {
  const count = options.count ?? 1;
  const maxAttemptsPerCandidate = options.maxAttemptsPerCandidate ?? 3;
  const [phasePosition, dailyTarget] = await Promise.all([
    db.phasePosition.findUnique({ where: { id: options.phasePositionId } }),
    db.dailyTarget.findUnique({ where: { id: options.dailyTargetId } }),
  ]);
  if (!phasePosition) throw new Error(`PhasePosition not found: ${options.phasePositionId}`);
  if (!dailyTarget) throw new Error(`DailyTarget not found: ${options.dailyTargetId}`);
  if (dailyTarget.phasePositionId !== phasePosition.id) throw new Error("DailyTarget does not belong to the requested phase position.");

  const heartWords = await canonicalHeartWordsForPhase(phasePosition.phaseNumber);
  const vocabularyAllowlist = options.vocabularyAllowlist ?? [];
  const insertedPassageIds: string[] = [];
  const failedAttempts: PassageGenerationPipelineResult["failedAttempts"] = [];
  let retryFeedback: string[] = [];

  while (insertedPassageIds.length < count) {
    let insertedThisCandidate = false;
    for (let attempt = 1; attempt <= maxAttemptsPerCandidate; attempt += 1) {
      const text = await generatePassageCandidate({
        phaseNumber: phasePosition.phaseNumber,
        phasePositionId: phasePosition.id,
        dailyTargetCode: dailyTarget.code,
        targetPatternCodes: patternCodesFromDailyTarget(dailyTarget),
        allowedPatternCodes: dailyTarget.allowedPatternCodes,
        blockedPatternCodes: dailyTarget.blockedPatternCodes,
        exampleWords: dailyTarget.exampleWords,
        vocabularyAllowlist,
        retryFeedback,
      }, { modelRunner: options.modelRunner });
      const nearDuplicateExistingPassageIds = await findNearDuplicatePassages({ text, phasePositionId: phasePosition.id });
      const audit = auditPassage(text, { phasePosition, dailyTarget, heartWords, vocabularyAllowlist, nearDuplicateExistingPassageIds });
      const reasons = auditFailureReasons(audit);
      if (reasons.length > 0) {
        failedAttempts.push({ attempt, text, reasons });
        retryFeedback = reasons;
        continue;
      }

      const passage = await db.passage.create({
        data: {
          source: "AI_GENERATED",
          sourceAttributionCode: "AI_GENERATED",
          phasePositionId: phasePosition.id,
          text,
          wordCount: audit.wordCount,
          contentAuditJson: audit as unknown as Prisma.InputJsonValue,
          decodabilityScore: audit.decodabilityScore,
          reviewStatus: "PENDING",
          sourceMetadataJson: {
            dailyTargetId: dailyTarget.id,
            dailyTargetCode: dailyTarget.code,
            targetPatternCodes: patternCodesFromDailyTarget(dailyTarget),
          },
        },
      });
      await runAIFirstLookReview(
        {
          artifactType: "PASSAGE",
          artifactId: passage.id,
          metadata: {
            phasePositionId: phasePosition.id,
            phaseNumber: phasePosition.phaseNumber,
            dailyTargetCode: dailyTarget.code,
            source: "AI_GENERATED",
          },
          contentForReview: {
            passageText: text,
            contentAuditJson: audit,
          },
        },
        options.firstLookModelRunner ? { modelRunner: options.firstLookModelRunner } : undefined,
      );
      insertedPassageIds.push(passage.id);
      insertedThisCandidate = true;
      retryFeedback = [];
      break;
    }
    if (!insertedThisCandidate) break;
  }

  return { insertedPassageIds, failedAttempts };
}

export function auditFailureReasons(audit: ReturnType<typeof auditPassage>): string[] {
  const reasons: string[] = [];
  if (!audit.wordCountWithinBand) reasons.push("word count outside phase band");
  if (audit.unclassifiedCount > 0) reasons.push(`unclassified words: ${audit.unclassifiedWords.join(", ")}`);
  if (audit.blockedPatternViolations.length > 0) reasons.push(`blocked pattern violations: ${audit.blockedPatternViolations.map((entry) => `${entry.word}/${entry.patternCode}`).join(", ")}`);
  if (audit.decodabilityScore < audit.decodabilityThreshold) reasons.push("decodability below phase threshold");
  if (!audit.quality.passesQualityGate) reasons.push("quality gate failed");
  return reasons;
}

async function canonicalHeartWordsForPhase(phaseNumber: number) {
  const hfw = await db.highFrequencyWord.findMany({
    where: { introducedAtPhase: { lte: phaseNumber } },
    select: { lemma: true, forms: true },
  });
  return hfw.flatMap((entry) => [entry.lemma, ...entry.forms]);
}
