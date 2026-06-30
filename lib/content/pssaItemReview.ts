import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import {
  AUDIT_CONTRACT_VERSION,
  GRADE3_EOY_IMPORT_MANIFEST,
  GRADE3_MOY_IMPORT_MANIFEST,
  SOURCE_SCAN_VERSION,
  buildPlan,
  buildPlanForBenchmark,
  stableStringify,
  type PssaImportBenchmark,
} from "@/scripts/content/lib/pssa-import-plan";
import {
  computeStudentReadyBlockedReason,
  explainPssaItemStudentReadiness,
  explainPssaPassageStudentReadiness,
  getStudentReadyPssaItems,
  type PssaReadyItem,
  type PssaReadyPassage,
  type StudentReadyBlockedReason,
} from "@/scripts/content/lib/pssa-student-ready-selector";

export type PssaReviewKind = "item" | "passage";
export type PssaReviewAction = "approve" | "reject" | "revoke";
export type PssaReviewBucket = "eligible_to_approve" | "already_approved_noop" | "refused";

export type PssaReviewClassification = {
  kind: PssaReviewKind;
  id: string;
  batchId: string | null;
  bucket: PssaReviewBucket;
  blockedReason: StudentReadyBlockedReason;
  detail: string;
  sourceType: string | null;
  licenseStatus: string | null;
  writeAction: "approve" | "reject" | "revoke" | "noop" | "refused";
};

export type PssaReviewMutationInput = {
  id: string;
  kind: PssaReviewKind;
  reviewerUserId: string;
  reason: string;
  attestLicenseCleared?: boolean;
  allowApprovedReject?: boolean;
};

export type PssaReviewMutationResult =
  | {
      ok: true;
      id: string;
      kind: PssaReviewKind;
      newReviewStatus: string;
      newItemStatus: string;
      studentReadyBlockedReason: string;
      noop: boolean;
    }
  | {
      ok: false;
      status: number;
      id?: string;
      kind?: PssaReviewKind;
      blockedReason: StudentReadyBlockedReason;
      detail: string;
    };

export type PssaReviewQueueFilter = {
  gradeLevel?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
};

export type PssaReviewQueueDto = {
  counts: {
    pendingPassages: number;
    pendingItems: number;
    approved: number;
    studentReady: number;
  };
  passages: PssaPassageReviewDto[];
  items: PssaItemReviewDto[];
};

export type PssaPassageReviewDto = {
  id: string;
  kind: "passage";
  passageType: string;
  gradeLevel: number;
  reviewStatus: string;
  studentReadyBlockedReason: string;
  studentPreview: Record<string, unknown>;
  reviewer: Record<string, unknown>;
};

export type PssaItemReviewDto = {
  id: string;
  kind: "item";
  interactionType: string;
  interactionSubtype: string | null;
  eligibleContent: string | null;
  batchId: string | null;
  pointValue: number;
  gradeLevel: number;
  reviewStatus: string;
  studentReadyBlockedReason: string;
  passageApproved: boolean;
  studentPreview: Record<string, unknown>;
  reviewer: Record<string, unknown>;
};

export function currentPlanSourceCorpusHash(gradeLevel: number, benchmark: PssaImportBenchmark = "foundation") {
  const plan = benchmark === "foundation" ? buildPlan(gradeLevel) : buildPlanForBenchmark({ grade: gradeLevel, benchmark });
  return stableStringify([...plan.passages.map((row) => row.contentHash), ...plan.activeItems.map((row) => row.contentHash), ...plan.deprecatedItems.map((row) => row.contentHash)].sort());
}

export function benchmarkForBatchId(batchId: string | null | undefined): PssaImportBenchmark {
  if (!batchId) return "foundation";
  const eoyBatchIds = new Set(Object.values(GRADE3_EOY_IMPORT_MANIFEST.batchIds).filter(Boolean));
  if (eoyBatchIds.has(batchId)) return "eoy";
  const moyBatchIds = new Set(Object.values(GRADE3_MOY_IMPORT_MANIFEST.batchIds).filter(Boolean));
  return moyBatchIds.has(batchId) ? "moy" : "foundation";
}

export function classifyPssaItemForReview(
  item: PssaReadyItem,
  options: { action?: PssaReviewAction; attestLicenseCleared?: boolean; batchDriftDetail?: string | null } = {},
): PssaReviewClassification {
  const action = options.action ?? "approve";
  const ready = explainPssaItemStudentReadiness(item);
  if (action === "approve" && ready.reason === "NONE") {
    return reviewRow("item", item, "already_approved_noop", "NONE", "already_student_ready", "noop");
  }
  if (action === "revoke") {
    if (item.reviewStatus === "APPROVED" || item.itemStatus === "pilot_ready" || item.approvedContentHash) {
      return reviewRow("item", item, "eligible_to_approve", "PENDING_REVIEW", "eligible_to_revoke", "revoke");
    }
    return reviewRow("item", item, "already_approved_noop", "PENDING_REVIEW", "already_not_approved", "noop");
  }
  if (action === "reject") {
    if (item.reviewStatus === "REJECTED" && item.itemStatus === "candidate") {
      return reviewRow("item", item, "already_approved_noop", "PENDING_REVIEW", "already_rejected", "noop");
    }
    return reviewRow("item", item, "eligible_to_approve", "PENDING_REVIEW", "eligible_to_reject", "reject");
  }
  if (options.batchDriftDetail) {
    return reviewRow("item", item, "refused", "CONTENT_HASH_DRIFT", options.batchDriftDetail, "refused");
  }
  if (item.reviewStatus !== "PENDING" || item.itemStatus !== "candidate" || item.studentReadyBlockedReason !== "PENDING_REVIEW" || item.approvalEligible) {
    return reviewRow("item", item, "refused", ready.reason, `strict_noop_failed_${ready.detail}`, "refused");
  }
  const checks = baseApprovalChecks(item, options);
  if (!checks.ok) return reviewRow("item", item, "refused", checks.reason, checks.detail, "refused");
  return reviewRow("item", item, "eligible_to_approve", "NONE", checks.detail, "approve");
}

export function classifyPssaPassageForReview(
  passage: PssaReadyPassage,
  options: { action?: PssaReviewAction; attestLicenseCleared?: boolean } = {},
): PssaReviewClassification {
  const action = options.action ?? "approve";
  const ready = explainPssaPassageStudentReadiness(passage);
  if (action === "approve" && ready.reason === "NONE") {
    return reviewRow("passage", passage, "already_approved_noop", "NONE", "already_student_ready", "noop");
  }
  if (action === "revoke") {
    if (passage.reviewStatus === "APPROVED" || passage.itemStatus === "pilot_ready" || passage.approvedContentHash) {
      return reviewRow("passage", passage, "eligible_to_approve", "PENDING_REVIEW", "eligible_to_revoke", "revoke");
    }
    return reviewRow("passage", passage, "already_approved_noop", "PENDING_REVIEW", "already_not_approved", "noop");
  }
  if (action === "reject") {
    if (passage.reviewStatus === "REJECTED" && passage.itemStatus === "candidate") {
      return reviewRow("passage", passage, "already_approved_noop", "PENDING_REVIEW", "already_rejected", "noop");
    }
    return reviewRow("passage", passage, "eligible_to_approve", "PENDING_REVIEW", "eligible_to_reject", "reject");
  }
  if (passage.reviewStatus !== "PENDING" || passage.itemStatus !== "candidate" || passage.studentReadyBlockedReason !== "PENDING_REVIEW") {
    return reviewRow("passage", passage, "refused", ready.reason, `strict_noop_failed_${ready.detail}`, "refused");
  }
  const checks = baseApprovalChecks(passage, options);
  if (!checks.ok) return reviewRow("passage", passage, "refused", checks.reason, checks.detail, "refused");
  return reviewRow("passage", passage, "eligible_to_approve", "NONE", checks.detail, "approve");
}

export async function approvePssaItem(client: PrismaClient, input: PssaReviewMutationInput): Promise<PssaReviewMutationResult> {
  const target = await fetchSingleTarget(client, input.kind, input.id);
  if (!target) return { ok: false, status: 404, blockedReason: "PENDING_REVIEW", detail: `${input.kind}_not_found` };
  const row = input.kind === "item"
    ? classifyPssaItemForReview(target as PssaReadyItem, { action: "approve", attestLicenseCleared: input.attestLicenseCleared })
    : classifyPssaPassageForReview(target as PssaReadyPassage, { action: "approve", attestLicenseCleared: input.attestLicenseCleared });
  return writeReviewMutations(client, [row], [target as PssaReadyItem].filter((value) => input.kind === "item"), [target as PssaReadyPassage].filter((value) => input.kind === "passage"), input);
}

export async function rejectPssaItem(client: PrismaClient, input: PssaReviewMutationInput): Promise<PssaReviewMutationResult> {
  const target = await fetchSingleTarget(client, input.kind, input.id);
  if (!target) return { ok: false, status: 404, blockedReason: "PENDING_REVIEW", detail: `${input.kind}_not_found` };
  if (!input.allowApprovedReject && (target.reviewStatus === "APPROVED" || target.itemStatus === "pilot_ready")) {
    return { ok: false, status: 422, id: input.id, kind: input.kind, blockedReason: "PENDING_REVIEW", detail: "Use CLI revoke; web revoke is out of scope for DB-5.1." };
  }
  if (!input.allowApprovedReject && (target.reviewStatus !== "PENDING" || target.itemStatus !== "candidate")) {
    return { ok: false, status: 422, id: input.id, kind: input.kind, blockedReason: "PENDING_REVIEW", detail: "Web reject only supports PENDING/candidate rows." };
  }
  const row = input.kind === "item"
    ? classifyPssaItemForReview(target as PssaReadyItem, { action: "reject", attestLicenseCleared: input.attestLicenseCleared })
    : classifyPssaPassageForReview(target as PssaReadyPassage, { action: "reject", attestLicenseCleared: input.attestLicenseCleared });
  return writeReviewMutations(client, [row], [target as PssaReadyItem].filter((value) => input.kind === "item"), [target as PssaReadyPassage].filter((value) => input.kind === "passage"), input);
}

export async function writeClassifiedPssaReviews(
  client: PrismaClient,
  rows: PssaReviewClassification[],
  items: PssaReadyItem[],
  passages: PssaReadyPassage[],
  input: Pick<PssaReviewMutationInput, "reviewerUserId" | "reason" | "attestLicenseCleared">,
) {
  const refused = rows.filter((row) => row.bucket === "refused");
  if (refused.length) {
    return { ok: false as const, refused };
  }
  await writeReviewMutations(client, rows, items, passages, {
    id: "",
    kind: "item",
    reviewerUserId: input.reviewerUserId,
    reason: input.reason,
    attestLicenseCleared: input.attestLicenseCleared,
    allowApprovedReject: true,
  });
  return { ok: true as const };
}

export async function getPssaReviewQueue(filter: PssaReviewQueueFilter = {}): Promise<PssaReviewQueueDto> {
  const gradeLevel = filter.gradeLevel ?? 3;
  const status = filter.status ?? "PENDING";
  const [passages, items, counts, studentReady] = await Promise.all([
    db.pssaPassage.findMany({
      where: { gradeLevel, subject: "ELA", reviewStatus: status, retiredAt: null },
      select: passageQueueSelect,
      orderBy: { id: "asc" },
      take: 100,
    }),
    db.pssaItem.findMany({
      where: { gradeLevel, subject: "ELA", reviewStatus: status, retiredAt: null, itemStatus: { not: "deprecated_superseded" } },
      select: itemQueueSelect,
      orderBy: [{ batchId: "asc" }, { id: "asc" }],
      take: 300,
    }),
    getPssaReviewCounts(gradeLevel),
    getStudentReadyPssaItems(db, { gradeLevel, subject: "ELA" }),
  ]);

  return {
    counts: { ...counts, studentReady: studentReady.length },
    passages: passages.map(passageToQueueDto),
    items: items.map(itemToQueueDto),
  };
}

export async function getPssaReviewCounts(gradeLevel = 3) {
  const [pendingPassages, pendingItems, approvedPassages, approvedItems] = await Promise.all([
    db.pssaPassage.count({ where: { gradeLevel, subject: "ELA", reviewStatus: "PENDING", retiredAt: null } }),
    db.pssaItem.count({ where: { gradeLevel, subject: "ELA", reviewStatus: "PENDING", retiredAt: null, itemStatus: { not: "deprecated_superseded" } } }),
    db.pssaPassage.count({ where: { gradeLevel, subject: "ELA", reviewStatus: "APPROVED", retiredAt: null } }),
    db.pssaItem.count({ where: { gradeLevel, subject: "ELA", reviewStatus: "APPROVED", retiredAt: null, itemStatus: { not: "deprecated_superseded" } } }),
  ]);
  return { pendingPassages, pendingItems, approved: approvedPassages + approvedItems };
}

export async function fetchPssaReviewTargets(client: PrismaClient, args: { target: "item" | "passage" | "passages" | "batch"; itemId?: string | null; passageId?: string | null; batchId?: string | null; gradeLevel?: number | null }) {
  if (args.target === "passage") {
    const passage = await client.pssaPassage.findUnique({ where: { id: args.passageId! } });
    if (!passage) throw new Error(`PssaPassage not found: ${args.passageId}`);
    return { items: [] as PssaReadyItem[], passages: [passage as PssaReadyPassage] };
  }
  if (args.target === "passages") {
    return { items: [] as PssaReadyItem[], passages: await client.pssaPassage.findMany({ where: { gradeLevel: args.gradeLevel!, subject: "ELA" }, orderBy: { id: "asc" } }) as PssaReadyPassage[] };
  }
  if (args.target === "item") {
    const item = await client.pssaItem.findUnique({ where: { id: args.itemId! }, include: { batch: true, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } }, passageGroup: { include: { members: { include: { passage: true }, orderBy: { position: "asc" } } } } } });
    if (!item) throw new Error(`PssaItem not found: ${args.itemId}`);
    return { items: [item as PssaReadyItem], passages: [] as PssaReadyPassage[] };
  }
  const batch = await client.pssaItemBatch.findUnique({ where: { id: args.batchId! } });
  if (!batch) throw new Error(`PssaItemBatch not found: ${args.batchId}`);
  return {
    items: await client.pssaItem.findMany({ where: { batchId: args.batchId! }, include: { batch: true, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } }, passageGroup: { include: { members: { include: { passage: true }, orderBy: { position: "asc" } } } } }, orderBy: { id: "asc" } }) as PssaReadyItem[],
    passages: [] as PssaReadyPassage[],
  };
}

export async function pssaBatchDriftDetail(client: PrismaClient, args: { target: string; action: string; batchId?: string | null }) {
  if (args.target !== "batch" || args.action !== "approve") return null;
  const batch = await client.pssaItemBatch.findUnique({ where: { id: args.batchId! }, select: { gradeLevel: true, sourceCorpusHash: true, auditContractVersion: true, sourceScanVersion: true, batchAuditResult: true } });
  if (!batch) return "batch_missing";
  if (batch.auditContractVersion !== AUDIT_CONTRACT_VERSION) return "batch_audit_contract_version_stale";
  if (batch.sourceScanVersion !== SOURCE_SCAN_VERSION) return "batch_source_scan_version_stale";
  if (batch.batchAuditResult !== "PASS") return "batch_audit_result_not_PASS";
  const benchmark = benchmarkForBatchId(args.batchId);
  const currentHash = currentPlanSourceCorpusHash(batch.gradeLevel, benchmark);
  if (!batch.sourceCorpusHash) return "batch_source_corpus_hash_missing";
  if (batch.sourceCorpusHash !== currentHash) return "batch_source_corpus_hash_drift";
  return null;
}

export function pssaMinimalMutationResponse(result: Extract<PssaReviewMutationResult, { ok: true }>, refreshedStudentReadyCount: number) {
  return {
    id: result.id,
    kind: result.kind,
    newReviewStatus: result.newReviewStatus,
    newItemStatus: result.newItemStatus,
    studentReadyBlockedReason: result.studentReadyBlockedReason,
    refreshedStudentReadyCount,
  };
}

export function pssaNoStoreHeaders(headers: HeadersInit = {}) {
  return { ...headers, "Cache-Control": "no-store, private" };
}

export function validatePssaReviewDtoAllowlist(payload: unknown) {
  const forbidden = [
    "responseSpecJson",
    "correctResponseJson",
    "scoringJson",
    "provenanceJson",
    "sourceCorpusManifestJson",
    "auditResults",
    "latestAuditContentHash",
    "approvedContentHash",
    "contentHash",
    "passages",
    "batch",
  ];
  const seen = new Set<string>();
  collectKeys(stripReviewerBlocks(payload), seen, 0);
  const found = forbidden.filter((needle) => seen.has(needle));
  return { ok: found.length === 0, forbidden: found };
}

function reviewRow(kind: PssaReviewKind, row: PssaReadyItem | PssaReadyPassage, bucket: PssaReviewBucket, blockedReason: StudentReadyBlockedReason, detail: string, writeAction: PssaReviewClassification["writeAction"]): PssaReviewClassification {
  return {
    kind,
    id: row.id,
    batchId: "batchId" in row ? row.batchId ?? null : null,
    bucket,
    blockedReason,
    detail,
    sourceType: row.sourceType ?? null,
    licenseStatus: row.licenseStatus ?? null,
    writeAction,
  };
}

function canAttestLicense(row: { sourceType?: string | null }) {
  return row.sourceType === "internal_original";
}

function legalReady(row: { sourceType?: string | null; licenseStatus?: string | null; commercialUseAllowed?: boolean | null; needsLegalReview?: boolean | null }, options: { attestLicenseCleared?: boolean }) {
  if (row.licenseStatus === "cleared" && row.commercialUseAllowed && !row.needsLegalReview) return { ok: true, detail: "legal_ready" };
  if (!options.attestLicenseCleared) return { ok: false, detail: "license_not_attested" };
  if (!canAttestLicense(row)) return { ok: false, detail: "attestation_forbidden_for_source_type" };
  return { ok: true, detail: "legal_attested_internal_original" };
}

function baseApprovalChecks(row: PssaReadyItem | PssaReadyPassage, options: { attestLicenseCleared?: boolean }) {
  if (row.reviewStatus === "REJECTED") return { ok: false as const, reason: "PENDING_REVIEW" as const, detail: "reviewStatus_REJECTED" };
  if ("deprecatedReason" in row && row.deprecatedReason) return { ok: false as const, reason: "DEPRECATED_SUPERSEDED" as const, detail: "deprecated_superseded" };
  if (row.itemStatus === "deprecated_superseded" || row.itemStatus === "retired" || row.retiredAt) return { ok: false as const, reason: "DEPRECATED_SUPERSEDED" as const, detail: "deprecated_or_retired" };
  if (row.auditContractVersion !== AUDIT_CONTRACT_VERSION) return { ok: false as const, reason: "STALE_AUDIT_CONTRACT" as const, detail: "audit_contract_version_stale" };
  if (row.sourceScanVersion !== SOURCE_SCAN_VERSION) return { ok: false as const, reason: "STALE_SOURCE_SCAN" as const, detail: "source_scan_version_stale" };
  if (row.contentHash !== row.latestAuditContentHash) return { ok: false as const, reason: "CONTENT_HASH_DRIFT" as const, detail: "latest_audit_content_hash_mismatch" };
  if (row.latestAuditResult !== "PASS") return { ok: false as const, reason: "FAILED_LATEST_AUDIT" as const, detail: "latest_audit_result_not_PASS" };
  const legal = legalReady(row, options);
  if (!legal.ok) return { ok: false as const, reason: "PENDING_REVIEW" as const, detail: legal.detail };
  return { ok: true as const, reason: "NONE" as const, detail: legal.detail };
}

function logAction(writeAction: string) {
  if (writeAction === "approve") return "APPROVED";
  if (writeAction === "reject") return "REJECTED";
  if (writeAction === "revoke") return "REVOKED";
  return writeAction.toUpperCase();
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function approvalData(row: PssaReadyItem | PssaReadyPassage, input: PssaReviewMutationInput) {
  const legalAttested = input.attestLicenseCleared && canAttestLicense(row);
  return {
    reviewStatus: "APPROVED" as const,
    itemStatus: "pilot_ready" as const,
    approvedAt: new Date(),
    reviewedBy: input.reviewerUserId,
    approvedContentHash: row.contentHash,
    studentReadyBlockedReason: "NONE" as const,
    ...(legalAttested ? { licenseStatus: "cleared" as const, needsLegalReview: false, commercialUseAllowed: true } : {}),
  };
}

function rejectionData(input: PssaReviewMutationInput) {
  return {
    reviewStatus: "REJECTED" as const,
    itemStatus: "candidate" as const,
    approvedAt: null,
    reviewedBy: input.reviewerUserId,
    approvedContentHash: null,
    studentReadyBlockedReason: "PENDING_REVIEW" as const,
  };
}

function revocationData(input: PssaReviewMutationInput) {
  return {
    reviewStatus: "PENDING" as const,
    itemStatus: "candidate" as const,
    approvedAt: null,
    reviewedBy: input.reviewerUserId,
    approvedContentHash: null,
    studentReadyBlockedReason: "PENDING_REVIEW" as const,
  };
}

async function writeReviewMutations(
  client: PrismaClient,
  rows: PssaReviewClassification[],
  items: PssaReadyItem[],
  passages: PssaReadyPassage[],
  input: PssaReviewMutationInput,
): Promise<PssaReviewMutationResult> {
  const refused = rows.find((row) => row.bucket === "refused");
  if (refused) return { ok: false, status: 422, id: refused.id, kind: refused.kind, blockedReason: refused.blockedReason, detail: refused.detail };
  const actionable = rows.filter((row) => row.bucket === "eligible_to_approve");
  if (!actionable.length) {
    const row = rows[0];
    const target = row?.kind === "passage" ? passages.find((passage) => passage.id === row.id) : items.find((item) => item.id === row?.id);
    return {
      ok: true,
      id: row?.id ?? input.id,
      kind: row?.kind ?? input.kind,
      newReviewStatus: target?.reviewStatus ?? "UNKNOWN",
      newItemStatus: target?.itemStatus ?? "UNKNOWN",
      studentReadyBlockedReason: target?.studentReadyBlockedReason ?? "PENDING_REVIEW",
      noop: true,
    };
  }

  let last: Extract<PssaReviewMutationResult, { ok: true }> | null = null;
  const byItem = new Map(items.map((item) => [item.id, item]));
  const byPassage = new Map(passages.map((passage) => [passage.id, passage]));
  await client.$transaction(async (tx) => {
    for (const row of actionable) {
      const action = logAction(row.writeAction);
      if (row.kind === "item") {
        const item = byItem.get(row.id)!;
        const data = row.writeAction === "approve"
          ? { ...approvalData(item, input), approvalEligible: true }
          : row.writeAction === "reject"
            ? { ...rejectionData(input), approvalEligible: false }
            : { ...revocationData(input), approvalEligible: false };
        const updated = await tx.pssaItem.update({ where: { id: row.id }, data });
        await tx.pssaReviewLog.create({ data: { itemId: row.id, batchId: row.batchId, action, reviewerUserId: input.reviewerUserId, notes: input.reason, editDiffJson: json({ db5: true, db51: true, writeAction: row.writeAction, detail: row.detail }) } });
        last = { ok: true, id: updated.id, kind: "item", newReviewStatus: updated.reviewStatus, newItemStatus: updated.itemStatus, studentReadyBlockedReason: updated.studentReadyBlockedReason, noop: false };
      } else {
        const passage = byPassage.get(row.id)!;
        const data = row.writeAction === "approve" ? approvalData(passage, input) : row.writeAction === "reject" ? rejectionData(input) : revocationData(input);
        const updated = await tx.pssaPassage.update({ where: { id: row.id }, data });
        await tx.pssaReviewLog.create({ data: { passageId: row.id, action, reviewerUserId: input.reviewerUserId, notes: input.reason, editDiffJson: json({ db5: true, db51: true, writeAction: row.writeAction, detail: row.detail }) } });
        last = { ok: true, id: updated.id, kind: "passage", newReviewStatus: updated.reviewStatus, newItemStatus: updated.itemStatus, studentReadyBlockedReason: updated.studentReadyBlockedReason, noop: false };
      }
    }
  }, { timeout: 60_000 });
  return last!;
}

async function fetchSingleTarget(client: PrismaClient, kind: PssaReviewKind, id: string) {
  if (kind === "passage") return client.pssaPassage.findUnique({ where: { id } });
  return client.pssaItem.findUnique({ where: { id }, include: { batch: true, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } }, passageGroup: { include: { members: { include: { passage: true }, orderBy: { position: "asc" } } } } } });
}

const passageQueueSelect = {
  id: true,
  title: true,
  passageType: true,
  gradeLevel: true,
  reviewStatus: true,
  itemStatus: true,
  studentReadyBlockedReason: true,
  text: true,
  wordCount: true,
  latestAuditResult: true,
  auditContractVersion: true,
  sourceScanVersion: true,
  licenseStatus: true,
  needsLegalReview: true,
  commercialUseAllowed: true,
} satisfies Prisma.PssaPassageSelect;

export const itemQueueSelect = {
  id: true,
  interactionType: true,
  interactionSubtype: true,
  eligibleContent: true,
  batchId: true,
  responseSpecJson: true,
  passageGroupId: true,
  isCrossText: true,
  requiredEvidenceSlotsJson: true,
  crossTextSupportRuleJson: true,
  pointValue: true,
  gradeLevel: true,
  reviewStatus: true,
  itemStatus: true,
  approvalEligible: true,
  studentReadyBlockedReason: true,
  studentPreviewJson: true,
  correctResponseJson: true,
  scoringJson: true,
  latestAuditResult: true,
  auditContractVersion: true,
  sourceScanVersion: true,
  licenseStatus: true,
  needsLegalReview: true,
  commercialUseAllowed: true,
  passages: {
    select: {
      passage: {
        select: {
          id: true,
          title: true,
          reviewStatus: true,
          itemStatus: true,
          studentReadyBlockedReason: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
  passageGroup: {
    select: {
      members: {
        select: {
          slot: true,
          passage: {
            select: {
              id: true,
              reviewStatus: true,
              itemStatus: true,
              studentReadyBlockedReason: true,
              approvedContentHash: true,
              auditContractVersion: true,
              sourceScanVersion: true,
              contentHash: true,
              latestAuditContentHash: true,
              latestAuditResult: true,
              retiredAt: true,
              sourceType: true,
              licenseStatus: true,
              commercialUseAllowed: true,
              needsLegalReview: true,
            },
          },
        },
        orderBy: { position: "asc" as const },
      },
    },
  },
} satisfies Prisma.PssaItemSelect;

export function passageToQueueDto(passage: Prisma.PssaPassageGetPayload<{ select: typeof passageQueueSelect }>): PssaPassageReviewDto {
  return {
    id: passage.id,
    kind: "passage",
    passageType: passage.passageType,
    gradeLevel: passage.gradeLevel,
    reviewStatus: passage.reviewStatus,
    studentReadyBlockedReason: passage.studentReadyBlockedReason,
    studentPreview: {
      title: passage.title,
      text: passage.text,
      wordCount: passage.wordCount,
    },
    reviewer: {
      latestAuditResult: passage.latestAuditResult,
      auditContractVersion: passage.auditContractVersion,
      sourceScanVersion: passage.sourceScanVersion,
      license: {
        licenseStatus: passage.licenseStatus,
        needsLegalReview: passage.needsLegalReview,
        commercialUseAllowed: passage.commercialUseAllowed,
      },
    },
  };
}

export function itemToQueueDto(item: Prisma.PssaItemGetPayload<{ select: typeof itemQueueSelect }>): PssaItemReviewDto {
  return {
    id: item.id,
    kind: "item",
    interactionType: item.interactionType,
    interactionSubtype: item.interactionSubtype,
    eligibleContent: item.eligibleContent,
    batchId: item.batchId,
    pointValue: item.pointValue,
    gradeLevel: item.gradeLevel,
    reviewStatus: item.reviewStatus,
    studentReadyBlockedReason: item.studentReadyBlockedReason,
    passageApproved: item.passages.every((link) => link.passage.reviewStatus === "APPROVED" && link.passage.itemStatus === "pilot_ready"),
    studentPreview: sanitizeStudentPreview(item.studentPreviewJson),
    reviewer: {
      correctResponse: item.correctResponseJson,
      scoring: item.scoringJson,
      gateResults: {
        latestAuditResult: item.latestAuditResult,
        auditContractVersion: item.auditContractVersion,
        sourceScanVersion: item.sourceScanVersion,
        licenseStatus: item.licenseStatus,
        needsLegalReview: item.needsLegalReview,
        commercialUseAllowed: item.commercialUseAllowed,
        computedBlockedReason: computeStudentReadyBlockedReason(item as unknown as PssaReadyItem),
      },
      linkedPassages: item.passages.map((link) => ({
        id: link.passage.id,
        title: link.passage.title,
        reviewStatus: link.passage.reviewStatus,
        itemStatus: link.passage.itemStatus,
        studentReadyBlockedReason: link.passage.studentReadyBlockedReason,
      })),
    },
  };
}

function sanitizeStudentPreview(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const preview = value as Record<string, unknown>;
  const allowed = ["prompt", "stem", "question", "interactionType", "choices", "options", "tokens", "targets", "blanks", "sentences", "passageTitle"];
  return Object.fromEntries(Object.entries(preview).filter(([key]) => allowed.includes(key)));
}

function stripReviewerBlocks(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripReviewerBlocks);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "reviewer")
      .map(([key, child]) => [key, stripReviewerBlocks(child)]));
  }
  return value;
}

function collectKeys(value: unknown, keys: Set<string>, depth: number) {
  if (Array.isArray(value)) {
    for (const child of value) collectKeys(child, keys, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (depth > 0) keys.add(key);
      collectKeys(child, keys, depth + 1);
    }
  }
}
