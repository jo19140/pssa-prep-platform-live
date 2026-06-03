import { Prisma, PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import {
  AUDIT_CONTRACT_VERSION,
  SOURCE_SCAN_VERSION,
  buildPlan,
  stableStringify,
} from "./lib/pssa-import-plan";
import {
  explainPssaItemStudentReadiness,
  explainPssaPassageStudentReadiness,
  getStudentReadyPssaItems,
  type PssaReadyItem,
  type PssaReadyPassage,
} from "./lib/pssa-student-ready-selector";

const REPORT_DIR = path.resolve("reports");

type Target = "item" | "passage" | "passages" | "batch";
type Action = "approve" | "reject" | "revoke";
type Bucket = "eligible_to_approve" | "already_approved_noop" | "refused";
type ContentKind = "item" | "passage";

type Args = {
  target: Target | null;
  itemId: string | null;
  passageId: string | null;
  batchId: string | null;
  gradeLevel: number | null;
  env: string | null;
  reviewer: string | null;
  reason: string | null;
  action: Action;
  write: boolean;
  allowProduction: boolean;
  attestLicenseCleared: boolean;
};

type ReviewRow = {
  kind: ContentKind;
  id: string;
  batchId: string | null;
  bucket: Bucket;
  blockedReason: string;
  detail: string;
  sourceType: string | null;
  licenseStatus: string | null;
  writeAction: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    target: null,
    itemId: null,
    passageId: null,
    batchId: null,
    gradeLevel: null,
    env: null,
    reviewer: null,
    reason: null,
    action: "approve",
    write: false,
    allowProduction: false,
    attestLicenseCleared: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}.`);
      i += 1;
      return value;
    };
    if (arg === "--target") args.target = next() as Target;
    else if (arg.startsWith("--target=")) args.target = arg.slice("--target=".length) as Target;
    else if (arg === "--item") args.itemId = next();
    else if (arg.startsWith("--item=")) args.itemId = arg.slice("--item=".length);
    else if (arg === "--passage") args.passageId = next();
    else if (arg.startsWith("--passage=")) args.passageId = arg.slice("--passage=".length);
    else if (arg === "--batch") args.batchId = next();
    else if (arg.startsWith("--batch=")) args.batchId = arg.slice("--batch=".length);
    else if (arg === "--grade") args.gradeLevel = Number(next());
    else if (arg.startsWith("--grade=")) args.gradeLevel = Number(arg.slice("--grade=".length));
    else if (arg === "--env") args.env = next();
    else if (arg.startsWith("--env=")) args.env = arg.slice("--env=".length);
    else if (arg === "--reviewer") args.reviewer = next();
    else if (arg.startsWith("--reviewer=")) args.reviewer = arg.slice("--reviewer=".length);
    else if (arg === "--reason") args.reason = next();
    else if (arg.startsWith("--reason=")) args.reason = arg.slice("--reason=".length);
    else if (arg === "--action") args.action = next() as Action;
    else if (arg.startsWith("--action=")) args.action = arg.slice("--action=".length) as Action;
    else if (arg === "--write") args.write = true;
    else if (arg === "--dry-run") args.write = false;
    else if (arg === "--allow-production") args.allowProduction = true;
    else if (arg === "--attest-license-cleared") args.attestLicenseCleared = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.target || !["item", "passage", "passages", "batch"].includes(args.target)) throw new Error("--target must be item, passage, passages, or batch.");
  if (!["approve", "reject", "revoke"].includes(args.action)) throw new Error("--action must be approve, reject, or revoke.");
  if (args.target === "item" && !args.itemId) throw new Error("--target item requires --item.");
  if (args.target === "passage" && !args.passageId) throw new Error("--target passage requires --passage.");
  if (args.target === "passages" && !args.gradeLevel) throw new Error("--target passages requires --grade.");
  if (args.target === "batch" && !args.batchId) throw new Error("--target batch requires --batch.");
  if (args.write) {
    if (args.env !== "dev") throw new Error("--write requires explicit --env dev.");
    if (!process.env.DATABASE_URL) throw new Error("--write requires DATABASE_URL.");
    if (!args.reviewer) throw new Error("--write requires --reviewer.");
    const envValues = [process.env.NODE_ENV, process.env.APP_ENV, args.env].filter(Boolean).map((value) => value!.toLowerCase());
    const looksProduction = envValues.some((value) => value.includes("prod") || value === "production");
    if (looksProduction && !args.allowProduction) throw new Error("Refusing production-like environment without --allow-production.");
  }
  return args;
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath: string, rows: Record<string, unknown>[], columns: string[]) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function redactedDbTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) return "DATABASE_URL missing";
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.username ? "(user)" : "(missing-user)"}:${parsed.password ? "(redacted)" : "(missing)"}@${parsed.hostname}:${parsed.port || "(default)"}/${parsed.pathname.replace(/^\//, "")}`;
}

export function currentPlanSourceCorpusHash() {
  const plan = buildPlan();
  return stableStringify([...plan.passages.map((row) => row.contentHash), ...plan.activeItems.map((row) => row.contentHash), ...plan.deprecatedItems.map((row) => row.contentHash)].sort());
}

function canAttestLicense(row: { sourceType?: string | null }) {
  return row.sourceType === "internal_original";
}

function legalReady(row: { sourceType?: string | null; licenseStatus?: string | null; commercialUseAllowed?: boolean | null; needsLegalReview?: boolean | null }, args: Args) {
  if (row.licenseStatus === "cleared" && row.commercialUseAllowed && !row.needsLegalReview) return { ok: true, detail: "legal_ready" };
  if (!args.attestLicenseCleared) return { ok: false, detail: "license_not_attested" };
  if (!canAttestLicense(row)) return { ok: false, detail: "attestation_forbidden_for_source_type" };
  return { ok: true, detail: "legal_attested_internal_original" };
}

function baseApprovalChecks(row: PssaReadyItem | PssaReadyPassage, args: Args) {
  if (row.reviewStatus === "REJECTED") return { ok: false, reason: "PENDING_REVIEW", detail: "reviewStatus_REJECTED" };
  if ("deprecatedReason" in row && row.deprecatedReason) return { ok: false, reason: "DEPRECATED_SUPERSEDED", detail: "deprecated_superseded" };
  if (row.itemStatus === "deprecated_superseded" || row.itemStatus === "retired" || row.retiredAt) return { ok: false, reason: "DEPRECATED_SUPERSEDED", detail: "deprecated_or_retired" };
  if (row.auditContractVersion !== AUDIT_CONTRACT_VERSION) return { ok: false, reason: "STALE_AUDIT_CONTRACT", detail: "audit_contract_version_stale" };
  if (row.sourceScanVersion !== SOURCE_SCAN_VERSION) return { ok: false, reason: "STALE_SOURCE_SCAN", detail: "source_scan_version_stale" };
  if (row.contentHash !== row.latestAuditContentHash) return { ok: false, reason: "CONTENT_HASH_DRIFT", detail: "latest_audit_content_hash_mismatch" };
  if (row.latestAuditResult !== "PASS") return { ok: false, reason: "FAILED_LATEST_AUDIT", detail: "latest_audit_result_not_PASS" };
  const legal = legalReady(row, args);
  if (!legal.ok) return { ok: false, reason: "PENDING_REVIEW", detail: legal.detail };
  return { ok: true, reason: "NONE", detail: legal.detail };
}

function classifyItem(item: PssaReadyItem, args: Args, batchDriftDetail: string | null): ReviewRow {
  const ready = explainPssaItemStudentReadiness(item);
  if (args.action === "approve" && ready.reason === "NONE") {
    return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "already_approved_noop", blockedReason: "NONE", detail: "already_student_ready", sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "noop" };
  }
  if (args.action === "revoke") {
    if (item.reviewStatus === "APPROVED" || item.itemStatus === "pilot_ready" || item.approvedContentHash) return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "eligible_to_approve", blockedReason: "PENDING_REVIEW", detail: "eligible_to_revoke", sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "revoke" };
    return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "already_approved_noop", blockedReason: "PENDING_REVIEW", detail: "already_not_approved", sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "noop" };
  }
  if (args.action === "reject") {
    if (item.reviewStatus === "REJECTED" && item.itemStatus === "candidate") return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "already_approved_noop", blockedReason: "PENDING_REVIEW", detail: "already_rejected", sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "noop" };
    return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "eligible_to_approve", blockedReason: "PENDING_REVIEW", detail: "eligible_to_reject", sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "reject" };
  }
  if (batchDriftDetail) return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "refused", blockedReason: "CONTENT_HASH_DRIFT", detail: batchDriftDetail, sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "refused" };
  if (item.reviewStatus !== "PENDING" || item.itemStatus !== "candidate" || item.studentReadyBlockedReason !== "PENDING_REVIEW" || item.approvalEligible) {
    return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "refused", blockedReason: ready.reason, detail: `strict_noop_failed_${ready.detail}`, sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "refused" };
  }
  const checks = baseApprovalChecks(item, args);
  if (!checks.ok) return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "refused", blockedReason: checks.reason, detail: checks.detail, sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "refused" };
  return { kind: "item", id: item.id, batchId: item.batchId ?? null, bucket: "eligible_to_approve", blockedReason: "NONE", detail: checks.detail, sourceType: item.sourceType ?? null, licenseStatus: item.licenseStatus ?? null, writeAction: "approve" };
}

function classifyPassage(passage: PssaReadyPassage, args: Args): ReviewRow {
  const ready = explainPssaPassageStudentReadiness(passage);
  if (args.action === "approve" && ready.reason === "NONE") {
    return { kind: "passage", id: passage.id, batchId: null, bucket: "already_approved_noop", blockedReason: "NONE", detail: "already_student_ready", sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "noop" };
  }
  if (args.action === "revoke") {
    if (passage.reviewStatus === "APPROVED" || passage.itemStatus === "pilot_ready" || passage.approvedContentHash) return { kind: "passage", id: passage.id, batchId: null, bucket: "eligible_to_approve", blockedReason: "PENDING_REVIEW", detail: "eligible_to_revoke", sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "revoke" };
    return { kind: "passage", id: passage.id, batchId: null, bucket: "already_approved_noop", blockedReason: "PENDING_REVIEW", detail: "already_not_approved", sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "noop" };
  }
  if (args.action === "reject") {
    if (passage.reviewStatus === "REJECTED" && passage.itemStatus === "candidate") return { kind: "passage", id: passage.id, batchId: null, bucket: "already_approved_noop", blockedReason: "PENDING_REVIEW", detail: "already_rejected", sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "noop" };
    return { kind: "passage", id: passage.id, batchId: null, bucket: "eligible_to_approve", blockedReason: "PENDING_REVIEW", detail: "eligible_to_reject", sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "reject" };
  }
  if (passage.reviewStatus !== "PENDING" || passage.itemStatus !== "candidate" || passage.studentReadyBlockedReason !== "PENDING_REVIEW") {
    return { kind: "passage", id: passage.id, batchId: null, bucket: "refused", blockedReason: ready.reason, detail: `strict_noop_failed_${ready.detail}`, sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "refused" };
  }
  const checks = baseApprovalChecks(passage, args);
  if (!checks.ok) return { kind: "passage", id: passage.id, batchId: null, bucket: "refused", blockedReason: checks.reason, detail: checks.detail, sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "refused" };
  return { kind: "passage", id: passage.id, batchId: null, bucket: "eligible_to_approve", blockedReason: "NONE", detail: checks.detail, sourceType: passage.sourceType ?? null, licenseStatus: passage.licenseStatus ?? null, writeAction: "approve" };
}

async function fetchTargets(db: PrismaClient, args: Args) {
  if (args.target === "passage") {
    const passage = await db.pssaPassage.findUnique({ where: { id: args.passageId! } });
    if (!passage) throw new Error(`PssaPassage not found: ${args.passageId}`);
    return { items: [], passages: [passage] };
  }
  if (args.target === "passages") {
    return { items: [], passages: await db.pssaPassage.findMany({ where: { gradeLevel: args.gradeLevel!, subject: "ELA" }, orderBy: { id: "asc" } }) };
  }
  if (args.target === "item") {
    const item = await db.pssaItem.findUnique({ where: { id: args.itemId! }, include: { batch: true, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } } } });
    if (!item) throw new Error(`PssaItem not found: ${args.itemId}`);
    return { items: [item], passages: [] };
  }
  const batch = await db.pssaItemBatch.findUnique({ where: { id: args.batchId! } });
  if (!batch) throw new Error(`PssaItemBatch not found: ${args.batchId}`);
  return {
    items: await db.pssaItem.findMany({ where: { batchId: args.batchId! }, include: { batch: true, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { id: "asc" } }),
    passages: [],
  };
}

async function batchDriftDetail(db: PrismaClient, args: Args) {
  if (args.target !== "batch" || args.action !== "approve") return null;
  const batch = await db.pssaItemBatch.findUnique({ where: { id: args.batchId! }, select: { sourceCorpusHash: true, auditContractVersion: true, sourceScanVersion: true, batchAuditResult: true } });
  if (!batch) return "batch_missing";
  if (batch.auditContractVersion !== AUDIT_CONTRACT_VERSION) return "batch_audit_contract_version_stale";
  if (batch.sourceScanVersion !== SOURCE_SCAN_VERSION) return "batch_source_scan_version_stale";
  if (batch.batchAuditResult !== "PASS") return "batch_audit_result_not_PASS";
  const currentHash = currentPlanSourceCorpusHash();
  if (!batch.sourceCorpusHash) return "batch_source_corpus_hash_missing";
  if (batch.sourceCorpusHash !== currentHash) return "batch_source_corpus_hash_drift";
  return null;
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function logAction(writeAction: string) {
  if (writeAction === "approve") return "APPROVED";
  if (writeAction === "reject") return "REJECTED";
  if (writeAction === "revoke") return "REVOKED";
  return writeAction.toUpperCase();
}

function approvalData(row: PssaReadyItem | PssaReadyPassage, args: Args) {
  const legalAttested = args.attestLicenseCleared && canAttestLicense(row);
  return {
    reviewStatus: "APPROVED" as const,
    itemStatus: "pilot_ready" as const,
    approvedAt: new Date(),
    reviewedBy: args.reviewer,
    approvedContentHash: row.contentHash,
    studentReadyBlockedReason: "NONE" as const,
    ...(legalAttested ? { licenseStatus: "cleared" as const, needsLegalReview: false, commercialUseAllowed: true } : {}),
  };
}

function rejectionData(args: Args) {
  return {
    reviewStatus: "REJECTED" as const,
    itemStatus: "candidate" as const,
    approvedAt: null,
    reviewedBy: args.reviewer,
    approvedContentHash: null,
    studentReadyBlockedReason: "PENDING_REVIEW" as const,
  };
}

function revocationData(args: Args) {
  return {
    reviewStatus: "PENDING" as const,
    itemStatus: "candidate" as const,
    approvedAt: null,
    reviewedBy: args.reviewer,
    approvedContentHash: null,
    studentReadyBlockedReason: "PENDING_REVIEW" as const,
  };
}

async function writeMutations(db: PrismaClient, rows: ReviewRow[], items: PssaReadyItem[], passages: PssaReadyPassage[], args: Args) {
  const byItem = new Map(items.map((item) => [item.id, item]));
  const byPassage = new Map(passages.map((passage) => [passage.id, passage]));
  const actionable = rows.filter((row) => row.bucket === "eligible_to_approve");
  await db.$transaction(async (tx) => {
    for (const row of actionable) {
      const action = logAction(row.writeAction);
      if (row.kind === "item") {
        const item = byItem.get(row.id)!;
        const data = row.writeAction === "approve"
          ? { ...approvalData(item, args), approvalEligible: true }
          : row.writeAction === "reject"
            ? { ...rejectionData(args), approvalEligible: false }
            : { ...revocationData(args), approvalEligible: false };
        await tx.pssaItem.update({ where: { id: row.id }, data });
        await tx.pssaReviewLog.create({ data: { itemId: row.id, batchId: row.batchId, action, reviewerUserId: args.reviewer, notes: args.reason, editDiffJson: json({ db5: true, writeAction: row.writeAction, detail: row.detail }) } });
      } else {
        const passage = byPassage.get(row.id)!;
        const data = row.writeAction === "approve" ? approvalData(passage, args) : row.writeAction === "reject" ? rejectionData(args) : revocationData(args);
        await tx.pssaPassage.update({ where: { id: row.id }, data });
        await tx.pssaReviewLog.create({ data: { passageId: row.id, action, reviewerUserId: args.reviewer, notes: args.reason, editDiffJson: json({ db5: true, writeAction: row.writeAction, detail: row.detail }) } });
      }
    }
  }, { timeout: 60_000 });
}

function writeReports(rows: ReviewRow[], args: Args, readyCount: number) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const csvPath = path.join(REPORT_DIR, "pssa_db5_approval_dryrun.csv");
  writeCsv(csvPath, rows as any, ["kind", "id", "batchId", "bucket", "blockedReason", "detail", "sourceType", "licenseStatus", "writeAction"]);
  const counts = {
    eligible: rows.filter((row) => row.bucket === "eligible_to_approve").length,
    noop: rows.filter((row) => row.bucket === "already_approved_noop").length,
    refused: rows.filter((row) => row.bucket === "refused").length,
  };
  const summary = [
    "# PSSA DB-5 Approval Write Summary",
    "",
    `- DB target: ${redactedDbTarget()}`,
    `- Mode: ${args.write ? "write" : "dry-run"}`,
    `- Target: ${args.target}`,
    `- Action: ${args.action}`,
    `- Eligible/actionable rows: ${counts.eligible}`,
    `- Already no-op rows: ${counts.noop}`,
    `- Refused rows: ${counts.refused}`,
    `- Student-ready selector count after run: ${readyCount}`,
    `- Dry-run CSV: ${csvPath}`,
    "",
    "## Guardrails",
    "",
    "- Any refused row aborts the whole write before mutation.",
    "- Already-ready rows are no-ops and do not receive duplicate review logs.",
    "- Student readiness is computed live by the DB-5 selector.",
  ];
  fs.writeFileSync(path.join(REPORT_DIR, "pssa_db5_approval_write_summary.md"), `${summary.join("\n")}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = new PrismaClient();
  try {
    const selected = await fetchTargets(db, args);
    const drift = await batchDriftDetail(db, args);
    const rows = [
      ...selected.passages.map((passage) => classifyPassage(passage, args)),
      ...selected.items.map((item) => classifyItem(item, args, drift)),
    ];
    const refused = rows.filter((row) => row.bucket === "refused");
    if (args.write && refused.length) {
      writeReports(rows, args, await getStudentReadyPssaItems(db, { gradeLevel: args.gradeLevel ?? undefined, batchId: args.batchId ?? undefined }).then((items) => items.length));
      throw new Error(`DB-5 write refused: ${refused.length} selected row(s) failed approval gates.`);
    }
    if (args.write) await writeMutations(db, rows, selected.items, selected.passages, args);
    const ready = await getStudentReadyPssaItems(db, { gradeLevel: args.gradeLevel ?? undefined, batchId: args.batchId ?? undefined });
    writeReports(rows, args, ready.length);
    const counts = {
      eligible: rows.filter((row) => row.bucket === "eligible_to_approve").length,
      noop: rows.filter((row) => row.bucket === "already_approved_noop").length,
      refused: refused.length,
    };
    console.log(`PSSA DB-5 ${args.write ? "write" : "dry-run"} complete.`);
    console.log(`eligible=${counts.eligible}, noop=${counts.noop}, refused=${counts.refused}, studentReady=${ready.length}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
