import { db } from "../../lib/db";
import { isDiagnosticItemStudentReady } from "../../lib/content/diagnosticItemReview";
import { diagnosticPoolCoverage } from "../../lib/literacy/diagnosticPoolPreflight";

async function main() {
  const items = await db.diagnosticItem.findMany({
    where: { retiredAt: null },
    include: {
      dailyTarget: true,
      firstLookReviewModelDecision: true,
    },
    orderBy: { id: "asc" },
  });
  const imported = items.filter((item) => item.id.startsWith("RB-PILOT-P1P3-"));
  const approved = imported.filter((item) => item.reviewStatus === "APPROVED");
  const ready = approved.filter(isDiagnosticItemStudentReady);
  const notReady = approved.filter((item) => !isDiagnosticItemStudentReady(item));
  const importedNotStudentReady = imported.filter((item) => !isDiagnosticItemStudentReady(item));
  const expectedIds = new Set(Array.from({ length: 120 }, (_, index) => `RB-PILOT-P1P3-${String(index + 1).padStart(3, "0")}`));
  const actualIds = new Set(imported.map((item) => item.id));
  const missing = [...expectedIds].filter((id) => !actualIds.has(id));

  const summary = {
    totalImportedDiagnosticItems: imported.length,
    totalApprovedItems: approved.length,
    totalStudentReadyItems: ready.length,
    itemsNotStudentReadyByReason: groupByReason(importedNotStudentReady),
    strandCoverageCountsStudentReady: diagnosticPoolCoverage(ready).strandCoverage,
    phasePatternCoverageDecodingStudentReady: diagnosticPoolCoverage(ready).decodingCoverage,
    approvedButNotStudentReady: notReady.map((item) => ({ id: item.id, reasons: readinessReasons(item) })),
    importedButNotStudentReady: importedNotStudentReady.map((item) => ({ id: item.id, reviewStatus: item.reviewStatus, itemStatus: item.itemStatus, reasons: readinessReasons(item) })),
    missingExpectedBankItemIds: missing,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (ready.length < 120) process.exitCode = 1;
}

function groupByReason(items: Parameters<typeof readinessReasons>[0][]) {
  const grouped: Record<string, number> = {};
  for (const item of items) {
    for (const reason of readinessReasons(item)) grouped[reason] = (grouped[reason] || 0) + 1;
  }
  return grouped;
}

function readinessReasons(item: {
  reviewStatus?: string | null;
  itemStatus?: string | null;
  retiredAt?: Date | null;
  firstLookReviewModelDecision?: { decisionJson?: unknown } | null;
  audioAssetRequired?: boolean | null;
  audioValidatedByHuman?: boolean | null;
}) {
  const reasons: string[] = [];
  if (item.reviewStatus !== "APPROVED") reasons.push("reviewStatus_not_APPROVED");
  if (item.itemStatus !== "pilot_ready") reasons.push("itemStatus_not_pilot_ready");
  if (item.retiredAt) reasons.push("retired");
  if (failedBlockers(item.firstLookReviewModelDecision?.decisionJson).length) reasons.push("firstLook_FAIL_BLOCKER");
  if (item.audioAssetRequired && !item.audioValidatedByHuman) reasons.push("audioValidatedByHuman_false");
  if (!reasons.length) reasons.push("metadata_or_kid_view_readiness_blocker");
  return reasons;
}

function failedBlockers(decisionJson: unknown) {
  if (!decisionJson || typeof decisionJson !== "object" || Array.isArray(decisionJson)) return [];
  const checks = (decisionJson as Record<string, unknown>).checks;
  if (!Array.isArray(checks)) return [];
  return checks.filter((check) => {
    if (!check || typeof check !== "object" || Array.isArray(check)) return false;
    const record = check as Record<string, unknown>;
    return record.result === "FAIL" && record.severity === "BLOCKER";
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
