import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { deriveDiagnosticItemMetadata, diagnosticMetadataToUpdateInput } from "./diagnosticItemMetadata";

export const STUDENT_READY_DIAGNOSTIC_ITEM_WHERE = {
  reviewStatus: "APPROVED",
  itemStatus: "pilot_ready",
  retiredAt: null,
} satisfies Prisma.DiagnosticItemWhereInput;

export const DIAGNOSTIC_ITEM_REVIEW_OUTCOME_TYPE = "CONTENT_V3_DIAGNOSTIC_ITEM_HUMAN_REVIEW";

const FIRST_LOOK_RECOMMENDATION_ORDER: Record<string, number> = {
  REJECT: 0,
  FLAG_FOR_HUMAN: 1,
  APPROVE: 2,
};

const diagnosticItemInclude = {
  phasePosition: true,
  dailyTarget: true,
  firstLookReviewModelDecision: {
    include: {
      outcomes: {
        where: { outcomeType: DIAGNOSTIC_ITEM_REVIEW_OUTCOME_TYPE },
        orderBy: { measuredAt: "desc" as const },
      },
    },
  },
} satisfies Prisma.DiagnosticItemInclude;

export async function getStudentReadyDiagnosticItems(args: Omit<Prisma.DiagnosticItemFindManyArgs, "where"> = {}) {
  const items = await db.diagnosticItem.findMany({
    ...args,
    where: STUDENT_READY_DIAGNOSTIC_ITEM_WHERE,
    include: {
      dailyTarget: true,
      firstLookReviewModelDecision: true,
      ...(args.include || {}),
    },
  });
  return items.filter(isDiagnosticItemStudentReady);
}

export async function countStudentReadyDiagnosticItems() {
  const items = await db.diagnosticItem.findMany({
    where: STUDENT_READY_DIAGNOSTIC_ITEM_WHERE,
    include: {
      dailyTarget: true,
      firstLookReviewModelDecision: true,
    },
  });
  return items.filter(isDiagnosticItemStudentReady).length;
}

export type DiagnosticItemQueueFilter =
  | { kind: "status"; status: "PENDING" | "EDITED" | "APPROVED" | "REJECTED" }
  | { kind: "recommendation"; recommendation: "REJECT" | "FLAG_FOR_HUMAN" };

export async function getDiagnosticItemReviewQueue(filter: DiagnosticItemQueueFilter = { kind: "status", status: "PENDING" }) {
  const items = await db.diagnosticItem.findMany({
    where: filter.kind === "status"
      ? { reviewStatus: filter.status, retiredAt: null }
      : { retiredAt: null },
    include: diagnosticItemInclude,
    orderBy: [{ createdAt: "asc" }, { strand: "asc" }],
    take: 500,
  });

  const filteredItems = filter.kind === "recommendation"
    ? items.filter((item) => firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson) === filter.recommendation)
    : items;

  return filteredItems.sort((a, b) => {
    const aRecommendation = firstLookRecommendation(a.firstLookReviewModelDecision?.decisionJson);
    const bRecommendation = firstLookRecommendation(b.firstLookReviewModelDecision?.decisionJson);
    return (
      (FIRST_LOOK_RECOMMENDATION_ORDER[aRecommendation] ?? 99) -
        (FIRST_LOOK_RECOMMENDATION_ORDER[bRecommendation] ?? 99) ||
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  });
}

export async function getPendingDiagnosticItemReviewQueue() {
  return getDiagnosticItemReviewQueue({ kind: "status", status: "PENDING" });
}

export async function getDiagnosticItemReviewQueueCounts() {
  const items = await db.diagnosticItem.findMany({
    where: { retiredAt: null },
    select: {
      reviewStatus: true,
      firstLookReviewModelDecision: { select: { decisionJson: true } },
    },
  });

  return {
    pending: items.filter((item) => item.reviewStatus === "PENDING").length,
    edited: items.filter((item) => item.reviewStatus === "EDITED").length,
    approvedProductionPool: items.filter((item) => item.reviewStatus === "APPROVED").length,
    rejected: items.filter((item) => item.reviewStatus === "REJECTED").length,
    aiRejectHints: items.filter((item) => firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson) === "REJECT").length,
    needsHumanEye: items.filter((item) => firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson) === "FLAG_FOR_HUMAN").length,
  };
}

export async function getDiagnosticItemReviewDetail(id: string) {
  return db.diagnosticItem.findFirst({
    where: {
      id,
      retiredAt: null,
    },
    include: diagnosticItemInclude,
  });
}

export type DiagnosticItemReviewAction = "APPROVE" | "REJECT" | "EDIT";

export type DiagnosticItemReviewInput = {
  action: DiagnosticItemReviewAction;
  reviewerUserId: string;
  reviewNotes?: string | null;
  studentPromptJson?: Prisma.InputJsonValue;
  stimulusJson?: Prisma.InputJsonValue | null;
  expectedResponseJson?: Prisma.InputJsonValue;
  scoringRubricJson?: Prisma.InputJsonValue;
  adminReviewJson?: Prisma.InputJsonValue | null;
  metadata?: Record<string, unknown>;
};

export async function reviewDiagnosticItem(id: string, input: DiagnosticItemReviewInput) {
  const item = await db.diagnosticItem.findFirst({
    where: { id, retiredAt: null },
    select: {
      id: true,
      strand: true,
      itemType: true,
      phaseBand: true,
      phasePositionId: true,
      dailyTargetId: true,
      dailyTarget: { select: { code: true } },
      reviewStatus: true,
      itemStatus: true,
      skill: true,
      displayMode: true,
      responseMode: true,
      targetPattern: true,
      wordType: true,
      displayText: true,
      canonicalAnswer: true,
      targetWord: true,
      vocabularyBand: true,
      morphologyWave: true,
      targetMorpheme: true,
      audioAssetRequired: true,
      audioValidatedByHuman: true,
      expectedPronunciation: true,
      comprehensionMode: true,
      stimulusMode: true,
      calibratedProbeLevel: true,
      placementEvidenceJson: true,
      fluencyEvidenceJson: true,
      studentPromptJson: true,
      stimulusJson: true,
      expectedResponseJson: true,
      scoringRubricJson: true,
      adminReviewJson: true,
      firstLookReviewModelDecisionId: true,
      firstLookReviewModelDecision: {
        select: {
          id: true,
          decisionJson: true,
          outcomes: { where: { outcomeType: DIAGNOSTIC_ITEM_REVIEW_OUTCOME_TYPE }, select: { id: true } },
        },
      },
    },
  });

  if (!item) {
    return { ok: false as const, status: 404, error: "Diagnostic item not found." };
  }

  if (item.reviewStatus !== "PENDING" && item.reviewStatus !== "EDITED") {
    return { ok: false as const, status: 409, error: `Diagnostic item is already ${item.reviewStatus}.` };
  }

  if (!item.firstLookReviewModelDecisionId || !item.firstLookReviewModelDecision) {
    return { ok: false as const, status: 409, error: "Diagnostic item is missing its AI first-look ModelDecision." };
  }

  if (item.firstLookReviewModelDecision.outcomes.length > 0) {
    return { ok: false as const, status: 409, error: "This AI first-look decision already has a human review outcome." };
  }

  const nextStudentPromptJson = input.studentPromptJson !== undefined ? input.studentPromptJson : item.studentPromptJson;
  const nextStimulusJson = input.stimulusJson !== undefined ? input.stimulusJson : item.stimulusJson;
  const nextExpectedResponseJson = input.expectedResponseJson !== undefined ? input.expectedResponseJson : item.expectedResponseJson;
  const nextScoringRubricJson = input.scoringRubricJson !== undefined ? input.scoringRubricJson : item.scoringRubricJson;
  const nextAdminReviewJson = input.adminReviewJson !== undefined ? input.adminReviewJson : item.adminReviewJson;
  const derived = deriveDiagnosticItemMetadata({
    ...item,
    ...(input.metadata || {}),
    dailyTargetCode: item.dailyTarget?.code,
    studentPromptJson: nextStudentPromptJson,
    stimulusJson: nextStimulusJson,
    expectedResponseJson: nextExpectedResponseJson,
    scoringRubricJson: nextScoringRubricJson,
    adminReviewJson: nextAdminReviewJson,
  });
  const relationUpdate = await diagnosticRelationUpdate({
    phasePositionId: item.phasePositionId,
    dailyTargetId: item.dailyTargetId,
    targetPattern: derived.metadata.targetPattern,
  });

  const failedBlockers = firstLookFailedBlockers(item.firstLookReviewModelDecision.decisionJson);
  const reviewNotes = input.reviewNotes?.trim() || null;
  if (input.action === "APPROVE" && derived.approvalBlockers.length > 0) {
    return { ok: false as const, status: 400, error: `Cannot approve until metadata is complete: ${derived.approvalBlockers.join(" ")}` };
  }
  if (input.action === "APPROVE" && failedBlockers.length > 0) {
    return { ok: false as const, status: 400, error: `Cannot approve while AI first-look has blocker failures: ${failedBlockers.map((blocker) => blocker.requirementId).join(", ")}` };
  }

  const reviewStatus = input.action === "APPROVE" ? "APPROVED" : input.action === "REJECT" ? "REJECTED" : "EDITED";
  const now = new Date();
  const updateData: Prisma.DiagnosticItemUpdateInput = {
    reviewStatus,
    itemStatus: input.action === "APPROVE" ? "pilot_ready" : "candidate",
    reviewedAt: now,
    reviewedByUserId: input.reviewerUserId,
    reviewNotes,
    ...diagnosticMetadataToUpdateInput(derived.metadata),
    ...relationUpdate,
  };

  if (input.action === "EDIT") {
    if (input.studentPromptJson !== undefined) updateData.studentPromptJson = input.studentPromptJson;
    if (input.stimulusJson !== undefined) updateData.stimulusJson = input.stimulusJson;
    if (input.expectedResponseJson !== undefined) updateData.expectedResponseJson = input.expectedResponseJson;
    if (input.scoringRubricJson !== undefined) updateData.scoringRubricJson = input.scoringRubricJson;
    if (input.adminReviewJson !== undefined) updateData.adminReviewJson = input.adminReviewJson;
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.diagnosticItem.update({
      where: { id: item.id },
      data: updateData,
      include: diagnosticItemInclude,
    });

    const outcome = await tx.modelDecisionOutcome.create({
      data: {
        modelDecisionId: item.firstLookReviewModelDecisionId!,
        outcomeType: DIAGNOSTIC_ITEM_REVIEW_OUTCOME_TYPE,
        outcomeLabel: reviewStatus,
        outcomeScore: reviewStatus === "APPROVED" ? 1 : reviewStatus === "REJECTED" ? 0 : 0.5,
        metricJson: {
          artifactType: "DIAGNOSTIC_ITEM",
          artifactId: item.id,
          reviewerUserId: input.reviewerUserId,
          action: input.action,
          finalReviewStatus: reviewStatus,
          reviewNotes,
          aiFirstLookRecommendation: firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson),
          aiFlaggedBlockers: failedBlockers,
          overrideApplied: false,
          overrideReasoning: null,
          editedFields:
            input.action === "EDIT"
              ? {
                  studentPromptJson: input.studentPromptJson !== undefined,
                  stimulusJson: input.stimulusJson !== undefined,
                  expectedResponseJson: input.expectedResponseJson !== undefined,
                  scoringRubricJson: input.scoringRubricJson !== undefined,
                  adminReviewJson: input.adminReviewJson !== undefined,
                }
              : {},
        },
        measuredAt: now,
      },
    });

    return { updated, outcome };
  });

  return { ok: true as const, ...result };
}

export function firstLookRecommendation(decisionJson: unknown) {
  const recommendation = readDecisionString(decisionJson, "recommendation");
  if (recommendation === "APPROVE" || recommendation === "FLAG_FOR_HUMAN" || recommendation === "REJECT") return recommendation;
  return "FLAG_FOR_HUMAN";
}

export function firstLookConfidence(decisionJson: unknown) {
  const confidence = readDecisionNumber(decisionJson, "confidence");
  return confidence == null ? 0 : Math.max(0, Math.min(1, confidence));
}

export function isDiagnosticItemStudentReady(item: {
  strand: string;
  itemType: string;
  phaseBand?: number | null;
  phasePositionId?: string | null;
  dailyTargetId?: string | null;
  dailyTarget?: { code?: string | null } | null;
  reviewStatus?: string | null;
  itemStatus?: string | null;
  retiredAt?: Date | null;
  skill?: string | null;
  displayMode?: string | null;
  responseMode?: string | null;
  targetPattern?: string | null;
  wordType?: string | null;
  displayText?: string | null;
  canonicalAnswer?: string | null;
  targetWord?: string | null;
  vocabularyBand?: string | null;
  morphologyWave?: string | null;
  targetMorpheme?: string | null;
  audioAssetRequired?: boolean | null;
  audioValidatedByHuman?: boolean | null;
  expectedPronunciation?: string | null;
  comprehensionMode?: string | null;
  stimulusMode?: string | null;
  calibratedProbeLevel?: string | null;
  placementEvidenceJson?: unknown;
  fluencyEvidenceJson?: unknown;
  studentPromptJson?: unknown;
  stimulusJson?: unknown;
  expectedResponseJson?: unknown;
  scoringRubricJson?: unknown;
  adminReviewJson?: unknown;
  firstLookReviewModelDecision?: { decisionJson?: unknown } | null;
}) {
  if (item.reviewStatus !== "APPROVED" || item.itemStatus !== "pilot_ready" || item.retiredAt) return false;
  const derived = deriveDiagnosticItemMetadata({
    ...item,
    dailyTargetCode: item.dailyTarget?.code,
  });
  if (derived.approvalBlockers.length > 0) return false;
  const firstLook = item.firstLookReviewModelDecision?.decisionJson;
  if (firstLookFailedBlockers(firstLook).length > 0) return false;
  if (!firstLook && !jsonRecord(item.adminReviewJson).fastTrackEligible) return false;
  return true;
}

function readDecisionString(decisionJson: unknown, key: string) {
  if (!decisionJson || typeof decisionJson !== "object") return null;
  const value = (decisionJson as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function readDecisionNumber(decisionJson: unknown, key: string) {
  if (!decisionJson || typeof decisionJson !== "object") return null;
  const value = (decisionJson as Record<string, unknown>)[key];
  return typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : null;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function firstLookFailedBlockers(decisionJson: unknown) {
  if (!decisionJson || typeof decisionJson !== "object" || Array.isArray(decisionJson)) return [];
  const checks = (decisionJson as Record<string, unknown>).checks;
  if (!Array.isArray(checks)) return [];
  return checks
    .filter((check): check is Record<string, unknown> => Boolean(check) && typeof check === "object" && !Array.isArray(check))
    .filter((check) => check.result === "FAIL" && check.severity === "BLOCKER")
    .map((check) => ({
      requirementId: typeof check.requirementId === "string" ? check.requirementId : "UNKNOWN_REQUIREMENT",
      severity: "BLOCKER",
      evidence: typeof check.evidence === "string" ? check.evidence : "",
    }));
}

async function diagnosticRelationUpdate(input: { phasePositionId?: string | null; dailyTargetId?: string | null; targetPattern?: string | null }): Promise<Prisma.DiagnosticItemUpdateInput> {
  if (input.phasePositionId && input.dailyTargetId) return {};
  if (!input.targetPattern) return {};
  const target = await db.dailyTarget.findUnique({
    where: { code: input.targetPattern },
    select: { id: true, phasePositionId: true },
  });
  if (!target) return {};
  return {
    ...(input.dailyTargetId ? {} : { dailyTarget: { connect: { id: target.id } } }),
    ...(input.phasePositionId ? {} : { phasePosition: { connect: { id: target.phasePositionId } } }),
  };
}
