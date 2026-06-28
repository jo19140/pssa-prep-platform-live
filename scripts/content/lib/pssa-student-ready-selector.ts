import type { PrismaClient } from "@prisma/client";

import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./pssa-import-plan";

export type StudentReadyBlockedReason =
  | "NONE"
  | "PENDING_REVIEW"
  | "STALE_AUDIT_CONTRACT"
  | "STALE_SOURCE_SCAN"
  | "CONTENT_HASH_DRIFT"
  | "FAILED_LATEST_AUDIT"
  | "DEPRECATED_SUPERSEDED"
  | "MISSING_RESPONSE_DOMAIN";

export type PssaReadyBatch = {
  id?: string;
  auditContractVersion?: string | null;
  sourceScanVersion?: string | null;
  sourceCorpusHash?: string | null;
  batchAuditResult?: string | null;
} | null;

export type PssaReadyContent = {
  id: string;
  reviewStatus?: string | null;
  itemStatus?: string | null;
  approvalEligible?: boolean | null;
  approvedContentHash?: string | null;
  studentReadyBlockedReason?: string | null;
  auditContractVersion?: string | null;
  sourceScanVersion?: string | null;
  contentHash?: string | null;
  latestAuditContentHash?: string | null;
  latestAuditResult?: string | null;
  sourceType?: string | null;
  licenseStatus?: string | null;
  commercialUseAllowed?: boolean | null;
  needsLegalReview?: boolean | null;
  deprecatedReason?: string | null;
  retiredAt?: Date | string | null;
};

export type PssaReadyPassage = Omit<PssaReadyContent, "approvalEligible" | "deprecatedReason">;

export type PssaReadyItem = PssaReadyContent & {
  interactionType?: string | null;
  responseSpecJson?: unknown;
  batchId?: string | null;
  batch?: PssaReadyBatch;
  passageGroupId?: string | null;
  isCrossText?: boolean | null;
  requiredEvidenceSlotsJson?: unknown;
  crossTextSupportRuleJson?: unknown;
  structuredChoicesJson?: Array<{ isCorrect?: boolean; evidenceLinks?: Array<Record<string, unknown>> }> | null;
  acceptableTextSupport?: unknown;
  acceptableSupportEvidenceLinks?: Array<Record<string, unknown>>;
  scoreBandExamples?: unknown;
  passages?: Array<{ passageId?: string | null; passage?: PssaReadyPassage | null }>;
  passageGroup?: { members?: Array<{ passageId?: string | null; passage?: PssaReadyPassage | null; slot?: string | null }> } | null;
};

export type StudentReadyExplanation = {
  reason: StudentReadyBlockedReason;
  detail: string;
};

export type StudentReadySelectorFilters = {
  gradeLevel?: number;
  subject?: string;
  batchId?: string;
  itemIds?: string[];
  interactionType?: string;
};

function legalFailure(row: PssaReadyContent | PssaReadyPassage) {
  if (row.licenseStatus !== "cleared") return "license_not_cleared";
  if (row.needsLegalReview) return "needs_legal_review";
  if (!row.commercialUseAllowed) return "commercial_use_not_allowed";
  return null;
}

export function explainPssaPassageStudentReadiness(passage: PssaReadyPassage): StudentReadyExplanation {
  if (passage.reviewStatus !== "APPROVED") return { reason: "PENDING_REVIEW", detail: "reviewStatus_not_APPROVED" };
  if (passage.itemStatus !== "pilot_ready") return { reason: "PENDING_REVIEW", detail: "itemStatus_not_pilot_ready" };
  if (passage.studentReadyBlockedReason !== "NONE") return { reason: "PENDING_REVIEW", detail: "stored_blocked_reason_not_NONE" };
  if (!passage.approvedContentHash) return { reason: "CONTENT_HASH_DRIFT", detail: "approvedContentHash_missing" };
  if (passage.auditContractVersion !== AUDIT_CONTRACT_VERSION) return { reason: "STALE_AUDIT_CONTRACT", detail: "audit_contract_version_stale" };
  if (passage.sourceScanVersion !== SOURCE_SCAN_VERSION) return { reason: "STALE_SOURCE_SCAN", detail: "source_scan_version_stale" };
  if (passage.contentHash !== passage.latestAuditContentHash) return { reason: "CONTENT_HASH_DRIFT", detail: "latest_audit_content_hash_mismatch" };
  if (passage.contentHash !== passage.approvedContentHash) return { reason: "CONTENT_HASH_DRIFT", detail: "approved_content_hash_mismatch" };
  if (passage.latestAuditResult !== "PASS") return { reason: "FAILED_LATEST_AUDIT", detail: "latest_audit_result_not_PASS" };
  if (passage.retiredAt) return { reason: "DEPRECATED_SUPERSEDED", detail: "retired_at_present" };
  const legal = legalFailure(passage);
  if (legal) return { reason: "PENDING_REVIEW", detail: legal };
  return { reason: "NONE", detail: "ready" };
}

export function explainPssaItemStudentReadiness(item: PssaReadyItem): StudentReadyExplanation {
  if (item.reviewStatus !== "APPROVED") return { reason: "PENDING_REVIEW", detail: "reviewStatus_not_APPROVED" };
  if (item.itemStatus === "deprecated_superseded" || item.deprecatedReason) return { reason: "DEPRECATED_SUPERSEDED", detail: "deprecated_superseded" };
  if (item.itemStatus === "retired" || item.retiredAt) return { reason: "DEPRECATED_SUPERSEDED", detail: "retired" };
  if (item.itemStatus !== "pilot_ready") return { reason: "PENDING_REVIEW", detail: "itemStatus_not_pilot_ready" };
  if (!item.approvalEligible) return { reason: "PENDING_REVIEW", detail: "approvalEligible_false" };
  if (item.studentReadyBlockedReason !== "NONE") return { reason: "PENDING_REVIEW", detail: "stored_blocked_reason_not_NONE" };
  if (!item.approvedContentHash) return { reason: "CONTENT_HASH_DRIFT", detail: "approvedContentHash_missing" };
  if (item.auditContractVersion !== AUDIT_CONTRACT_VERSION) return { reason: "STALE_AUDIT_CONTRACT", detail: "audit_contract_version_stale" };
  if (item.sourceScanVersion !== SOURCE_SCAN_VERSION) return { reason: "STALE_SOURCE_SCAN", detail: "source_scan_version_stale" };
  if (item.contentHash !== item.latestAuditContentHash) return { reason: "CONTENT_HASH_DRIFT", detail: "latest_audit_content_hash_mismatch" };
  if (item.contentHash !== item.approvedContentHash) return { reason: "CONTENT_HASH_DRIFT", detail: "approved_content_hash_mismatch" };
  if (item.latestAuditResult !== "PASS") return { reason: "FAILED_LATEST_AUDIT", detail: "latest_audit_result_not_PASS" };
  const legal = legalFailure(item);
  if (legal) return { reason: "PENDING_REVIEW", detail: legal };
  if (!hasMachineScorableResponseDomain(item.interactionType, item.responseSpecJson)) return { reason: "MISSING_RESPONSE_DOMAIN", detail: "missing_response_domain" };

  if (item.batchId) {
    if (!item.batch) return { reason: "PENDING_REVIEW", detail: "batch_missing" };
    if (item.batch.auditContractVersion !== AUDIT_CONTRACT_VERSION) return { reason: "STALE_AUDIT_CONTRACT", detail: "batch_audit_contract_version_stale" };
    if (item.batch.sourceScanVersion !== SOURCE_SCAN_VERSION) return { reason: "STALE_SOURCE_SCAN", detail: "batch_source_scan_version_stale" };
    if (!item.batch.sourceCorpusHash) return { reason: "CONTENT_HASH_DRIFT", detail: "batch_source_corpus_hash_missing" };
    if (item.batch.batchAuditResult !== "PASS") return { reason: "FAILED_LATEST_AUDIT", detail: "batch_audit_result_not_PASS" };
  }

  for (const link of item.passages ?? []) {
    if (!link.passage) return { reason: "PENDING_REVIEW", detail: "linked_passage_missing" };
    const passage = explainPssaPassageStudentReadiness(link.passage);
    if (passage.reason !== "NONE") return { reason: passage.reason, detail: `linked_passage_${link.passage.id}_${passage.detail}` };
  }

  if (item.passageGroupId) {
    const members = item.passageGroup?.members ?? [];
    if (!members.length) return { reason: "PENDING_REVIEW", detail: "passage_group_members_missing" };
    for (const member of members) {
      if (!member.passage) return { reason: "PENDING_REVIEW", detail: `passage_group_member_${member.slot ?? "unknown"}_missing` };
      const passage = explainPssaPassageStudentReadiness(member.passage);
      if (passage.reason !== "NONE") return { reason: passage.reason, detail: `passage_group_member_${member.slot ?? member.passage.id}_${passage.detail}` };
    }
    if (!pairedRequiredEvidenceSlotsCovered(item)) return { reason: "PENDING_REVIEW", detail: "required_evidence_slots_not_covered" };
  }

  return { reason: "NONE", detail: "ready" };
}

function pairedRequiredEvidenceSlotsCovered(item: PssaReadyItem) {
  const required = requiredEvidenceSlots(item);
  if (!required.length) return !item.isCrossText;
  const members = item.passageGroup?.members ?? [];
  if (!members.length) return false;
  if (members.some((member) => !String(member.slot ?? "").trim())) return false;

  const linkedPassageIds = new Set(
    (item.passages ?? [])
      .map((link) => String(link.passage?.id ?? link.passageId ?? ""))
      .filter(Boolean),
  );

  for (const slot of required) {
    const member = members.find((row) => String(row.slot) === slot);
    if (!member?.passage) return false;
    if (explainPssaPassageStudentReadiness(member.passage).reason !== "NONE") return false;
    const memberPassageId = String(member.passage.id ?? member.passageId ?? "");
    if (!memberPassageId || !linkedPassageIds.has(memberPassageId)) return false;
  }

  return true;
}

function requiredEvidenceSlots(item: PssaReadyItem) {
  const direct = Array.isArray(item.requiredEvidenceSlotsJson) ? item.requiredEvidenceSlotsJson.map(String) : [];
  const rule = objectSource(item.crossTextSupportRuleJson);
  const fromRule = Array.isArray(rule.requiredPassageSlots) ? rule.requiredPassageSlots.map(String) : [];
  return Array.from(new Set([...direct, ...fromRule]));
}

function hasMachineScorableResponseDomain(interactionType: string | null | undefined, responseSpecJson: unknown) {
  const type = String(interactionType ?? "").toUpperCase();
  if (type === "SHORT_ANSWER" || type === "TDA") return true;
  const spec = objectSource(responseSpecJson);
  if (type === "MCQ" || type === "CONVENTIONS" || type === "MULTI_SELECT") return nonEmptyArray(spec.choices);
  if (type === "HOT_TEXT") return nonEmptyArray(spec.selectableSpans);
  if (type === "MATCHING_GRID") return nonEmptyArray(spec.rows) && nonEmptyArray(spec.columns);
  if (type === "DRAG_DROP") return nonEmptyArray(spec.tokens) && nonEmptyArray(spec.targets);
  if (type === "INLINE_DROPDOWN") return nonEmptyArray(spec.blanks) && spec.blanks.every((blank: unknown) => nonEmptyArray(objectSource(blank).options));
  if (type === "EBSR") return nonEmptyArray(objectSource(spec.partA).choices) && nonEmptyArray(objectSource(spec.partB).choices);
  return false;
}

function nonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function objectSource(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

export function computeStudentReadyBlockedReason(item: PssaReadyItem): StudentReadyBlockedReason {
  return explainPssaItemStudentReadiness(item).reason;
}

export async function getStudentReadyPssaItems(db: PrismaClient, filters: StudentReadySelectorFilters = {}) {
  const rows = await db.pssaItem.findMany({
    where: {
      ...(filters.gradeLevel ? { gradeLevel: filters.gradeLevel } : {}),
      ...(filters.subject ? { subject: filters.subject } : {}),
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
      ...(filters.interactionType ? { interactionType: filters.interactionType as any } : {}),
      ...(filters.itemIds?.length ? { id: { in: filters.itemIds } } : {}),
      reviewStatus: "APPROVED",
      itemStatus: "pilot_ready",
    },
    include: {
      batch: true,
      passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } },
      passageGroup: { include: { members: { include: { passage: true }, orderBy: { position: "asc" } } } },
    },
    orderBy: { id: "asc" },
  });
  return rows.filter((item) => computeStudentReadyBlockedReason(item) === "NONE");
}
