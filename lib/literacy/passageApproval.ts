import { db } from "@/lib/db";
import { decodabilityThresholdForPhase } from "./passageAudit";

export type PassageApprovalCheck = {
  canApprove: boolean;
  blockers: string[];
};

export function evaluatePassageApprovalReadiness(args: {
  contentAuditJson: unknown;
  decodabilityScore: number;
  phaseNumber: number;
}): PassageApprovalCheck {
  const audit = asRecord(args.contentAuditJson);
  const quality = asRecord(audit.quality);
  const blockers: string[] = [];
  if (audit.passesAuditGate !== true) blockers.push("contentAuditJson.passesAuditGate must be true");
  if (audit.wordCountWithinBand !== true) blockers.push("wordCountWithinBand must be true");
  if (Number(audit.unclassifiedCount || 0) !== 0) blockers.push("unclassifiedCount must be 0");
  if (arrayLength(audit.blockedPatternViolations) !== 0) blockers.push("blockedPatternViolations must be empty");
  if (quality.passesQualityGate !== true) blockers.push("quality.passesQualityGate must be true");
  if (quality.uniqueSentenceRatio !== 1) blockers.push("quality.uniqueSentenceRatio must be 1.0");
  if (arrayLength(quality.repeatedTrigrams) !== 0) blockers.push("quality.repeatedTrigrams must be empty");
  if (arrayLength(quality.nearDuplicateExistingPassageIds) !== 0) blockers.push("quality.nearDuplicateExistingPassageIds must be empty");
  if (args.decodabilityScore < decodabilityThresholdForPhase(args.phaseNumber)) blockers.push("decodabilityScore is below the phase threshold");
  return { canApprove: blockers.length === 0, blockers };
}

export async function canApprovePassage(passageId: string): Promise<PassageApprovalCheck> {
  const passage = await db.passage.findUnique({
    where: { id: passageId },
    select: {
      contentAuditJson: true,
      decodabilityScore: true,
      phasePositionId: true,
    },
  });
  if (!passage) return { canApprove: false, blockers: ["Passage not found"] };
  const phasePosition = await db.phasePosition.findUnique({
    where: { id: passage.phasePositionId },
    select: { phaseNumber: true },
  });
  if (!phasePosition) return { canApprove: false, blockers: ["Phase position not found"] };
  return evaluatePassageApprovalReadiness({
    contentAuditJson: passage.contentAuditJson,
    decodabilityScore: passage.decodabilityScore,
    phaseNumber: phasePosition.phaseNumber,
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}
