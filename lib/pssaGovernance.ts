import { db } from "@/lib/db";

export const CLEARED_PSSA_LICENSE_STATUSES = [
  "cleared_internal_original",
  "cleared_owned",
  "cleared_open_license",
] as const;

export const STUDENT_READY_PSSA_ITEM_STATUSES = ["pilot_ready", "active"] as const;
export const OFFICIAL_PSSA_SOURCE_TYPES = ["PDE_SAMPLER", "OFFICIAL_RELEASED_ITEM"] as const;
export const SELECTED_CHOICE_ITEM_TYPES = ["MCQ", "CONVENTIONS", "MULTI_SELECT", "EBSR"] as const;
export const OPEN_RESPONSE_ITEM_TYPES = ["TDA", "SHORT_RESPONSE", "OPEN_RESPONSE"] as const;

export type PssaApprovalCheck = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
};

type PssaAuditLike = {
  result?: string | null;
  severity?: string | null;
  ruleId?: string | null;
};

type PssaItemLike = {
  reviewStatus?: string | null;
  itemStatus?: string | null;
  retiredAt?: Date | string | null;
  sourceType?: string | null;
  sourceName?: string | null;
  sourceCitation?: string | null;
  licenseStatus?: string | null;
  commercialUseAllowed?: boolean | null;
  needsLegalReview?: boolean | null;
  standardCode?: string | null;
  assessmentAnchor?: string | null;
  eligibleContent?: string | null;
  itemType?: string | null;
  skill?: string | null;
  correctAnswer?: unknown;
  correctIndex?: number | null;
  expectedResponseJson?: unknown;
  scoringRubricJson?: unknown;
  answerChoicesJson?: unknown;
  studentPreviewJson?: unknown;
  approvedAt?: Date | string | null;
  reviewedBy?: string | null;
  alignmentStatus?: string | null;
  approvalEligible?: boolean | null;
  auditResults?: PssaAuditLike[];
};

type PssaPassageLike = {
  reviewStatus?: string | null;
  itemStatus?: string | null;
  retiredAt?: Date | string | null;
  sourceType?: string | null;
  sourceName?: string | null;
  sourceCitation?: string | null;
  licenseStatus?: string | null;
  commercialUseAllowed?: boolean | null;
  needsLegalReview?: boolean | null;
  approvedAt?: Date | string | null;
  reviewedBy?: string | null;
};

type PssaLessonLike = PssaPassageLike & {
  standardCode?: string | null;
  assessmentAnchor?: string | null;
  eligibleContent?: string | null;
  objective?: string | null;
  lessonPartsJson?: unknown;
  alignmentStatus?: string | null;
  approvalEligible?: boolean | null;
};

export const STUDENT_READY_PSSA_ITEM_WHERE = {
  reviewStatus: "APPROVED",
  itemStatus: { in: ["pilot_ready", "active"] },
  retiredAt: null,
  licenseStatus: { in: [...CLEARED_PSSA_LICENSE_STATUSES] },
  commercialUseAllowed: true,
  needsLegalReview: false,
  approvalEligible: true,
} as const;

export async function getStudentReadyPssaItems(args: any = {}) {
  const items = await db.pssaItem.findMany({
    ...args,
    where: { ...(args.where || {}), ...STUDENT_READY_PSSA_ITEM_WHERE },
    include: {
      auditResults: { orderBy: { createdAt: "desc" }, take: 50 },
      ...(args.include || {}),
    },
  });
  return items.filter(isPssaItemStudentReady);
}

export async function countStudentReadyPssaItems(args: any = {}) {
  const items = await getStudentReadyPssaItems({ ...args, select: undefined });
  return items.length;
}

export async function getStudentReadyPssaPassages(args: any = {}) {
  const passages = await db.pssaPassage.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      reviewStatus: "APPROVED",
      itemStatus: { in: ["pilot_ready", "active"] },
      retiredAt: null,
      licenseStatus: { in: [...CLEARED_PSSA_LICENSE_STATUSES] },
      commercialUseAllowed: true,
      needsLegalReview: false,
    },
  });
  return passages.filter((passage) => canApprovePssaPassage(passage).ok);
}

export async function getStudentReadyPssaLessons(args: any = {}) {
  const lessons = await db.pssaLesson.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      reviewStatus: "APPROVED",
      itemStatus: { in: ["pilot_ready", "active"] },
      retiredAt: null,
      licenseStatus: { in: [...CLEARED_PSSA_LICENSE_STATUSES] },
      alignmentStatus: "ALIGNED",
      approvalEligible: true,
    },
  });
  return lessons.filter((lesson) => canApprovePssaLesson(lesson).ok);
}

export function isPssaItemStudentReady(item: PssaItemLike) {
  return canApprovePssaItem(item).ok && item.reviewStatus === "APPROVED" && item.approvalEligible === true;
}

export function canApprovePssaItem(item: PssaItemLike): PssaApprovalCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];
  appendSharedContentBlockers(item, blockers);
  if (!present(item.standardCode)) blockers.push("PSSA_STANDARD_CODE_MISSING");
  if (!present(item.assessmentAnchor)) blockers.push("PSSA_ASSESSMENT_ANCHOR_MISSING");
  if (!present(item.eligibleContent)) blockers.push("PSSA_ELIGIBLE_CONTENT_MISSING");
  if (item.alignmentStatus === "NEEDS_CROSSWALK") blockers.push("PSSA_ALIGNMENT_NEEDS_CROSSWALK");
  if (item.alignmentStatus === "NEEDS_REVIEW") blockers.push("PSSA_ALIGNMENT_NEEDS_REVIEW");
  if (!present(item.itemType)) blockers.push("PSSA_ITEM_TYPE_MISSING");
  if (!present(item.skill)) blockers.push("PSSA_SKILL_MISSING");
  if (isSelectedChoice(item.itemType)) {
    if (item.correctAnswer == null) blockers.push("PSSA_SELECTED_CHOICE_CORRECT_ANSWER_MISSING");
    if (typeof item.correctIndex !== "number") blockers.push("PSSA_SELECTED_CHOICE_CORRECT_INDEX_MISSING");
  }
  if (isOpenResponse(item.itemType) && !jsonPresent(item.scoringRubricJson)) blockers.push("PSSA_SCORING_RUBRIC_MISSING");
  if (!jsonPresent(item.studentPreviewJson)) blockers.push("PSSA_STUDENT_PREVIEW_MISSING");
  if (studentPreviewLeaksAnswer(item)) blockers.push("PSSA_STUDENT_PREVIEW_LEAKS_ANSWER");
  if (hasGenericAnswerChoices(item.answerChoicesJson)) blockers.push("PSSA_GENERIC_ANSWER_CHOICES");
  if (!item.approvedAt) blockers.push("PSSA_APPROVED_AT_MISSING");
  if (!present(item.reviewedBy)) blockers.push("PSSA_REVIEWED_BY_MISSING");
  appendAuditBlockers(item.auditResults, blockers);
  appendOfficialSourceBlockers(item, blockers);
  if (item.reviewStatus !== "APPROVED") warnings.push("PSSA_REVIEW_STATUS_NOT_APPROVED");
  if (!STUDENT_READY_PSSA_ITEM_STATUSES.includes(String(item.itemStatus) as any)) warnings.push("PSSA_ITEM_STATUS_NOT_STUDENT_READY");
  if (item.retiredAt) blockers.push("PSSA_RETIRED");
  return { ok: blockers.length === 0, blockers, warnings };
}

export function canApprovePssaPassage(passage: PssaPassageLike): PssaApprovalCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];
  appendSharedContentBlockers(passage, blockers);
  appendOfficialSourceBlockers(passage, blockers);
  if (!passage.approvedAt) blockers.push("PSSA_APPROVED_AT_MISSING");
  if (!present(passage.reviewedBy)) blockers.push("PSSA_REVIEWED_BY_MISSING");
  if (passage.retiredAt) blockers.push("PSSA_RETIRED");
  if (passage.reviewStatus !== "APPROVED") warnings.push("PSSA_REVIEW_STATUS_NOT_APPROVED");
  return { ok: blockers.length === 0, blockers, warnings };
}

export function canApprovePssaLesson(lesson: PssaLessonLike): PssaApprovalCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];
  appendSharedContentBlockers(lesson, blockers);
  if (!present(lesson.standardCode)) blockers.push("PSSA_STANDARD_CODE_MISSING");
  if (!present(lesson.assessmentAnchor)) blockers.push("PSSA_ASSESSMENT_ANCHOR_MISSING");
  if (!present(lesson.eligibleContent)) blockers.push("PSSA_ELIGIBLE_CONTENT_MISSING");
  if (lesson.alignmentStatus === "NEEDS_CROSSWALK") blockers.push("PSSA_ALIGNMENT_NEEDS_CROSSWALK");
  if (lesson.alignmentStatus === "NEEDS_REVIEW") blockers.push("PSSA_ALIGNMENT_NEEDS_REVIEW");
  if (lesson.approvalEligible !== true) blockers.push("PSSA_APPROVAL_ELIGIBLE_FALSE");
  if (!present(lesson.objective)) blockers.push("PSSA_LESSON_OBJECTIVE_MISSING");
  if (!jsonPresent(lesson.lessonPartsJson)) blockers.push("PSSA_LESSON_PARTS_MISSING");
  appendOfficialSourceBlockers(lesson, blockers);
  if (!lesson.approvedAt) blockers.push("PSSA_APPROVED_AT_MISSING");
  if (!present(lesson.reviewedBy)) blockers.push("PSSA_REVIEWED_BY_MISSING");
  if (lesson.retiredAt) blockers.push("PSSA_RETIRED");
  if (lesson.reviewStatus !== "APPROVED") warnings.push("PSSA_REVIEW_STATUS_NOT_APPROVED");
  return { ok: blockers.length === 0, blockers, warnings };
}

function appendSharedContentBlockers(item: PssaPassageLike, blockers: string[]) {
  if (!present(item.sourceType) || item.sourceType === "unknown") blockers.push("PSSA_SOURCE_TYPE_MISSING_OR_UNKNOWN");
  if (!CLEARED_PSSA_LICENSE_STATUSES.includes(String(item.licenseStatus) as any)) blockers.push("PSSA_LICENSE_NOT_CLEARED");
  if (item.commercialUseAllowed !== true) blockers.push("PSSA_COMMERCIAL_USE_NOT_ALLOWED");
  if (item.needsLegalReview === true) blockers.push("PSSA_NEEDS_LEGAL_REVIEW");
}

function appendOfficialSourceBlockers(item: PssaPassageLike, blockers: string[]) {
  if (!OFFICIAL_PSSA_SOURCE_TYPES.includes(String(item.sourceType) as any)) return;
  if (!present(item.sourceName) || !present(item.sourceCitation)) {
    blockers.push("PSSA_OFFICIAL_SOURCE_REQUIRES_NAME_AND_CITATION");
  }
  if (item.commercialUseAllowed !== true || item.needsLegalReview !== false) {
    blockers.push("PSSA_OFFICIAL_SOURCE_FLAG_NOT_CLEARED");
  }
}

function appendAuditBlockers(results: PssaAuditLike[] | undefined, blockers: string[]) {
  if (!results?.length) {
    blockers.push("PSSA_AUDIT_RUN_MISSING");
    return;
  }
  const latestByRule = new Map<string, PssaAuditLike>();
  for (const result of results) {
    const ruleId = result.ruleId || "UNKNOWN_RULE";
    if (!latestByRule.has(ruleId)) latestByRule.set(ruleId, result);
  }
  for (const result of latestByRule.values()) {
    if (result.result === "FAIL" && result.severity === "BLOCKER") blockers.push(`PSSA_AUDIT_BLOCKER_${result.ruleId || "UNKNOWN_RULE"}`);
  }
}

function studentPreviewLeaksAnswer(item: PssaItemLike) {
  if (!jsonPresent(item.studentPreviewJson)) return false;
  const preview = item.studentPreviewJson as any;
  if (!preview || typeof preview !== "object") return false;
  return Object.keys(preview).some((key) => /correct|answerKey|rationale/i.test(key));
}

function hasGenericAnswerChoices(answerChoicesJson: unknown) {
  if (!Array.isArray(answerChoicesJson)) return false;
  const normalized = answerChoicesJson.map((choice) => String(choice).trim().toLowerCase());
  const generic = new Set(["all of the above", "none of the above", "a", "b", "c", "d", "answer a", "answer b", "answer c", "answer d"]);
  return normalized.some((choice) => generic.has(choice));
}

function isSelectedChoice(itemType: unknown) {
  return SELECTED_CHOICE_ITEM_TYPES.includes(String(itemType) as any);
}

function isOpenResponse(itemType: unknown) {
  return OPEN_RESPONSE_ITEM_TYPES.includes(String(itemType) as any);
}

function present(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

function jsonPresent(value: unknown) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}
