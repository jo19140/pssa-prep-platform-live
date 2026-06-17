import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { MAPPING_VERSION, deriveStudentInsights } from "@/lib/content/pssaInsightMapping";
import {
  REPORT_VERSION,
  bandFor,
  buildStudentReport,
  clusterOf,
  type PssaReportForm,
  type PssaReportResponse,
} from "@/lib/content/pssaStudentReport";

const bannedPhrases = [
  "the student believes",
  "the student cannot",
  "definitely",
  "guessed",
  "Below Basic",
  "Basic",
  "Proficient",
  "Advanced",
];

function mcq(itemId: string, eligibleContent: string, role = "unsupported_inference", reportingCategory = "A") {
  return {
    itemId,
    interactionType: "MCQ",
    eligibleContent,
    reportingCategory,
    correctIndex: 0,
    structuredChoicesJson: [
      { text: "Correct", isCorrect: true, distractorRole: null },
      { text: "Distractor", isCorrect: false, distractorRole: role },
    ],
  };
}

function form(items: PssaReportForm["items"]): PssaReportForm {
  return {
    formId: "synthetic-report-form",
    formVersion: "synthetic-v1",
    items,
  };
}

const baseItems = [
  mcq("k1", "E03.A-K.1.1.1", "unsupported_inference"),
  mcq("k2", "E03.A-K.1.1.2", "unsupported_inference"),
  mcq("k3", "E03.A-K.1.1.3", "wrong_section"),
  mcq("c1", "E03.A-C.2.1.1", "wrong_emphasis"),
  mcq("c2", "E03.A-C.2.1.2", "wrong_emphasis"),
  mcq("c3", "E03.A-C.2.1.3", "wrong_emphasis"),
  mcq("v1", "E03.B-V.4.1.1", "plausible_misreading"),
  mcq("v2", "E03.B-V.4.1.2", "plausible_misreading"),
  mcq("d1", "E03.D.1.1.1", "missing_quotation_marks", "D"),
  mcq("d2", "E03.D.1.1.2", "missing_closing_mark", "D"),
  mcq("d3", "E03.D.1.1.3", "marks_around_wrong_words", "D"),
  { itemId: "te1", interactionType: "DRAG_DROP", eligibleContent: "E03.A-K.1.1.4", reportingCategory: "A" },
  { itemId: "sa1", interactionType: "SHORT_ANSWER", eligibleContent: "E03.A-C.2.1.4", reportingCategory: "A" },
  { itemId: "ebsr1", interactionType: "EBSR", eligibleContent: "E03.A-K.1.1.5", reportingCategory: "A" },
];

const baseForm = form(baseItems);

const diagnosticItems = loadDiagnosticItems();
assert(diagnosticItems.length > 0, "diagnostic fixture items must be discoverable");
const diagnosticCoverage = diagnosticItems.map((item) => ({ itemId: item.itemId ?? item.id ?? "unknown", cluster: clusterOf(item) }));

assert.equal(clusterOf(baseItems[0]), "Key Ideas & Evidence");
assert.equal(clusterOf(baseItems[3]), "Craft & Structure");
assert.equal(clusterOf(baseItems[6]), "Vocabulary");
assert.equal(clusterOf(baseItems[8]), "Conventions");
assert.throws(() => clusterOf({ itemId: "bad", eligibleContent: "E03.A-X.1", reportingCategory: "A" }), /pssa_report_unclusterable_item:bad/);

assert.equal(bandFor(36, 45, "complete"), "Strong");
assert.equal(bandFor(35, 45, "complete"), "Developing");
assert.equal(bandFor(27, 45, "complete"), "Developing");
assert.equal(bandFor(26, 45, "complete"), "Needs support");
assert.equal(bandFor(44, 45, "incomplete"), "Incomplete");

const responses: PssaReportResponse[] = [
  { itemId: "k1", selectedIndex: 1, isCorrect: false, pointsEarned: 0, maxPoints: 1 },
  { itemId: "k2", selectedIndex: 1, isCorrect: false, pointsEarned: 0, maxPoints: 1 },
  { itemId: "k3", selectedIndex: 0, isCorrect: true, pointsEarned: 1, maxPoints: 1 },
  { itemId: "c1", selectedIndex: 1, isCorrect: false, pointsEarned: 0, maxPoints: 1 },
  { itemId: "c2", selectedIndex: 1, isCorrect: false, pointsEarned: 0, maxPoints: 1 },
  { itemId: "c3", selectedIndex: 1, isCorrect: false, pointsEarned: 0, maxPoints: 1 },
  { itemId: "v1", selectedIndex: 0, isCorrect: true, pointsEarned: 1, maxPoints: 1 },
  { itemId: "v2", selectedIndex: 0, isCorrect: true, pointsEarned: 1, maxPoints: 1 },
  { itemId: "d1", selectedIndex: 0, isCorrect: true, pointsEarned: 1, maxPoints: 1 },
  { itemId: "d2", selectedIndex: 1, isCorrect: false, pointsEarned: 0, maxPoints: 1 },
  { itemId: "d3", selectedIndex: 0, isCorrect: true, pointsEarned: 1, maxPoints: 1 },
  { itemId: "te1", isCorrect: false, scoreStatus: "invalid_response", pointsEarned: 0, maxPoints: 3 },
  { itemId: "sa1", isCorrect: false, scoreStatus: "pending_human_scoring", pointsEarned: null, maxPoints: 3 },
  { itemId: "ebsr1", isCorrect: false, scoreStatus: "scored", pointsEarned: 1, maxPoints: 2 },
];

const attempt = { benchmarkSeason: "fall", completionStatus: "complete", responses };
const insights = deriveStudentInsights({
  benchmarkSeason: "fall",
  responses: responses.map((response) => ({ itemId: response.itemId, selectedIndex: response.selectedIndex, isCorrect: response.isCorrect })),
}, baseForm as any);
const report = buildStudentReport(attempt, baseForm, { earnedPoints: 32, totalPoints: 45, pendingHumanPoints: 3 }, insights);
const reportWithoutInsights = buildStudentReport(attempt, baseForm, { earnedPoints: 32, totalPoints: 45, pendingHumanPoints: 3 }, []);

assert.equal(report.reportVersion, REPORT_VERSION);
assert.equal(report.mappingVersion, MAPPING_VERSION);
assert.equal(report.benchmarkSeason, "fall");
assert.equal(report.formId, "synthetic-report-form");
assert.equal(report.formVersion, "synthetic-v1");
assert.equal(report.scoreStatus, "provisional");
assert.equal(report.pendingHumanScore, true);
assert.equal(report.band, "Developing");
assert(report.likelyPatterns.length > 0, "likely patterns must be consumed from WS3-A");
assert.equal(reportWithoutInsights.likelyPatterns.length, 0, "WS3-B must not rederive patterns without WS3-A input");
assert.equal(report.clusterResults.every((row) => typeof row.itemsTotal === "number" && typeof row.itemsCorrect === "number"), true);

const thinCluster = report.clusterResults.find((row) => row.cluster === "Vocabulary")!;
assert.equal(thinCluster.signal, "limited_evidence");
assert.notEqual(report.priorityCluster, "Vocabulary");
assert.notEqual(report.strongestCluster, "Vocabulary");

const missedMcq = report.missedReview.find((row) => row.itemId === "k1")!;
assert(missedMcq.responseSignal.length > 0);
assert(missedMcq.teacherMove.length > 0);
const missedNonMcq = report.missedReview.filter((row) => ["te1", "sa1", "ebsr1"].includes(row.itemId));
assert.equal(missedNonMcq.length, 3);
for (const row of missedNonMcq) {
  assert.equal(row.responseSignal, "");
  assert.equal(row.teacherMove, "");
}

assert.equal(report.priorityCluster, "Craft & Structure", "lowest non-limited percent should be priority");
assert.equal(report.strongestCluster, "Conventions", "highest non-limited percent should be strongest after limited clusters are excluded");
assert(report.recommendedNextStep && report.recommendedNextStep.length > 0);
assert.equal(
  report.recommendedNextStep,
  insights.find((row) => row.roleFamily === "wrong_emphasis")?.teacherMove,
  "priority-cluster next step should reuse WS3-A teacher moves when available",
);

const incomplete = buildStudentReport({ benchmarkSeason: "winter", completionStatus: "incomplete", responses }, baseForm, { earnedPoints: 44, totalPoints: 45, pendingHumanPoints: 0 }, insights);
assert.equal(incomplete.scoreStatus, "incomplete");
assert.equal(incomplete.band, "Incomplete");
assert.equal(incomplete.priorityCluster, null);
assert.equal(incomplete.strongestCluster, null);
assert.equal(incomplete.recommendedNextStep, null);

const correctResponses = baseItems.map((item) => ({ itemId: item.itemId!, selectedIndex: 0, isCorrect: true, pointsEarned: 1, maxPoints: 1 }));
const correctOnly = buildStudentReport(
  { benchmarkSeason: "spring", completionStatus: "complete", responses: correctResponses },
  baseForm,
  { earnedPoints: 45, totalPoints: 45, pendingHumanPoints: 0 },
  [],
);
assert.equal(correctOnly.scoreStatus, "final");
assert.equal(correctOnly.band, "Strong");
assert.equal(correctOnly.likelyPatterns.length, 0);
assert.equal(correctOnly.missedReview.length, 0);

const tieForm = form([
  mcq("tk1", "E03.A-K.1.1.1"),
  mcq("tk2", "E03.A-K.1.1.2"),
  mcq("tk3", "E03.A-K.1.1.3"),
  mcq("tc1", "E03.A-C.2.1.1"),
  mcq("tc2", "E03.A-C.2.1.2"),
  mcq("tc3", "E03.A-C.2.1.3"),
]);
const tieResponses = ["tk1", "tc1"].map((itemId) => ({ itemId, selectedIndex: 1, isCorrect: false, pointsEarned: 0, maxPoints: 1 }))
  .concat(["tk2", "tk3", "tc2", "tc3"].map((itemId) => ({ itemId, selectedIndex: 0, isCorrect: true, pointsEarned: 1, maxPoints: 1 })));
const tieReport = buildStudentReport({ benchmarkSeason: "fall", completionStatus: "complete", responses: tieResponses }, tieForm, { earnedPoints: 4, totalPoints: 6, pendingHumanPoints: 0 }, []);
assert.equal(tieReport.priorityCluster, "Key Ideas & Evidence", "priority tie breaks by fixed cluster order");
assert.equal(tieReport.strongestCluster, "Key Ideas & Evidence", "strongest tie breaks by fixed cluster order");

const thinOnlyForm = form([
  mcq("thin-k1", "E03.A-K.1.1.1"),
  mcq("thin-c1", "E03.A-C.2.1.1"),
  mcq("thin-v1", "E03.B-V.4.1.1"),
  mcq("thin-d1", "E03.D.1.1.1", "missing_quotation_marks", "D"),
]);
const thinOnly = buildStudentReport({ benchmarkSeason: "fall", completionStatus: "complete", responses: [] }, thinOnlyForm, { earnedPoints: 0, totalPoints: 4, pendingHumanPoints: 0 }, []);
assert.equal(thinOnly.priorityCluster, null, "all-thin evidence cannot create a priority cluster");
assert.equal(thinOnly.strongestCluster, null, "all-thin evidence cannot create a strongest cluster");
assert.equal(thinOnly.recommendedNextStep, null, "all-thin evidence cannot create a next step");

const deterministicA = buildStudentReport(attempt, baseForm, { earnedPoints: 32, totalPoints: 45, pendingHumanPoints: 3 }, insights);
const deterministicB = buildStudentReport(attempt, baseForm, { earnedPoints: 32, totalPoints: 45, pendingHumanPoints: 3 }, insights);
assert.deepEqual(deterministicA, deterministicB);

const generatedText = JSON.stringify([report, incomplete, correctOnly, tieReport]);
for (const phrase of bannedPhrases) assert.equal(generatedText.includes(phrase), false, `generated report text must not include ${phrase}`);

console.log("WS3-B cluster coverage:");
for (const item of diagnosticCoverage) console.log(`${item.itemId} -> ${item.cluster}`);
console.log("PSSA WS3-B student report tests passed.");

function loadDiagnosticItems(): PssaReportForm["items"] {
  const fixtureDir = path.join(process.cwd(), "exemplars", "pssa_grade3_stamina_pilot");
  const files = fs.readdirSync(fixtureDir).filter((file) => file.endsWith(".json")).sort();
  const items: PssaReportForm["items"] = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), "utf8"));
    collectItems(data, items);
  }
  return items.filter((item) => (item.itemId ?? item.id) && item.eligibleContent);
}

function collectItems(value: unknown, out: PssaReportForm["items"]): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectItems(entry, out);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if ((typeof record.itemId === "string" || typeof record.id === "string") && typeof record.eligibleContent === "string") {
    out.push(record as PssaReportForm["items"][number]);
    return;
  }
  for (const child of Object.values(record)) collectItems(child, out);
}
