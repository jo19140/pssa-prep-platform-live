import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  APPROVAL_NOTE,
  auditBankItems,
  bankItemToDiagnosticCreateInput,
  ensureDailyTarget,
  ensurePhasePosition,
  loadBankPayload,
} from "./diagnostic-bank-v1-4";

const db = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const approve = process.argv.includes("--approve");
  const bank = loadBankPayload();
  const sourceAudit = auditBankItems(bank.items, bank.bankId, { requireSourceStatuses: true });
  const failures = sourceAudit.results.filter((result) => result.status === "FAIL");
  if (bank.itemCount !== 120 || bank.items.length !== 120) {
    throw new Error(`Expected 120 source items, saw itemCount=${bank.itemCount}, items.length=${bank.items.length}.`);
  }
  if (failures.length) {
    console.log(JSON.stringify({ dryRun, approve, imported: 0, sourceAudit }, null, 2));
    throw new Error(`Source audit failed for ${failures.length} item(s); import aborted.`);
  }

  const result = {
    dryRun,
    approveRequested: approve,
    sourceBankId: bank.bankId,
    sourceItems: bank.items.length,
    sourcePassCount: sourceAudit.passCount,
    created: 0,
    updated: 0,
    skippedConflicts: [] as Array<{ id: string; reason: string }>,
    approved: 0,
    pending: 0,
  };

  if (dryRun) {
    result.pending = approve ? 0 : bank.items.length;
    result.approved = approve ? bank.items.length : 0;
    console.log(JSON.stringify({ ...result, sourceAudit: summarizeAudit(sourceAudit) }, null, 2));
    return;
  }

  await db.$transaction(async (tx) => {
    for (const item of bank.items) {
      const existing = await tx.diagnosticItem.findUnique({ where: { id: item.id } });
      const existingAdmin = existing?.adminReviewJson && typeof existing.adminReviewJson === "object" && !Array.isArray(existing.adminReviewJson) ? existing.adminReviewJson as Record<string, unknown> : {};
      if (existing && existingAdmin.sourceBankId !== bank.bankId && existing.reviewedAt) {
        result.skippedConflicts.push({ id: item.id, reason: "Existing reviewed item is not from this source bank." });
        continue;
      }
      const phasePosition = await ensurePhasePosition(tx, item);
      const dailyTarget = await ensureDailyTarget(tx, item, phasePosition.id);
      const data = bankItemToDiagnosticCreateInput(item, {
        phasePositionId: phasePosition.id,
        dailyTargetId: dailyTarget?.id,
        sourceBankId: bank.bankId,
        approve,
      });
      const create = data;
      const update = { ...data };
      delete (update as { id?: string }).id;
      await tx.diagnosticItem.upsert({
        where: { id: item.id },
        create,
        update,
      });
      if (existing) result.updated += 1;
      else result.created += 1;
      if (data.reviewStatus === "APPROVED") result.approved += 1;
      else result.pending += 1;
    }
  }, { timeout: 60_000 });

  const imported = await db.diagnosticItem.findMany({
    where: { id: { startsWith: "RB-PILOT-P1P3-" }, retiredAt: null },
    orderBy: { id: "asc" },
  });
  const importedFromBank = imported.filter((item) => {
    const admin = item.adminReviewJson && typeof item.adminReviewJson === "object" && !Array.isArray(item.adminReviewJson) ? item.adminReviewJson as Record<string, unknown> : {};
    return admin.sourceBankId === bank.bankId;
  });

  const approvalLog = {
    sourceBankId: bank.bankId,
    approvedAt: approve ? new Date().toISOString() : null,
    approvalNote: approve ? APPROVAL_NOTE : null,
    totalImportedFromBank: importedFromBank.length,
    approvedCount: importedFromBank.filter((item) => item.reviewStatus === "APPROVED").length,
    pendingCount: importedFromBank.filter((item) => item.reviewStatus === "PENDING").length,
    failedCount: result.skippedConflicts.length,
    sourceAudit: summarizeAudit(sourceAudit),
  };
  if (approve) {
    fs.mkdirSync(path.join(process.cwd(), "audit"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), "audit", "reading-buddy-phase1-3-v1.4-fast-track-approval.json"), `${JSON.stringify(approvalLog, null, 2)}\n`);
  }

  console.log(JSON.stringify({ ...result, approvalLog }, null, 2));
  if (result.skippedConflicts.length) {
    throw new Error(`${result.skippedConflicts.length} item(s) skipped due to conflicts.`);
  }
}

function summarizeAudit(audit: ReturnType<typeof auditBankItems>) {
  return {
    bankId: audit.bankId,
    expectedCount: audit.expectedCount,
    passCount: audit.passCount,
    failCount: audit.failCount,
    strandCounts: audit.strandCounts,
    failedItems: audit.results.filter((result) => result.status === "FAIL"),
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
