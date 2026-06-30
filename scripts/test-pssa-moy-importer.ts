import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

import {
  GRADE3_MOY_IMPORT_MANIFEST,
  buildEoyPlan,
  buildMoyPlan,
  buildPlan,
  buildPlanForBenchmark,
  stableStringify,
  type ImportPlan,
  type WouldImportItem,
} from "./content/lib/pssa-import-plan";
import { parseArgs } from "./content/write-pssa-items";
import { benchmarkForBatchId, currentPlanSourceCorpusHash } from "../lib/content/pssaItemReview";

const EXPECTED_TYPE_COUNTS: Record<string, number> = {
  MCQ: 23,
  INLINE_DROPDOWN: 9,
  EBSR: 3,
  MATCHING_GRID: 2,
  SHORT_ANSWER: 2,
  DRAG_DROP: 1,
};

const EXPECTED_BATCHES: Record<string, string> = {
  MCQ: "reading_mcq_grade3_moy",
  EBSR: "ebsr_grade3_moy",
  MATCHING_GRID: "matching_grid_grade3_moy",
  DRAG_DROP: "drag_drop_grade3_moy",
  CONVENTIONS: "conventions_grade3_moy",
  SHORT_ANSWER: "short_answer_grade3_moy",
};

function countByType(items: WouldImportItem[]) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.interactionType] = (counts[item.interactionType] ?? 0) + 1;
  return counts;
}

function corpusHashForPlan(plan: ImportPlan) {
  return stableStringify([
    ...plan.passages.map((row) => row.contentHash),
    ...plan.activeItems.map((row) => row.contentHash),
    ...plan.deprecatedItems.map((row) => row.contentHash),
  ].sort());
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
    { streamType: "MCQ", batchId: EXPECTED_BATCHES.MCQ, expectedCount: 23 },
    { streamType: "EBSR", batchId: EXPECTED_BATCHES.EBSR, expectedCount: 3 },
    { streamType: "MATCHING_GRID", batchId: EXPECTED_BATCHES.MATCHING_GRID, expectedCount: 2 },
    { streamType: "DRAG_DROP", batchId: EXPECTED_BATCHES.DRAG_DROP, expectedCount: 1 },
    { streamType: "INLINE_DROPDOWN conventions", batchId: EXPECTED_BATCHES.CONVENTIONS, expectedCount: 9 },
    { streamType: "SHORT_ANSWER", batchId: EXPECTED_BATCHES.SHORT_ANSWER, expectedCount: 2 },
  ].map((row) => {
    const batch = plan.batches.find((candidate) => candidate.batchId === row.batchId);
    const items = plan.activeItems.filter((item) => item.batchId === row.batchId);
    return {
      ...row,
      auditReused: "schema-aware benchmark checks",
      itemLevelResults: true,
      actualCount: items.length,
      batchResult: batch?.batchResult,
      blocked: items.filter((item) => item.finalImportEligibility !== "eligible").map((item) => item.itemId),
      failedGateCount: items.reduce((sum, item) => sum + failingGates(item).length, 0),
    };
  });
}

function assertMoyPlan(plan: ImportPlan) {
  assert.equal(plan.passages.length, 5);
  assert.equal(plan.passageGroups.length, 1);
  assert.equal(plan.passageGroups[0]?.groupId, "pssa_pg_g3_moy_p3_mail_paired");
  assert.deepEqual(plan.passageGroups[0]?.members.map((member) => [member.slot, member.passageId]), [
    ["passage_1", "pssa_psg_g3_moy_p3_letter_travels"],
    ["passage_2", "pssa_psg_g3_moy_p3_carrier_day"],
  ]);
  assert.equal(plan.activeItems.length, 40);
  assert.equal(plan.deprecatedItems.length, 0);
  assert.equal(plan.supersessions.length, 0);
  assert.equal(plan.batches.length, 6);
  assert.equal(plan.sourceScanFailures, 0);
  assert.equal(plan.hashStable, true);
  assert.deepEqual(countByType(plan.activeItems), EXPECTED_TYPE_COUNTS);
  assert.equal(plan.manifest.every((row) => row.match), true, "MOY manifest rows must match expected counts");
  assert.equal(plan.batches.every((batch) => batch.batchResult === "PASS"), true, "MOY batch gates must pass");

  const dragDrop = plan.activeItems.find((item) => item.itemId === "pssa_item_g3_moy_p1_ao5_dd_bc313");
  assert.equal(dragDrop?.finalImportEligibility, "eligible", "MOY DRAG_DROP item must pass import eligibility");
  assert.equal(dragDrop?.gates.PSSA_MOY_IMPORT_CORRECT_RESPONSE_VALID, "PASS", "MOY DRAG_DROP correctAssignments must validate against tokens/targets");

  for (const crossTextId of ["pssa_item_g3_moy_p3_mcq_bc312", "pssa_item_g3_moy_p3_ebsr_bc312"]) {
    const item = plan.activeItems.find((row) => row.itemId === crossTextId);
    assert.equal(item?.passageGroupId, "pssa_pg_g3_moy_p3_mail_paired", `${crossTextId} must carry the MOY P3 passage group`);
    assert.deepEqual(item?.requiredEvidenceSlotsJson, ["passage_1", "passage_2"], `${crossTextId} must preserve required evidence slots`);
    assert.equal(item?.finalImportEligibility, "eligible", `${crossTextId} must be import-eligible`);
  }

  for (const item of plan.activeItems) {
    assert.equal(item.ecResolved, true, `${item.itemId} must resolve against the crosswalk`);
    assert.equal(item.finalImportEligibility, "eligible", `${item.itemId} must be import-eligible`);
    assert.deepEqual(item.blockedReasons, [], `${item.itemId} must have no blocked import reasons`);
    assert.deepEqual(failingGates(item), [], `${item.itemId} must have no failing import gates`);
  }
}

function assertNoFoundationStreamAuditsInBenchmarkPath() {
  const source = fs.readFileSync("scripts/content/lib/pssa-import-plan.ts", "utf8");
  const start = source.indexOf("function buildDiagnosticBenchmarkPlan");
  const end = source.indexOf("export function buildEoyPlan", start);
  assert.notEqual(start, -1, "buildDiagnosticBenchmarkPlan must exist");
  assert.notEqual(end, -1, "buildEoyPlan must follow buildDiagnosticBenchmarkPlan");
  const body = source.slice(start, end);
  for (const forbidden of [
    "manifestConfig.audits",
    "auditGrade3EbsrItems",
    "auditGrade3ConventionsItems",
    "auditGrade3MatchingGridDragDropItems",
    "auditGrade3ShortAnswerItems",
    "auditGrade3TeiItems",
  ]) {
    assert.equal(body.includes(forbidden), false, `diagnostic benchmark build path must not call ${forbidden}`);
  }
}

function assertSelector() {
  assert.equal(parseArgs(["--grade", "3"]).benchmark, "foundation");
  assert.equal(parseArgs(["--grade", "3", "--benchmark", "foundation"]).benchmark, "foundation");
  assert.equal(parseArgs(["--grade", "3", "--benchmark=eoy"]).benchmark, "eoy");
  assert.equal(parseArgs(["--grade", "3", "--benchmark", "moy"]).benchmark, "moy");
  assert.throws(() => parseArgs(["--grade", "3", "--benchmark", "winter"]), /Unsupported --benchmark: winter\..*moy/);

  assert.equal(parseArgs(["--grade", "3", "--benchmark", "moy", "--write", "--env", "dev"]).benchmark, "moy");
  assertMoyPlan(buildPlanForBenchmark({ grade: 3, benchmark: "moy" }));
  assert.throws(() => buildPlanForBenchmark({ grade: 4, benchmark: "moy" }), /No PSSA moy import manifest registered for grade 4\./);
}

function assertNoWriteDryRun() {
  const output = execFileSync("./node_modules/.bin/tsx", [
    "scripts/content/write-pssa-items.ts",
    "--grade",
    "3",
    "--benchmark",
    "moy",
  ], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
  });
  assert.match(output, /PSSA DB-4 dry run complete\./);
  assert.match(output, /Benchmark=moy/);
  assert.match(output, /Passages=5, active=40, deprecated=0, supersessions=0, batches=6/);
  assert.match(output, /Gate failures=0, sourceScanFailures=0, hashStable=true/);
}

const planA = buildMoyPlan();
const planB = buildMoyPlan();
assert.equal(planSignature(planA), planSignature(planB), "MOY plan must be deterministic across two runs");
assertMoyPlan(planA);
assertNoFoundationStreamAuditsInBenchmarkPath();
assertSelector();
assertNoWriteDryRun();

const moyHash = corpusHashForPlan(planA);
assert.equal(currentPlanSourceCorpusHash(3, "moy"), moyHash, "MOY corpus hash must match the MOY importer's stamped hash recipe");
assert.notEqual(moyHash, corpusHashForPlan(buildPlan(3)), "MOY and foundation corpus hashes should be distinct");
assert.notEqual(moyHash, corpusHashForPlan(buildEoyPlan()), "MOY and EOY corpus hashes should be distinct");
for (const batchId of Object.values(GRADE3_MOY_IMPORT_MANIFEST.batchIds).filter(Boolean)) {
  assert.equal(benchmarkForBatchId(batchId), "moy", `${batchId} must resolve to moy`);
}

console.log("MOY import-eligibility stream report:");
for (const row of streamReport(planA)) console.log(JSON.stringify(row));
console.log("PSSA MOY benchmark importer tests passed.");
