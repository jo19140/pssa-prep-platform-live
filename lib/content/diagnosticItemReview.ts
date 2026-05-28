import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const STUDENT_READY_DIAGNOSTIC_ITEM_WHERE = {
  reviewStatus: "APPROVED",
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
  return db.diagnosticItem.findMany({
    ...args,
    where: STUDENT_READY_DIAGNOSTIC_ITEM_WHERE,
  });
}

export async function countStudentReadyDiagnosticItems() {
  return db.diagnosticItem.count({ where: STUDENT_READY_DIAGNOSTIC_ITEM_WHERE });
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
};

export async function reviewDiagnosticItem(id: string, input: DiagnosticItemReviewInput) {
  const item = await db.diagnosticItem.findFirst({
    where: { id, retiredAt: null },
    select: {
      id: true,
      reviewStatus: true,
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

  const reviewStatus = input.action === "APPROVE" ? "APPROVED" : input.action === "REJECT" ? "REJECTED" : "EDITED";
  const now = new Date();
  const updateData: Prisma.DiagnosticItemUpdateInput = {
    reviewStatus,
    reviewedAt: now,
    reviewedByUserId: input.reviewerUserId,
    reviewNotes: input.reviewNotes?.trim() || null,
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
          reviewNotes: input.reviewNotes?.trim() || null,
          aiFirstLookRecommendation: firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson),
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
