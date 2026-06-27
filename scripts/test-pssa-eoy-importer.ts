import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

import {
  buildEoyPlan,
  buildPlanForBenchmark,
  stableStringify,
  type ImportPlan,
  type WouldImportItem,
} from "./content/lib/pssa-import-plan";
import { parseArgs } from "./content/write-pssa-items";

const EXPECTED_TYPE_COUNTS: Record<string, number> = {
  MCQ: 26,
  INLINE_DROPDOWN: 9,
  MATCHING_GRID: 4,
  EBSR: 4,
  SHORT_ANSWER: 2,
};

const EXPECTED_BATCHES: Record<string, string> = {
  MCQ: "reading_mcq_grade3_eoy",
  EBSR: "ebsr_grade3_eoy",
  MATCHING_GRID: "matching_grid_grade3_eoy",
  CONVENTIONS: "conventions_grade3_eoy",
  SHORT_ANSWER: "short_answer_grade3_eoy",
};

function countByType(items: WouldImportItem[]) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.interactionType] = (counts[item.interactionType] ?? 0) + 1;
  return counts;
}

function planSignature(plan: ImportPlan) {
  return stableStringify({
    passages: plan.passages.map((row) => [row.passageId, row.contentHash]).sort(),
    groups: plan.passageGroups.map((row) => [
      row.groupId,
      row.contentHash,
      row.members.map((member) => [member.slot, member.passageId, member.passageContentHashSnapshot]),
    ]).sort(),
    items: plan.activeItems.map((row) => [row.itemId, row.contentHash, row.batchId, row.finalImportEligibility]).sort(),
    deprecated: plan.deprecatedItems.map((row) => [row.itemId, row.contentHash]).sort(),
    supersessions: plan.supersessions.map((row) => [row.oldItemId, row.newItemId, row.reason]).sort(),
    batches: plan.batches.map((row) => [row.batchId, row.streamType, row.itemCount, row.batchResult]).sort(),
    manifest: plan.manifest.map((row) => [row.recordType, row.count, row.expectedCount, row.match]).sort(),
    sourceScanFailures: plan.sourceScanFailures,
    hashStable: plan.hashStable,
  });
}

function failingGates(item: WouldImportItem) {
  return Object.entries(item.gates).filter(([, status]) => status === "FAIL").map(([gate]) => gate);
}

function streamReport(plan: ImportPlan) {
  return [
    { streamType: "MCQ", batchId: EXPECTED_BATCHES.MCQ, expectedCount: 26, auditReused: "schema-aware EOY checks", itemLevelResults: true },
    { streamType: "EBSR", batchId: EXPECTED_BATCHES.EBSR, expectedCount: 4, auditReused: "schema-aware EOY checks", itemLevelResults: true },
    { streamType: "MATCHING_GRID", batchId: EXPECTED_BATCHES.MATCHING_GRID, expectedCount: 4, auditReused: "schema-aware EOY checks", itemLevelResults: true },
    { streamType: "INLINE_DROPDOWN conventions", batchId: EXPECTED_BATCHES.CONVENTIONS, expectedCount: 9, auditReused: "schema-aware EOY checks", itemLevelResults: true },
    { streamType: "SHORT_ANSWER", batchId: EXPECTED_BATCHES.SHORT_ANSWER, expectedCount: 2, auditReused: "schema-aware EOY checks", itemLevelResults: true },
  ].map((row) => {
    const batch = plan.batches.find((candidate) => candidate.batchId === row.batchId);
    const items = plan.activeItems.filter((item) => item.batchId === row.batchId);
    return {
      ...row,
      actualCount: items.length,
      batchResult: batch?.batchResult,
      blocked: items.filter((item) => item.finalImportEligibility !== "eligible").map((item) => item.itemId),
      failedGateCount: items.reduce((sum, item) => sum + failingGates(item).length, 0),
    };
  });
}

function assertEoyPlan(plan: ImportPlan) {
  assert.equal(plan.passages.length, 5);
  assert.equal(plan.passageGroups.length, 1);
  assert.equal(plan.activeItems.length, 45);
  assert.equal(plan.deprecatedItems.length, 0);
  assert.equal(plan.supersessions.length, 0);
  assert.equal(plan.batches.length, 5);
  assert.equal(plan.sourceScanFailures, 0);
  assert.equal(plan.hashStable, true);
  assert.deepEqual(countByType(plan.activeItems), EXPECTED_TYPE_COUNTS);
  assert.equal(plan.manifest.every((row) => row.match), true, "EOY manifest rows must match expected counts");
  assert.equal(plan.batches.every((batch) => batch.batchResult === "PASS"), true, "EOY batch gates must pass");

  for (const item of plan.activeItems) {
    assert.equal(item.ecResolved, true, `${item.itemId} must resolve against the crosswalk`);
    assert.equal(item.finalImportEligibility, "eligible", `${item.itemId} must be import-eligible`);
    assert.deepEqual(item.blockedReasons, [], `${item.itemId} must have no blocked import reasons`);
    assert.deepEqual(failingGates(item), [], `${item.itemId} must have no failing import gates`);
  }
}

function assertNoFoundationStreamAuditsInEoyPath() {
  const source = fs.readFileSync("scripts/content/lib/pssa-import-plan.ts", "utf8");
  const start = source.indexOf("export function buildEoyPlan()");
  const end = source.indexOf("export function buildPlanForBenchmark", start);
  assert.notEqual(start, -1, "buildEoyPlan must exist");
  assert.notEqual(end, -1, "buildPlanForBenchmark must follow buildEoyPlan");
  const body = source.slice(start, end);
  for (const forbidden of [
    "manifestConfig.audits",
    "auditGrade3EbsrItems",
    "auditGrade3ConventionsItems",
    "auditGrade3MatchingGridDragDropItems",
    "auditGrade3ShortAnswerItems",
    "auditGrade3TeiItems",
  ]) {
    assert.equal(body.includes(forbidden), false, `EOY build path must not call ${forbidden}`);
  }
}

function assertSelector() {
  assert.equal(parseArgs(["--grade", "3"]).benchmark, "foundation");
  assert.equal(parseArgs(["--grade", "3", "--benchmark", "foundation"]).benchmark, "foundation");
  assert.equal(parseArgs(["--grade", "3", "--benchmark=eoy"]).benchmark, "eoy");
  assert.throws(() => parseArgs(["--grade", "3", "--benchmark", "winter"]), /Unsupported --benchmark: winter\. Expected foundation or eoy\./);

  assert.equal(parseArgs(["--grade", "3", "--benchmark", "foundation", "--write", "--env", "dev"]).benchmark, "foundation");
  assertEoyPlan(buildPlanForBenchmark({ grade: 3, benchmark: "eoy" }));
  assert.throws(() => buildPlanForBenchmark({ grade: 3, benchmark: "winter" as any }), /Unsupported PSSA import benchmark/);
}

function assertNoWriteDryRun() {
  const output = execFileSync("./node_modules/.bin/tsx", [
    "scripts/content/write-pssa-items.ts",
    "--grade",
    "3",
    "--benchmark",
    "eoy",
  ], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
  });
  assert.match(output, /PSSA DB-4 dry run complete\./);
  assert.match(output, /Benchmark=eoy/);
  assert.match(output, /Passages=5, active=45, deprecated=0, supersessions=0, batches=5/);
  assert.match(output, /Gate failures=0, sourceScanFailures=0, hashStable=true/);
}

const planA = buildEoyPlan();
const planB = buildEoyPlan();
assert.equal(planSignature(planA), planSignature(planB), "EOY plan must be deterministic across two runs");
assertEoyPlan(planA);
assertNoFoundationStreamAuditsInEoyPath();
assertSelector();
assertNoWriteDryRun();

console.log("EOY import-eligibility stream report:");
for (const row of streamReport(planA)) console.log(JSON.stringify(row));
console.log("PSSA EOY benchmark importer tests passed.");
