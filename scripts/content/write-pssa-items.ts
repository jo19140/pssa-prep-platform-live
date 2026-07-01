import { Prisma, PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import {
  AUDIT_CONTRACT_VERSION,
  SOURCE_SCAN_VERSION,
  SOURCE_VERSION_YEAR,
  buildPlanForBenchmark,
  stableStringify,
  tallyGate,
  type BatchRow,
  type ImportPlan,
  type PssaImportBenchmark,
  type WouldImportItem,
  type WouldImportPassage,
} from "./lib/pssa-import-plan";

const REPORT_DIR = path.resolve("reports");

type Args = {
  write: boolean;
  env: string | null;
  grade: number | null;
  benchmark: PssaImportBenchmark;
  allowProduction: boolean;
};

type MutationCounts = {
  inserts: number;
  updates: number;
  deletes: number;
  noops: number;
  drift: number;
};

type WriteResult = {
  runId: string;
  dbTarget: string;
  crosswalkCount: number;
  crosswalkJoinCount: number;
  ecResolved: number;
  ecTotal: number;
  mutations: Record<string, MutationCounts>;
  assertions: Record<string, number | string>;
  batchMembership: Record<string, number>;
  supersessions: Array<{ oldItemId: string; newItemId: string; reason: string; status: string }>;
};

function emptyCounts(): MutationCounts {
  return { inserts: 0, updates: 0, deletes: 0, noops: 0, drift: 0 };
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { write: false, env: null, grade: null, benchmark: "foundation", allowProduction: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write") args.write = true;
    else if (arg === "--env") {
      args.env = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith("--env=")) args.env = arg.slice("--env=".length);
    else if (arg === "--grade") {
      args.grade = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith("--grade=")) args.grade = Number(arg.slice("--grade=".length));
    else if (arg === "--benchmark") {
      const value = argv[i + 1];
      if (value !== "foundation" && value !== "eoy" && value !== "moy" && value !== "boy") throw new Error(`Unsupported --benchmark: ${value}. Expected foundation or eoy. Also supported: moy and boy.`);
      args.benchmark = value;
      i += 1;
    } else if (arg.startsWith("--benchmark=")) {
      const value = arg.slice("--benchmark=".length);
      if (value !== "foundation" && value !== "eoy" && value !== "moy" && value !== "boy") throw new Error(`Unsupported --benchmark: ${value}. Expected foundation or eoy. Also supported: moy and boy.`);
      args.benchmark = value;
    }
    else if (arg === "--allow-production") args.allowProduction = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.write && args.env !== "dev") throw new Error("--write requires explicit --env dev.");
  if (!Number.isInteger(args.grade)) throw new Error("--grade is required.");
  const envValues = [process.env.NODE_ENV, process.env.APP_ENV, args.env].filter(Boolean).map((value) => value!.toLowerCase());
  const looksProduction = envValues.some((value) => value.includes("prod") || value === "production");
  if (looksProduction && !args.allowProduction) throw new Error("Refusing production-like environment without --allow-production.");
  return args;
}

function assertDatabaseUrlPresent() {
  if (!process.env.DATABASE_URL) throw new Error("--write requires DATABASE_URL.");
}

function redactedDbTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) return "DATABASE_URL missing";
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.username ? "(user)" : "(missing-user)"}:${parsed.password ? "(redacted)" : "(missing)"}@${parsed.hostname}:${parsed.port || "(default)"}/${parsed.pathname.replace(/^\//, "")}`;
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath: string, rows: Record<string, unknown>[], columns: string[]) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function buildStablePlan(gradeLevel: number, benchmark: PssaImportBenchmark = "foundation") {
  const first = buildPlanForBenchmark({ grade: gradeLevel, benchmark });
  const second = buildPlanForBenchmark({ grade: gradeLevel, benchmark });
  const firstHashes = [...first.passages.map((row) => row.contentHash), ...first.activeItems.map((row) => row.contentHash), ...first.deprecatedItems.map((row) => row.contentHash)].sort();
  const secondHashes = [...second.passages.map((row) => row.contentHash), ...second.activeItems.map((row) => row.contentHash), ...second.deprecatedItems.map((row) => row.contentHash)].sort();
  first.hashStable = stableStringify(firstHashes) === stableStringify(secondHashes);
  tallyGate(first.gateTallies, "PSSA_IMPORT_HASH_STABLE", first.hashStable ? "PASS" : "FAIL");
  return first;
}

function totalGateFailures(plan: ImportPlan) {
  return [...plan.gateTallies.values()].reduce((sum, tally) => sum + tally.fail, 0);
}

function assertPreWritePlan(plan: ImportPlan) {
  const expected = {
    passage: plan.manifestConfig.expectedCounts.passages,
    item: plan.manifestConfig.expectedCounts.activeItems,
    deprecated: plan.manifestConfig.expectedCounts.deprecatedItems,
    supersession: plan.manifestConfig.expectedCounts.supersessions,
    batch: plan.manifestConfig.expectedCounts.batches,
  };
  for (const row of plan.manifest) {
    if (row.count !== expected[row.recordType] || row.expectedCount !== expected[row.recordType] || !row.match) {
      throw new Error(`DB-4 pre-write refused: manifest mismatch for ${row.recordType}.`);
    }
  }
  if (totalGateFailures(plan) !== 0 || plan.sourceScanFailures !== 0 || !plan.hashStable) {
    throw new Error("DB-4 pre-write refused: gates, source scan, or hash stability failed.");
  }
  for (const item of plan.activeItems) {
    if (item.finalImportEligibility !== "eligible" || item.blockedReasons.length > 0) {
      throw new Error(`DB-4 pre-write refused: active item ${item.itemId} is blocked.`);
    }
  }
  for (const item of [...plan.activeItems, ...plan.deprecatedItems]) {
    if (String(item.reviewStatus) === "APPROVED" || String(item.itemStatus) === "pilot_ready" || String(item.studentReadyBlockedReason) === "NONE" || item.approvalEligible) {
      throw new Error(`DB-4 pre-write refused: unsafe governance state on ${item.itemId}.`);
    }
  }
}

async function resolveCrosswalk(db: PrismaClient, plan: ImportPlan) {
  const crosswalkCount = await db.pssaStandardsCrosswalk.count();
  const crosswalkJoinCount = await db.pssaCrosswalkPaCoreStandard.count();
  if (crosswalkCount !== 241 || crosswalkJoinCount !== 936) {
    throw new Error(`load the crosswalk (DB-2) first. Found PssaStandardsCrosswalk=${crosswalkCount}, PssaCrosswalkPaCoreStandard=${crosswalkJoinCount}.`);
  }

  const rows = await db.pssaStandardsCrosswalk.findMany({
    where: {
      subject: "ELA",
      gradeLevel: plan.gradeLevel,
      sourceVersionYear: SOURCE_VERSION_YEAR,
      eligibleContent: { in: [...new Set([...plan.activeItems, ...plan.deprecatedItems].map((item) => item.eligibleContent).filter(Boolean))] },
    },
    select: { id: true, subject: true, gradeLevel: true, eligibleContent: true, sourceVersionYear: true },
  });
  const refs = new Map(rows.map((row) => [[row.subject, row.gradeLevel, row.eligibleContent, row.sourceVersionYear].join("|"), row.id]));
  for (const item of plan.activeItems) {
    const refId = refs.get([item.subject, item.gradeLevel, item.eligibleContent, SOURCE_VERSION_YEAR].join("|"));
    if (!refId) throw new Error(`DB-4 pre-write refused: active item EC did not resolve in DB (${item.itemId}, ${item.eligibleContent}).`);
  }
  return { crosswalkCount, crosswalkJoinCount, refs };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function passageCreateData(passage: WouldImportPassage, importRunId: string) {
  return {
    id: passage.passageId,
    title: passage.title,
    gradeLevel: passage.gradeLevel,
    subject: passage.subject,
    passageType: passage.passageType,
    text: passage.text,
    wordCount: passage.wordCount,
    sourceType: passage.sourceType,
    sourceName: passage.sourceName,
    sourceCitation: passage.sourceCitation,
    licenseStatus: passage.licenseStatus,
    commercialUseAllowed: passage.commercialUseAllowed,
    needsLegalReview: passage.needsLegalReview,
    reviewStatus: "PENDING" as const,
    itemStatus: "candidate" as const,
    studentReadyBlockedReason: "PENDING_REVIEW" as const,
    provenanceJson: json(passage.provenanceJson),
    contentHash: passage.contentHash,
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    latestAuditContentHash: passage.contentHash,
    latestAuditResult: "PASS" as const,
    latestAuditAt: new Date(0),
  };
}

function itemCreateData(item: WouldImportItem, eligibleContentRefId: string | null, importRunId: string) {
  assertRoleBearingResponseSpecSafe(item);
  return {
    id: item.itemId,
    module: "PSSA" as const,
    subject: item.subject,
    gradeLevel: item.gradeLevel,
    standardCode: item.standardCode,
    assessmentAnchor: item.assessmentAnchor || null,
    eligibleContent: item.eligibleContent || null,
    eligibleContentRefId,
    reportingCategory: item.reportingCategory || null,
    dokLevel: item.dokLevel,
    itemType: item.itemType,
    skill: item.skill || item.eligibleContent,
    interactionType: item.interactionType as any,
    interactionSubtype: item.interactionSubtype || null,
    responseSpecJson: json(item.responseSpecJson),
    correctResponseJson: json(item.correctResponseJson),
    scoringJson: json(item.scoringJson),
    pointValue: item.pointValue,
    sourceType: item.sourceType,
    sourceName: item.sourceName,
    sourceCitation: item.sourceCitation,
    licenseStatus: item.licenseStatus,
    commercialUseAllowed: item.commercialUseAllowed,
    needsLegalReview: item.needsLegalReview,
    reviewStatus: "PENDING" as const,
    itemStatus: item.itemStatus,
    alignmentStatus: eligibleContentRefId ? "ALIGNED" as const : "NEEDS_CROSSWALK" as const,
    approvalEligible: false,
    approvedAt: null,
    reviewedBy: null,
    studentPreviewJson: json(item.studentPreviewJson),
    passageGroupId: item.passageGroupId,
    isCrossText: item.isCrossText,
    requiredEvidenceSlotsJson: item.requiredEvidenceSlotsJson === null ? Prisma.JsonNull : json(item.requiredEvidenceSlotsJson),
    crossTextSupportRuleJson: item.crossTextSupportRuleJson === null ? Prisma.JsonNull : json(item.crossTextSupportRuleJson),
    responseSpecVersion: item.responseSpecVersion,
    auditContractVersion: item.auditContractVersion,
    sourceScanVersion: item.sourceScanVersion,
    contentHash: item.contentHash,
    latestAuditContentHash: item.contentHash,
    latestAuditResult: item.latestAuditResult,
    latestAuditAt: new Date(0),
    importedFromFile: item.importedFromFile,
    importRunId,
    studentReadyBlockedReason: item.studentReadyBlockedReason,
    deprecatedReason: item.deprecatedReason ?? null,
    batchId: item.batchId || null,
    provenanceJson: json(item.provenanceJson),
  };
}

function assertRoleBearingResponseSpecSafe(item: WouldImportItem) {
  if (item.gradeLevel !== 3 || item.interactionType !== "MCQ") return;
  const spec = plainObject(item.responseSpecJson);
  const structured = Array.isArray(spec.structuredChoicesJson) ? spec.structuredChoicesJson : null;
  if (!structured) return;
  const correct = plainObject(item.correctResponseJson).correctIndex;
  if (!Number.isInteger(correct)) throw new Error(`PSSA_ROLE_SPEC_MISSING_CORRECT_INDEX:${item.itemId}`);
  for (let index = 0; index < structured.length; index += 1) {
    const role = plainObject(structured[index]).distractorRole;
    if (index === correct && role) throw new Error(`PSSA_ROLE_SPEC_CORRECT_CHOICE_HAS_ROLE:${item.itemId}:${index}`);
    if (index !== correct && typeof role !== "string") throw new Error(`PSSA_ROLE_SPEC_DISTRACTOR_MISSING_ROLE:${item.itemId}:${index}`);
  }
}

function plainObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function batchCreateData(batch: BatchRow, importRunId: string, sourceCorpusHash: string) {
  return {
    id: batch.batchId,
    gradeLevel: batch.gradeLevel,
    subject: "ELA",
    streamType: batch.streamType as any,
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    sourceCorpusHash,
    importRunId,
    batchAuditResult: batch.batchResult,
    batchAuditNotes: batch.batchGate,
  };
}

function reportPath(baseName: string, gradeLevel: number) {
  if (gradeLevel === 3) return path.join(REPORT_DIR, baseName);
  const extension = path.extname(baseName);
  return path.join(REPORT_DIR, `${baseName.slice(0, -extension.length)}_g${gradeLevel}${extension}`);
}

function assertGovernanceRow(id: string, row: { reviewStatus: string; itemStatus: string; studentReadyBlockedReason: string; approvalEligible?: boolean; approvedAt?: Date | null; reviewedBy?: string | null }) {
  if (row.reviewStatus === "APPROVED" || row.itemStatus === "pilot_ready" || row.studentReadyBlockedReason === "NONE" || row.approvalEligible || row.approvedAt || row.reviewedBy) {
    throw new Error(`DB-4 refused: existing row ${id} is not fail-closed.`);
  }
}

async function persistPlan(db: PrismaClient, plan: ImportPlan, dbTarget: string, refs: Map<string, string>, crosswalkCount: number, crosswalkJoinCount: number): Promise<WriteResult> {
  const mutations: Record<string, MutationCounts> = {
    PssaPassage: emptyCounts(),
    PssaPassageGroup: emptyCounts(),
    PssaPassageGroupMember: emptyCounts(),
    PssaItemBatch: emptyCounts(),
    PssaItem: emptyCounts(),
    PssaItemPassageLink: emptyCounts(),
    PssaItemSupersession: emptyCounts(),
  };
  const allItems = [...plan.activeItems, ...plan.deprecatedItems];
  const sourceCorpusHash = stableStringify([...plan.passages.map((row) => row.contentHash), ...allItems.map((row) => row.contentHash)].sort());
  const runKey = `pssa-db4-${new Date().toISOString()}`;
  const run = await db.$transaction(async (tx) => {
    const importRun = await tx.pssaImportRun.create({
      data: {
        runKey,
        mode: "write",
        env: "dev",
        auditContractVersion: AUDIT_CONTRACT_VERSION,
        sourceScanVersion: SOURCE_SCAN_VERSION,
        sourceCorpusHash,
        sourceCorpusManifestJson: json({ manifest: plan.manifest, batches: plan.batches }),
        reportPath: `reports/${path.basename(reportPath("pssa_db4_write_summary.md", plan.gradeLevel))}`,
      },
    });

    for (const passage of plan.passages) {
      const existing = await tx.pssaPassage.findUnique({ where: { id: passage.passageId } });
      if (!existing) {
        await tx.pssaPassage.create({ data: passageCreateData(passage, importRun.id) });
        mutations.PssaPassage.inserts += 1;
      } else {
        if (existing.contentHash !== passage.contentHash) throw new Error(`DB-4 drift refused: passage ${passage.passageId} contentHash differs.`);
        assertGovernanceRow(passage.passageId, existing);
        mutations.PssaPassage.noops += 1;
      }
    }

    for (const group of plan.passageGroups) {
      const existing = await tx.pssaPassageGroup.findUnique({ where: { id: group.groupId } });
      const desired = {
        id: group.groupId,
        gradeLevel: group.gradeLevel,
        subject: group.subject,
        groupType: group.groupType,
        genre: group.genre,
        staminaBand: group.staminaBand,
        title: group.title,
        wordCount: group.wordCount,
        domainVocabularyLoad: group.domainVocabularyLoad,
        textFeaturesJson: json(group.textFeaturesJson ?? []),
        contentHash: group.contentHash,
      };
      if (!existing) {
        await tx.pssaPassageGroup.create({ data: desired });
        mutations.PssaPassageGroup.inserts += 1;
      } else {
        if (existing.contentHash !== group.contentHash) throw new Error(`DB-4 drift refused: passage group ${group.groupId} contentHash differs.`);
        mutations.PssaPassageGroup.noops += 1;
      }
      for (const member of group.members) {
        const existingMember = await tx.pssaPassageGroupMember.findUnique({ where: { groupId_passageId: { groupId: group.groupId, passageId: member.passageId } } });
        if (!existingMember) {
          await tx.pssaPassageGroupMember.create({
            data: {
              groupId: group.groupId,
              passageId: member.passageId,
              slot: member.slot,
              position: member.position,
              passageContentHashSnapshot: member.passageContentHashSnapshot,
            },
          });
          mutations.PssaPassageGroupMember.inserts += 1;
        } else {
          if (
            existingMember.slot !== member.slot ||
            existingMember.position !== member.position ||
            existingMember.passageContentHashSnapshot !== member.passageContentHashSnapshot
          ) {
            throw new Error(`DB-4 drift refused: passage group member ${group.groupId}/${member.passageId} differs.`);
          }
          mutations.PssaPassageGroupMember.noops += 1;
        }
      }
    }

    for (const batch of plan.batches) {
      const existing = await tx.pssaItemBatch.findUnique({ where: { id: batch.batchId } });
      const desired = batchCreateData(batch, importRun.id, sourceCorpusHash);
      if (!existing) {
        await tx.pssaItemBatch.create({ data: desired });
        mutations.PssaItemBatch.inserts += 1;
      } else {
        if (existing.streamType !== desired.streamType || existing.gradeLevel !== desired.gradeLevel || existing.subject !== desired.subject) {
          throw new Error(`DB-4 drift refused: batch ${batch.batchId} differs.`);
        }
        if (
          existing.auditContractVersion !== desired.auditContractVersion ||
          existing.sourceScanVersion !== desired.sourceScanVersion ||
          existing.sourceCorpusHash !== desired.sourceCorpusHash ||
          existing.batchAuditResult !== desired.batchAuditResult ||
          existing.batchAuditNotes !== desired.batchAuditNotes
        ) {
          await tx.pssaItemBatch.update({
            where: { id: batch.batchId },
            data: {
              auditContractVersion: desired.auditContractVersion,
              sourceScanVersion: desired.sourceScanVersion,
              sourceCorpusHash: desired.sourceCorpusHash,
              batchAuditResult: desired.batchAuditResult,
              batchAuditNotes: desired.batchAuditNotes,
            },
          });
          mutations.PssaItemBatch.updates += 1;
        } else {
          mutations.PssaItemBatch.noops += 1;
        }
      }
    }

    for (const item of allItems) {
      const refId = item.eligibleContent ? refs.get([item.subject, item.gradeLevel, item.eligibleContent, SOURCE_VERSION_YEAR].join("|")) ?? null : null;
      const existing = await tx.pssaItem.findUnique({ where: { id: item.itemId } });
      if (!existing) {
        await tx.pssaItem.create({ data: itemCreateData(item, refId, importRun.id) });
        mutations.PssaItem.inserts += 1;
      } else {
        if (existing.contentHash !== item.contentHash) throw new Error(`DB-4 drift refused: item ${item.itemId} contentHash differs.`);
        assertGovernanceRow(item.itemId, existing);
        if (existing.itemStatus !== item.itemStatus || existing.studentReadyBlockedReason !== item.studentReadyBlockedReason || existing.batchId !== (item.batchId || null)) {
          throw new Error(`DB-4 drift refused: item ${item.itemId} governance or batch differs.`);
        }
        mutations.PssaItem.noops += 1;
      }
    }

    for (const item of allItems) {
      for (const [sortOrder, passageId] of item.passageIds.entries()) {
        const existing = await tx.pssaItemPassageLink.findUnique({ where: { itemId_passageId_role: { itemId: item.itemId, passageId, role: "primary" } } });
        if (!existing) {
          await tx.pssaItemPassageLink.create({ data: { itemId: item.itemId, passageId, role: "primary", sortOrder } });
          mutations.PssaItemPassageLink.inserts += 1;
        } else {
          if (existing.sortOrder !== sortOrder) throw new Error(`DB-4 drift refused: passage link sort differs for ${item.itemId}/${passageId}.`);
          mutations.PssaItemPassageLink.noops += 1;
        }
      }
    }

    const activeIds = new Set(plan.activeItems.map((item) => item.itemId));
    for (const item of plan.deprecatedItems) {
      for (const newItemId of item.supersededByItemIds ?? []) {
        if (!activeIds.has(newItemId)) throw new Error(`DB-4 refused: supersession target ${newItemId} is not active.`);
        const existing = await tx.pssaItemSupersession.findUnique({ where: { oldItemId_newItemId: { oldItemId: item.itemId, newItemId } } });
        if (!existing) {
          await tx.pssaItemSupersession.create({ data: { oldItemId: item.itemId, newItemId, reason: item.deprecatedReason ?? "Deprecated and superseded by governed replacement item." } });
          mutations.PssaItemSupersession.inserts += 1;
        } else {
          if (existing.reason !== (item.deprecatedReason ?? "Deprecated and superseded by governed replacement item.")) throw new Error(`DB-4 drift refused: supersession reason differs for ${item.itemId}.`);
          mutations.PssaItemSupersession.noops += 1;
        }
      }
    }

    const approved = await tx.pssaItem.count({ where: { reviewStatus: "APPROVED" } });
    const pilotReady = await tx.pssaItem.count({ where: { itemStatus: "pilot_ready" } });
    const noneReady = await tx.pssaItem.count({ where: { studentReadyBlockedReason: "NONE" } });
    if (approved || pilotReady || noneReady) throw new Error("DB-4 post-write assertion failed: student-ready or approved item exists.");

    return importRun;
  }, { timeout: 60_000 });

  const batchRows = await db.pssaItem.groupBy({ by: ["batchId"], where: { batchId: { not: null } }, _count: { _all: true } });
  const batchMembership = Object.fromEntries(batchRows.map((row) => [row.batchId!, row._count._all]));
  const activeCount = await db.pssaItem.count({ where: { itemStatus: "candidate" } });
  const deprecatedCount = await db.pssaItem.count({ where: { itemStatus: "deprecated_superseded" } });
  const assertions = {
    passages: await db.pssaPassage.count(),
    items: await db.pssaItem.count(),
    activeItems: activeCount,
    deprecatedItems: deprecatedCount,
    batches: await db.pssaItemBatch.count(),
    supersessions: await db.pssaItemSupersession.count(),
    approvedItems: await db.pssaItem.count({ where: { reviewStatus: "APPROVED" } }),
    pilotReadyItems: await db.pssaItem.count({ where: { itemStatus: "pilot_ready" } }),
    studentReadyItems: await db.pssaItem.count({ where: { studentReadyBlockedReason: "NONE" } }),
    activeFailClosed: await db.pssaItem.count({ where: { itemStatus: "candidate", reviewStatus: "PENDING", studentReadyBlockedReason: "PENDING_REVIEW", approvalEligible: false, approvedAt: null, reviewedBy: null } }),
    deprecatedFailClosed: await db.pssaItem.count({ where: { itemStatus: "deprecated_superseded", studentReadyBlockedReason: "DEPRECATED_SUPERSEDED", approvalEligible: false, deprecatedReason: { not: null } } }),
    untouched_Assessment: await db.assessment.count(),
    untouched_AssessmentQuestion: await db.assessmentQuestion.count(),
    untouched_AssessmentPassage: await db.assessmentPassage.count(),
    untouched_DiagnosticItem: await db.diagnosticItem.count(),
    untouched_User: await db.user.count(),
    untouched_TeacherProfile: await db.teacherProfile.count(),
    untouched_StudentProfile: await db.studentProfile.count(),
    untouched_Assignment: await db.assignment.count(),
  };
  return {
    runId: run.id,
    dbTarget,
    crosswalkCount,
    crosswalkJoinCount,
    ecResolved: allItems.filter((item) => refs.has([item.subject, item.gradeLevel, item.eligibleContent, SOURCE_VERSION_YEAR].join("|"))).length,
    ecTotal: allItems.length,
    mutations,
    assertions,
    batchMembership,
    supersessions: plan.deprecatedItems.flatMap((item) => (item.supersededByItemIds ?? []).map((newItemId) => ({ oldItemId: item.itemId, newItemId, reason: item.deprecatedReason ?? "", status: "resolved" }))),
  };
}

function writeReports(plan: ImportPlan, result: WriteResult) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  writeCsv(reportPath("pssa_db4_write_manifest.csv", plan.gradeLevel), plan.manifest as any, ["sourceFile", "recordType", "count", "expectedCount", "match"]);
  writeCsv(reportPath("pssa_db4_db_state_assertions.csv", plan.gradeLevel), Object.entries(result.assertions).map(([assertion, value]) => ({ assertion, value })), ["assertion", "value"]);
  writeCsv(reportPath("pssa_db4_idempotency_report.csv", plan.gradeLevel), Object.entries(result.mutations).map(([table, counts]) => ({ table, ...counts })), ["table", "inserts", "updates", "deletes", "noops", "drift"]);
  writeCsv(reportPath("pssa_db4_student_ready_failclosed_report.csv", plan.gradeLevel), [
    { check: "APPROVED", count: result.assertions.approvedItems },
    { check: "pilot_ready", count: result.assertions.pilotReadyItems },
    { check: "studentReadyBlockedReason_NONE", count: result.assertions.studentReadyItems },
    { check: "active_fail_closed", count: result.assertions.activeFailClosed },
    { check: "deprecated_fail_closed", count: result.assertions.deprecatedFailClosed },
  ], ["check", "count"]);
  writeCsv(reportPath("pssa_db4_supersession_report.csv", plan.gradeLevel), result.supersessions, ["oldItemId", "newItemId", "reason", "status"]);
  const lines = [
    "# PSSA DB-4 Write Summary",
    "",
    `- DB target: ${result.dbTarget}`,
    `- Import run id: ${result.runId}`,
    `- Crosswalk rows: ${result.crosswalkCount}`,
    `- Crosswalk join rows: ${result.crosswalkJoinCount}`,
    `- Passages: ${result.assertions.passages}`,
    `- Items: ${result.assertions.items}`,
    `- Active candidate items: ${result.assertions.activeItems}`,
    `- Deprecated items: ${result.assertions.deprecatedItems}`,
    `- Batches: ${result.assertions.batches}`,
    `- Supersessions: ${result.assertions.supersessions}`,
    `- EC resolved: ${result.ecResolved}/${result.ecTotal}`,
    `- Approved items: ${result.assertions.approvedItems}`,
    `- Pilot-ready items: ${result.assertions.pilotReadyItems}`,
    `- Student-ready items: ${result.assertions.studentReadyItems}`,
    `- Untouched existing app table rows: Assessment=${result.assertions.untouched_Assessment}, AssessmentQuestion=${result.assertions.untouched_AssessmentQuestion}, AssessmentPassage=${result.assertions.untouched_AssessmentPassage}, DiagnosticItem=${result.assertions.untouched_DiagnosticItem}, User=${result.assertions.untouched_User}, TeacherProfile=${result.assertions.untouched_TeacherProfile}, StudentProfile=${result.assertions.untouched_StudentProfile}, Assignment=${result.assertions.untouched_Assignment}`,
    `- DB-3 plan gate failures: ${totalGateFailures(plan)}`,
    `- Source scan failures: ${plan.sourceScanFailures}`,
    `- Hash stability: ${plan.hashStable ? "PASS" : "FAIL"}`,
    "",
    "## Batch Membership",
    "",
    "| Batch | Items |",
    "|---|---:|",
    ...plan.batches.map((batch) => `| ${batch.batchId} | ${result.batchMembership[batch.batchId] ?? 0} |`),
    "",
    "## Content Mutations",
    "",
    "| Table | Inserts | Updates | Deletes | Noops | Drift |",
    "|---|---:|---:|---:|---:|---:|",
    ...Object.entries(result.mutations).map(([table, counts]) => `| ${table} | ${counts.inserts} | ${counts.updates} | ${counts.deletes} | ${counts.noops} | ${counts.drift} |`),
    "",
    "## Guardrails",
    "",
    "- Import did not approve content.",
    "- Import did not build student-facing selection.",
    "- Import did not build form assembly.",
    "- No governed content deletions are implemented in DB-4.",
  ];
  fs.writeFileSync(reportPath("pssa_db4_write_summary.md", plan.gradeLevel), `${lines.join("\n")}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = buildStablePlan(args.grade!, args.benchmark);
  assertPreWritePlan(plan);
  if (!args.write) {
    console.log("PSSA DB-4 dry run complete.");
    console.log(`Benchmark=${args.benchmark}`);
    console.log(`Passages=${plan.passages.length}, active=${plan.activeItems.length}, deprecated=${plan.deprecatedItems.length}, supersessions=${plan.supersessions.length}, batches=${plan.batches.length}`);
    console.log(`Gate failures=${totalGateFailures(plan)}, sourceScanFailures=${plan.sourceScanFailures}, hashStable=${plan.hashStable}`);
    return;
  }
  assertDatabaseUrlPresent();
  const db = new PrismaClient();
  try {
    const dbTarget = redactedDbTarget();
    const { crosswalkCount, crosswalkJoinCount, refs } = await resolveCrosswalk(db, plan);
    const result = await persistPlan(db, plan, dbTarget, refs, crosswalkCount, crosswalkJoinCount);
    writeReports(plan, result);
    console.log("PSSA DB-4 write complete.");
    console.log(`Passages=${result.assertions.passages}, active=${result.assertions.activeItems}, deprecated=${result.assertions.deprecatedItems}, supersessions=${result.assertions.supersessions}, batches=${result.assertions.batches}`);
    console.log(`Student-ready items=${result.assertions.studentReadyItems}`);
    console.log(`Content mutations: ${Object.entries(result.mutations).map(([table, counts]) => `${table} i=${counts.inserts} u=${counts.updates} d=${counts.deletes} noop=${counts.noops}`).join("; ")}`);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
