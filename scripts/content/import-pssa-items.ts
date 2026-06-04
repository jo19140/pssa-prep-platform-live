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
  let grade: number | null = null;
  if (args.includes("--write")) {
    throw new Error("writes are DB-4; run the DB-4 step.");
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "--db-aware") continue;
    if (arg === "--grade") {
      grade = Number(args[i + 1]);
      i += 1;
    } else if (arg.startsWith("--grade=")) {
      grade = Number(arg.slice("--grade=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(grade)) throw new Error("--grade is required.");
  return { grade: grade!, mode: args.includes("--db-aware") ? "db-aware-dry-run" : "file-only-dry-run" };
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath: string, rows: Record<string, unknown>[], columns: string[]) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function reportPath(baseName: string, gradeLevel: number) {
  if (gradeLevel === 3) return path.join(REPORT_DIR, baseName);
  const extension = path.extname(baseName);
  return path.join(REPORT_DIR, `${baseName.slice(0, -extension.length)}_g${gradeLevel}${extension}`);
}

function writeReports(plan: ImportPlan, mode: string) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  writeCsv(reportPath("pssa_import_dryrun_manifest.csv", plan.gradeLevel), plan.manifest as any, ["sourceFile", "recordType", "count", "expectedCount", "match"]);
  writeCsv(reportPath("pssa_import_dryrun_items.csv", plan.gradeLevel), [...plan.activeItems, ...plan.deprecatedItems].map((item) => ({
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
  writeCsv(reportPath("pssa_import_dryrun_batches.csv", plan.gradeLevel), plan.batches as any, ["batchId", "streamType", "gradeLevel", "batchGate", "batchResult", "itemCount"]);
  const lines = [
    "# PSSA Import Dry-Run Summary",
    "",
    `- Mode: ${mode}`,
    "- 0 records written (DB-3 is dry-run only)",
    `- Passages: ${plan.passages.length} / expected ${plan.manifestConfig.expectedCounts.passages}`,
    `- Active items: ${plan.activeItems.length} / expected ${plan.manifestConfig.expectedCounts.activeItems}`,
    `- Deprecated items: ${plan.deprecatedItems.length} / expected ${plan.manifestConfig.expectedCounts.deprecatedItems}`,
    `- Supersessions: ${plan.supersessions.length} / expected ${plan.manifestConfig.expectedCounts.supersessions}`,
    `- Batches: ${plan.batches.length} / expected ${plan.manifestConfig.expectedCounts.batches}`,
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
  fs.writeFileSync(reportPath("pssa_import_dryrun_summary.md", plan.gradeLevel), lines.join("\n"));
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
  const first = buildPlan(args.grade);
  const second = buildPlan(args.grade);
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

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
