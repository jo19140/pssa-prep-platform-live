import fs from "node:fs";
import path from "node:path";

import {
  buildPlan,
  stableStringify,
  tallyGate,
  type ImportPlan,
} from "./lib/pssa-import-plan";

const REPORT_DIR = path.resolve("reports");
const PLAN_MODULE_PATH = path.resolve("scripts/content/lib/pssa-import-plan.ts");

function parseArgs(args: string[]) {
  if (args.includes("--write")) {
    throw new Error("writes are DB-4; run the DB-4 step.");
  }
  return { mode: args.includes("--db-aware") ? "db-aware-dry-run" : "file-only-dry-run" };
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath: string, rows: Record<string, unknown>[], columns: string[]) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function writeReports(plan: ImportPlan, mode: string) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  writeCsv(path.join(REPORT_DIR, "pssa_import_dryrun_manifest.csv"), plan.manifest as any, ["sourceFile", "recordType", "count", "expectedCount", "match"]);
  writeCsv(path.join(REPORT_DIR, "pssa_import_dryrun_items.csv"), [...plan.activeItems, ...plan.deprecatedItems].map((item) => ({
    itemId: item.itemId,
    interactionType: item.interactionType,
    interactionSubtype: item.interactionSubtype,
    gradeLevel: item.gradeLevel,
    eligibleContent: item.eligibleContent,
    ecResolved: item.ecResolved,
    contentHash: item.contentHash,
    reviewStatus: item.reviewStatus,
    itemStatus: item.itemStatus,
    studentReadyBlockedReason: item.studentReadyBlockedReason,
    batchId: item.batchId,
    perGateResults: Object.entries(item.gates).map(([gate, status]) => `${gate}:${status}`).join(";"),
    finalImportEligibility: item.finalImportEligibility,
    blockedReasons: item.blockedReasons.join("|"),
    dbAction: "N/A",
  })), ["itemId", "interactionType", "interactionSubtype", "gradeLevel", "eligibleContent", "ecResolved", "contentHash", "reviewStatus", "itemStatus", "studentReadyBlockedReason", "batchId", "perGateResults", "finalImportEligibility", "blockedReasons", "dbAction"]);
  writeCsv(path.join(REPORT_DIR, "pssa_import_dryrun_batches.csv"), plan.batches as any, ["batchId", "streamType", "gradeLevel", "batchGate", "batchResult", "itemCount"]);
  const lines = [
    "# PSSA Import Dry-Run Summary",
    "",
    `- Mode: ${mode}`,
    "- 0 records written (DB-3 is dry-run only)",
    `- Passages: ${plan.passages.length} / expected 5`,
    `- Active items: ${plan.activeItems.length} / expected 67`,
    `- Deprecated items: ${plan.deprecatedItems.length} / expected 12`,
    `- Supersessions: ${plan.supersessions.length} / expected 12`,
    `- Batches: ${plan.batches.length} / expected 8`,
    `- EC resolved: ${[...plan.activeItems, ...plan.deprecatedItems].filter((item) => item.ecResolved).length}/${plan.activeItems.length + plan.deprecatedItems.length}`,
    `- Approved or pilot_ready would-import records: ${[...plan.activeItems, ...plan.deprecatedItems].filter((item) => String(item.reviewStatus) === "APPROVED" || String(item.itemStatus) === "pilot_ready").length}`,
    `- Preview leak failures: ${[...plan.activeItems, ...plan.deprecatedItems].filter((item) => item.gates.PSSA_IMPORT_NO_LEAK === "FAIL").length}`,
    `- Source scan failures: ${plan.sourceScanFailures}`,
    `- Hash stability: ${plan.hashStable ? "PASS" : "FAIL"}`,
    "- Gate code: reused exported family audit functions and pure shared PSSA audit detectors; did not import top-level report-writing audit bundle.",
    "",
    "## Manifest",
    "",
    "| Record | Expected | Actual | Match |",
    "|---|---:|---:|---|",
    ...plan.manifest.map((row) => `| ${row.recordType} | ${row.expectedCount} | ${row.count} | ${row.match ? "PASS" : "FAIL"} |`),
    "",
    "## Gate Tallies",
    "",
    "| Gate | PASS | FAIL |",
    "|---|---:|---:|",
    ...[...plan.gateTallies.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([gate, tally]) => `| ${gate} | ${tally.pass} | ${tally.fail} |`),
    "",
  ];
  fs.writeFileSync(path.join(REPORT_DIR, "pssa_import_dryrun_summary.md"), lines.join("\n"));
}

function assertNoWrites() {
  const forbidden = /\b(?:db|prisma)\.[A-Za-z0-9_]+\.(?:create|update|upsert|delete|createMany|deleteMany|updateMany)\s*\(|\b(?:db|prisma)\.\$(?:executeRaw|queryRaw)\b/;
  for (const filePath of [new URL(import.meta.url), PLAN_MODULE_PATH]) {
    const source = fs.readFileSync(filePath, "utf8");
    if (forbidden.test(source)) throw new Error(`DB-3 write guard failed; forbidden Prisma write calls present in ${String(filePath)}.`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  assertNoWrites();
  const first = buildPlan();
  const second = buildPlan();
  const firstHashes = [...first.passages.map((row) => row.contentHash), ...first.activeItems.map((row) => row.contentHash), ...first.deprecatedItems.map((row) => row.contentHash)].sort();
  const secondHashes = [...second.passages.map((row) => row.contentHash), ...second.activeItems.map((row) => row.contentHash), ...second.deprecatedItems.map((row) => row.contentHash)].sort();
  first.hashStable = stableStringify(firstHashes) === stableStringify(secondHashes);
  tallyGate(first.gateTallies, "PSSA_IMPORT_HASH_STABLE", first.hashStable ? "PASS" : "FAIL");
  writeReports(first, args.mode);
  const failures = [...first.gateTallies.values()].reduce((sum, tally) => sum + tally.fail, 0);
  console.log(`PSSA DB-3 ${args.mode} complete.`);
  console.log(`Manifest: passages=${first.passages.length}, active=${first.activeItems.length}, deprecated=${first.deprecatedItems.length}, supersessions=${first.supersessions.length}, batches=${first.batches.length}`);
  console.log(`Gate failures: ${failures}`);
  console.log("0 records written (DB-3 is dry-run only).");
  if (failures > 0) process.exitCode = 1;
}

main();
