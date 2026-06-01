import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { runAIFirstLookReview, type AIFirstLookReview } from "@/lib/content/aiFirstLookReviewer";
import { canApprovePassage } from "./passageApproval";
import { auditPassage, type PassageAuditResult } from "./passageAudit";
import { findNearDuplicatePassages } from "./findNearDuplicatePassages";
import { tokenizePassage } from "./passageTokenizer";

export type PassageReviewStatus = "PENDING" | "EDITED" | "APPROVED" | "REJECTED";
export type PassageFirstLookRecommendation = "APPROVE" | "FLAG_FOR_HUMAN" | "REJECT" | "UNEVALUATED";

export type PassageReviewSummary = {
  id: string;
  reviewStatus: PassageReviewStatus;
  source: string;
  phasePositionLabel: string;
  dailyTargetCode: string | null;
  firstLookRecommendation: PassageFirstLookRecommendation;
  wordCount: number;
  wordCountWithinBand: boolean;
  decodabilityScore: number;
  titleOrFirstWords: string;
  createdAt: Date;
};

export type PassageReviewDetail = PassageReviewSummary & {
  text: string;
  contentAuditJson: PassageAuditResult;
  firstLookOutput: AIFirstLookReview | null;
  firstLookStale: boolean;
  vocabularyAllowlist: string[];
  nearDuplicatePassages: Array<{
    id: string;
    titleOrFirstWords: string;
    textSnippet: string;
    similarityScore: number;
  }>;
  canApprove: { approvable: boolean; blockers: string[] };
};

export type PassageReviewFilter = {
  reviewStatus?: PassageReviewStatus;
  phasePositionId?: string;
  dailyTargetId?: string;
  firstLookRecommendation?: PassageFirstLookRecommendation;
  limit?: number;
  offset?: number;
};

export type PassageReviewActionInput =
  | {
      action: "APPROVE" | "REJECT";
      reviewerUserId: string;
      reviewNotes?: string | null;
    }
  | {
      action: "EDIT";
      reviewerUserId: string;
      reviewNotes?: string | null;
      editedText: string;
      editedVocabularyAllowlist?: string[];
    };

export const PASSAGE_REVIEW_OUTCOME_TYPE = "CONTENT_V3_PASSAGE_HUMAN_REVIEW";

const FIRST_LOOK_ORDER: Record<PassageFirstLookRecommendation, number> = {
  REJECT: 0,
  FLAG_FOR_HUMAN: 1,
  UNEVALUATED: 2,
  APPROVE: 3,
};

const passageInclude = {
  firstLookReviewModelDecision: {
    include: {
      outcomes: {
        where: { outcomeType: PASSAGE_REVIEW_OUTCOME_TYPE },
        orderBy: { measuredAt: "desc" as const },
      },
    },
  },
} satisfies Prisma.PassageInclude;

type PassageWithFirstLook = Prisma.PassageGetPayload<{ include: typeof passageInclude }>;

export async function getPassagesForReview(opts: PassageReviewFilter = {}): Promise<PassageReviewSummary[]> {
  const rows = await db.passage.findMany({
    where: {
      retiredAt: null,
      ...(opts.reviewStatus ? { reviewStatus: opts.reviewStatus } : {}),
      ...(opts.phasePositionId ? { phasePositionId: opts.phasePositionId } : {}),
    },
    include: passageInclude,
    orderBy: [{ createdAt: "asc" }],
    take: Math.min(opts.limit ?? 500, 500),
    skip: opts.offset ?? 0,
  });
  const phaseLabels = await phasePositionLabels(rows.map((row) => row.phasePositionId));

  return rows
    .filter((row) => !opts.dailyTargetId || passageSourceMetadata(row.sourceMetadataJson).dailyTargetId === opts.dailyTargetId)
    .map((row) => toPassageReviewSummary(row, phaseLabels.get(row.phasePositionId) || "Unknown phase"))
    .filter((row) => !opts.firstLookRecommendation || row.firstLookRecommendation === opts.firstLookRecommendation)
    .sort((a, b) => FIRST_LOOK_ORDER[a.firstLookRecommendation] - FIRST_LOOK_ORDER[b.firstLookRecommendation] || a.createdAt.getTime() - b.createdAt.getTime());
}

export async function countPassagesForReview(opts: PassageReviewFilter = {}) {
  return (await getPassagesForReview({ ...opts, limit: 500 })).length;
}

export async function getPassageReviewStats(opts: Omit<PassageReviewFilter, "reviewStatus" | "firstLookRecommendation" | "limit" | "offset"> = {}) {
  const rows = await getPassagesForReview({ ...opts, limit: 500 });
  return {
    pending: rows.filter((row) => row.reviewStatus === "PENDING").length,
    edited: rows.filter((row) => row.reviewStatus === "EDITED").length,
    approved: rows.filter((row) => row.reviewStatus === "APPROVED").length,
    rejected: rows.filter((row) => row.reviewStatus === "REJECTED").length,
    aiRejectHints: rows.filter((row) => row.firstLookRecommendation === "REJECT").length,
    needsHumanEye: rows.filter((row) => row.firstLookRecommendation === "FLAG_FOR_HUMAN").length,
  };
}

export async function getPassageForReview(passageId: string): Promise<PassageReviewDetail | null> {
  const row = await db.passage.findFirst({
    where: { id: passageId, retiredAt: null },
    include: passageInclude,
  });
  if (!row) return null;
  const phaseLabels = await phasePositionLabels([row.phasePositionId]);
  const summary = toPassageReviewSummary(row, phaseLabels.get(row.phasePositionId) || "Unknown phase");
  const audit = row.contentAuditJson as unknown as PassageAuditResult;
  const duplicateIds = uniqueStrings(asRecord(asRecord(audit).quality).nearDuplicateExistingPassageIds);
  const duplicateRows = duplicateIds.length
    ? await db.passage.findMany({
        where: { id: { in: duplicateIds } },
        select: { id: true, text: true },
      })
    : [];
  return {
    ...summary,
    text: row.text,
    contentAuditJson: audit,
    firstLookOutput: firstLookOutput(row.firstLookReviewModelDecision?.decisionJson),
    firstLookStale: passageSourceMetadata(row.sourceMetadataJson).firstLookStale === true,
    vocabularyAllowlist: uniqueStrings(passageSourceMetadata(row.sourceMetadataJson).vocabularyAllowlist),
    nearDuplicatePassages: duplicateRows.map((duplicate) => ({
      id: duplicate.id,
      titleOrFirstWords: firstWords(duplicate.text, 8),
      textSnippet: firstWords(duplicate.text, 50),
      similarityScore: similarityScore(row.text, duplicate.text),
    })),
    canApprove: await passageApprovalDetail(row.id),
  };
}

export async function reviewPassage(passageId: string, input: PassageReviewActionInput) {
  const passage = await db.passage.findFirst({
    where: { id: passageId, retiredAt: null },
    include: passageInclude,
  });
  if (!passage) return { ok: false as const, status: 404, error: "Passage not found." };

  const notes = input.reviewNotes?.trim() || "";
  if (input.action === "REJECT" && notes.length === 0) return { ok: false as const, status: 400, error: "Reject requires review notes." };
  if (input.action === "EDIT" && notes.length === 0) return { ok: false as const, status: 400, error: "Edit requires review notes." };

  if (input.action === "APPROVE") {
    return approvePassage(passage, input.reviewerUserId, notes);
  }
  if (input.action === "REJECT") {
    return rejectPassage(passage, input.reviewerUserId, notes);
  }
  return editPassage(passage, input as Extract<PassageReviewActionInput, { action: "EDIT" }>);
}

async function approvePassage(
  passage: PassageWithFirstLook,
  reviewerUserId: string,
  reviewNotes: string,
) {
  const metadata = passageSourceMetadata(passage.sourceMetadataJson);
  if (!passage.firstLookReviewModelDecisionId || metadata.firstLookStale === true) {
    return { ok: false as const, status: 400, error: "APPROVE requires AI first-look; passage is unevaluated." };
  }
  const recommendation = firstLookRecommendation(passage.firstLookReviewModelDecision?.decisionJson, metadata);
  if ((recommendation === "REJECT" || recommendation === "FLAG_FOR_HUMAN") && reviewNotes.length === 0) {
    return { ok: false as const, status: 400, error: "Approving against an AI first-look warning requires review notes." };
  }
  const approval = await canApprovePassage(passage.id);
  if (!approval.canApprove) {
    return { ok: false as const, status: 400, error: "Passage is not approvable.", blockers: approval.blockers };
  }
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.passage.update({
      where: { id: passage.id },
      data: {
        reviewStatus: "APPROVED",
        reviewedAt: now,
        reviewedByUserId: reviewerUserId,
        reviewNotes: reviewNotes || null,
      },
    });
    const outcome = await tx.modelDecisionOutcome.create({
      data: modelDecisionOutcomeData({
        modelDecisionId: passage.firstLookReviewModelDecisionId!,
        action: "APPROVE",
        outcomeLabel: "APPROVED",
        outcomeScore: 1,
        passage,
        reviewerUserId,
        reviewNotes,
      }),
    });
    const log = await tx.passageReviewLog.create({
      data: {
        passageId: passage.id,
        action: "APPROVE",
        reviewerUserId,
        notes: reviewNotes || null,
        editDiffJson: {
          aiFirstLookRecommendation: recommendation,
          overrideApplied: recommendation !== "APPROVE",
        },
      },
    });
    return { updated, outcome, log };
  });
  return { ok: true as const, ...result };
}

async function rejectPassage(
  passage: PassageWithFirstLook,
  reviewerUserId: string,
  reviewNotes: string,
) {
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.passage.update({
      where: { id: passage.id },
      data: {
        reviewStatus: "REJECTED",
        reviewedAt: now,
        reviewedByUserId: reviewerUserId,
        reviewNotes,
      },
    });
    const outcome = passage.firstLookReviewModelDecisionId
      ? await tx.modelDecisionOutcome.create({
          data: modelDecisionOutcomeData({
            modelDecisionId: passage.firstLookReviewModelDecisionId,
            action: "REJECT",
            outcomeLabel: "REJECTED",
            outcomeScore: 0,
            passage,
            reviewerUserId,
            reviewNotes,
          }),
        })
      : null;
    const log = await tx.passageReviewLog.create({
      data: {
        passageId: passage.id,
        action: "REJECT",
        reviewerUserId,
        notes: reviewNotes,
        editDiffJson: {
          aiFirstLookRecommendation: firstLookRecommendation(passage.firstLookReviewModelDecision?.decisionJson, passageSourceMetadata(passage.sourceMetadataJson)),
        },
      },
    });
    return { updated, outcome, log };
  });
  return { ok: true as const, ...result };
}

async function editPassage(
  passage: PassageWithFirstLook,
  input: Extract<PassageReviewActionInput, { action: "EDIT" }>,
) {
  const editedText = input.editedText.trim();
  if (!editedText) return { ok: false as const, status: 400, error: "Edit requires passage text." };

  const previousMetadata = passageSourceMetadata(passage.sourceMetadataJson);
  const previousAllowlist = uniqueStrings(previousMetadata.vocabularyAllowlist);
  const nextAllowlist = normalizeAllowlist(input.editedVocabularyAllowlist ?? previousAllowlist);
  const allowlistChanged = previousAllowlist.join("\n") !== nextAllowlist.join("\n");
  if (allowlistChanged && !input.reviewNotes?.trim()) {
    return { ok: false as const, status: 400, error: "Changing the vocabulary allowlist requires review notes." };
  }

  const [phasePosition, dailyTarget] = await Promise.all([
    db.phasePosition.findUnique({ where: { id: passage.phasePositionId } }),
    dailyTargetForPassage(previousMetadata),
  ]);
  if (!phasePosition) return { ok: false as const, status: 400, error: "Passage phase position not found." };
  if (!dailyTarget) return { ok: false as const, status: 400, error: "Passage daily target not found." };
  const heartWords = await canonicalHeartWordsForPhase(phasePosition.phaseNumber);
  const nearDuplicateExistingPassageIds = await findNearDuplicatePassages({
    text: editedText,
    phasePositionId: passage.phasePositionId,
    excludePassageId: passage.id,
  });
  const audit = auditPassage(editedText, {
    phasePosition,
    dailyTarget,
    heartWords,
    vocabularyAllowlist: nextAllowlist,
    nearDuplicateExistingPassageIds,
  });
  const failures = auditFailures(audit);
  if (failures.length > 0) {
    return { ok: false as const, status: 400, error: "Edited passage failed audit.", auditFailures: failures };
  }

  const sourceMetadata = {
    ...previousMetadata,
    dailyTargetId: dailyTarget.id,
    dailyTargetCode: dailyTarget.code,
    vocabularyAllowlist: nextAllowlist,
    firstLookStale: true,
  };
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.passage.update({
      where: { id: passage.id },
      data: {
        text: editedText,
        contentAuditJson: audit as unknown as Prisma.InputJsonValue,
        wordCount: audit.wordCount,
        decodabilityScore: audit.decodabilityScore,
        reviewStatus: "EDITED",
        reviewedAt: new Date(),
        reviewedByUserId: input.reviewerUserId,
        reviewNotes: input.reviewNotes?.trim() || null,
        firstLookReviewModelDecisionId: null,
        sourceMetadataJson: sourceMetadata as Prisma.InputJsonValue,
      },
    });
    const log = await tx.passageReviewLog.create({
      data: {
        passageId: passage.id,
        action: "EDIT",
        reviewerUserId: input.reviewerUserId,
        notes: input.reviewNotes?.trim() || null,
        editDiffJson: {
          before: {
            text: passage.text,
            vocabularyAllowlist: previousAllowlist,
          },
          after: {
            text: editedText,
            vocabularyAllowlist: nextAllowlist,
          },
          audit,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return { updated, log, audit };
  });

  try {
    await rerunPassageFirstLook({
      passageId: passage.id,
      passageText: editedText,
      audit,
      metadata: {
        phasePositionId: phasePosition.id,
        phaseNumber: phasePosition.phaseNumber,
        dailyTargetCode: dailyTarget.code,
        source: passage.source,
      },
    });
  } catch (error) {
    console.warn("Passage first-look rerun after edit failed", { passageId: passage.id, error });
  }

  return { ok: true as const, ...result };
}

export function firstLookRecommendation(decisionJson: unknown, metadata: Record<string, unknown> = {}): PassageFirstLookRecommendation {
  if (metadata.firstLookStale === true) return "UNEVALUATED";
  if (!decisionJson || typeof decisionJson !== "object" || Array.isArray(decisionJson)) return "UNEVALUATED";
  const value = (decisionJson as Record<string, unknown>).recommendation;
  if (value === "APPROVE" || value === "FLAG_FOR_HUMAN" || value === "REJECT") return value;
  return "UNEVALUATED";
}

export function firstLookOutput(decisionJson: unknown): AIFirstLookReview | null {
  if (!decisionJson || typeof decisionJson !== "object" || Array.isArray(decisionJson)) return null;
  const record = decisionJson as Record<string, unknown>;
  if (record.recommendation !== "APPROVE" && record.recommendation !== "FLAG_FOR_HUMAN" && record.recommendation !== "REJECT") return null;
  return record as unknown as AIFirstLookReview;
}

function toPassageReviewSummary(row: PassageWithFirstLook, phasePositionLabel: string): PassageReviewSummary {
  const metadata = passageSourceMetadata(row.sourceMetadataJson);
  const audit = asRecord(row.contentAuditJson);
  return {
    id: row.id,
    reviewStatus: normalizeReviewStatus(row.reviewStatus),
    source: row.source,
    phasePositionLabel,
    dailyTargetCode: typeof metadata.dailyTargetCode === "string" ? metadata.dailyTargetCode : null,
    firstLookRecommendation: firstLookRecommendation(row.firstLookReviewModelDecision?.decisionJson, metadata),
    wordCount: row.wordCount,
    wordCountWithinBand: audit.wordCountWithinBand === true,
    decodabilityScore: row.decodabilityScore,
    titleOrFirstWords: firstWords(row.text, 8),
    createdAt: row.createdAt,
  };
}

function modelDecisionOutcomeData(args: {
  modelDecisionId: string;
  action: "APPROVE" | "REJECT";
  outcomeLabel: string;
  outcomeScore: number;
  passage: PassageWithFirstLook;
  reviewerUserId: string;
  reviewNotes: string;
}): Prisma.ModelDecisionOutcomeCreateInput {
  return {
    modelDecision: { connect: { id: args.modelDecisionId } },
    outcomeType: PASSAGE_REVIEW_OUTCOME_TYPE,
    outcomeLabel: args.outcomeLabel,
    outcomeScore: args.outcomeScore,
    metricJson: {
      artifactType: "PASSAGE",
      artifactId: args.passage.id,
      action: args.action,
      reviewerUserId: args.reviewerUserId,
      reviewNotes: args.reviewNotes || null,
      aiFirstLookRecommendation: firstLookRecommendation(args.passage.firstLookReviewModelDecision?.decisionJson, passageSourceMetadata(args.passage.sourceMetadataJson)),
      aiFirstLookChecks: jsonArray(asRecord(args.passage.firstLookReviewModelDecision?.decisionJson).checks),
    } as Prisma.InputJsonObject,
    measuredAt: new Date(),
  };
}

async function rerunPassageFirstLook(args: {
  passageId: string;
  passageText: string;
  audit: PassageAuditResult;
  metadata: Record<string, unknown>;
}) {
  const review = await runAIFirstLookReview({
    artifactType: "PASSAGE",
    artifactId: args.passageId,
    metadata: args.metadata,
    contentForReview: {
      passageText: args.passageText,
      contentAuditJson: args.audit,
    },
  });
  if (!review.modelDecisionId) {
    throw new Error("AI first-look rerun did not persist a ModelDecision.");
  }
  await db.passage.update({
    where: { id: args.passageId },
    data: {
      firstLookReviewModelDecisionId: review.modelDecisionId,
      sourceMetadataJson: {
        ...passageSourceMetadata((await db.passage.findUnique({ where: { id: args.passageId }, select: { sourceMetadataJson: true } }))?.sourceMetadataJson),
        firstLookStale: false,
      } as Prisma.InputJsonValue,
    },
  });
}

function auditFailures(audit: PassageAuditResult) {
  const failures: string[] = [];
  if (!audit.wordCountWithinBand) failures.push("wordCountWithinBand failed");
  if (audit.unclassifiedCount !== 0) failures.push(`unclassified words: ${audit.unclassifiedWords.join(", ")}`);
  if (audit.blockedPatternViolations.length) failures.push(`blocked pattern violations: ${audit.blockedPatternViolations.map((entry) => `${entry.word}/${entry.patternCode}`).join(", ")}`);
  if (audit.decodabilityScore < audit.decodabilityThreshold) failures.push("decodability below threshold");
  if (!audit.quality.passesQualityGate) failures.push("quality gate failed");
  if (audit.quality.repeatedTrigrams.length) failures.push(`repeated trigrams: ${audit.quality.repeatedTrigrams.join(", ")}`);
  if (audit.quality.repeatedSentences.length) failures.push(`repeated sentences: ${audit.quality.repeatedSentences.join(", ")}`);
  if (audit.quality.nearDuplicateExistingPassageIds.length) failures.push(`near duplicates: ${audit.quality.nearDuplicateExistingPassageIds.join(", ")}`);
  return failures;
}

function passageSourceMetadata(value: unknown): Record<string, unknown> {
  return asRecord(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((entry) => String(entry).trim()).filter(Boolean)));
}

function normalizeAllowlist(value: string[]) {
  return Array.from(new Set(value.map((entry) => entry.toLowerCase().trim()).filter(Boolean))).sort();
}

function normalizeReviewStatus(value: string): PassageReviewStatus {
  if (value === "EDITED" || value === "APPROVED" || value === "REJECTED") return value;
  return "PENDING";
}

function firstWords(text: string, count: number) {
  const words = tokenizePassage(text);
  return words.slice(0, count).join(" ") || "Untitled passage";
}

function textSnippet(text: string, count: number) {
  return tokenizePassage(text).slice(0, count).join(" ");
}

function similarityScore(left: string, right: string) {
  const leftWords = new Set(tokenizePassage(left));
  const rightWords = new Set(tokenizePassage(right));
  if (!leftWords.size && !rightWords.size) return 0;
  let intersection = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) intersection += 1;
  }
  return intersection / (leftWords.size + rightWords.size - intersection);
}

async function dailyTargetForPassage(metadata: Record<string, unknown>) {
  if (typeof metadata.dailyTargetId === "string") {
    return db.dailyTarget.findUnique({ where: { id: metadata.dailyTargetId } });
  }
  if (typeof metadata.dailyTargetCode === "string") {
    return db.dailyTarget.findUnique({ where: { code: metadata.dailyTargetCode } });
  }
  return null;
}

async function phasePositionLabels(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, string>();
  const rows = await db.phasePosition.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, label: true, subPosition: true },
  });
  return new Map(rows.map((row) => [row.id, row.label || row.subPosition]));
}

function jsonArray(value: unknown): Prisma.InputJsonArray {
  return Array.isArray(value) ? value as Prisma.InputJsonArray : [];
}

async function canonicalHeartWordsForPhase(phaseNumber: number) {
  const hfw = await db.highFrequencyWord.findMany({
    where: { introducedAtPhase: { lte: phaseNumber } },
    select: { lemma: true, forms: true },
  });
  return hfw.flatMap((entry) => [entry.lemma, ...entry.forms]);
}

async function passageApprovalDetail(passageId: string) {
  const approval = await canApprovePassage(passageId);
  return { approvable: approval.canApprove, blockers: approval.blockers };
}
