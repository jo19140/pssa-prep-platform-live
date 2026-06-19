import assert from "node:assert/strict";

import { buildClassReport } from "../lib/content/pssaClassReport";
import { summarizePssaResponseBuckets } from "../lib/content/pssaFormSession";
import { scorePssaItem } from "../lib/content/pssaScoring";
import { assertNoBannedKeys, projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { bandFor, buildStudentReport, REPORT_VERSION, type PssaReportForm, type PssaReportResponse } from "../lib/content/pssaStudentReport";

const mcqScore = scorePssaItem(mcqItem("mcq", 1), { selectedIndex: 0 });
assert.deepEqual(mcqScore, { status: "scored", pointsEarned: 1, maxPoints: 1, detail: "mcq_correct" });

const ebsrScore = scorePssaItem(ebsrItem("ebsr"), { partAIndex: 0, partBIndices: [1, 2] });
assert.deepEqual(ebsrScore, { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" });

const matchingGridScore = scorePssaItem(matchingGridItem("mg"), { rowSelections: { r1: "c1", r2: "c2", r3: "c3" } });
assert.deepEqual(matchingGridScore, { status: "scored", pointsEarned: 3, maxPoints: 3, detail: "matching_grid_full_credit" });

const splitSummary = summarizePssaResponseBuckets({
  form: {
    items: [
      { id: "op-mcq", pointValue: 1, scoringBucket: "operational" },
      { id: "op-sa", pointValue: 3, scoringBucket: "operational" },
      { id: "an-mcq", pointValue: 1, scoringBucket: "analytics_only" },
      { id: "an-ebsr", pointValue: 2, scoringBucket: "analytics_only" },
      { id: "an-te", pointValue: 3, scoringBucket: "analytics_only" },
    ],
  },
  responses: [
    { formItemId: "op-mcq", maxPoints: 1, scoreStatus: "scored", pointsEarned: 1 },
    { formItemId: "op-sa", maxPoints: 3, scoreStatus: "pending_human_scoring", pointsEarned: null },
    { formItemId: "an-mcq", maxPoints: 1, scoreStatus: "scored", pointsEarned: 1 },
    { formItemId: "an-ebsr", maxPoints: 2, scoreStatus: "pending_human_scoring", pointsEarned: null },
    { formItemId: "an-te", maxPoints: 3, scoreStatus: "scored", pointsEarned: 3 },
  ],
});
assert.deepEqual(splitSummary, {
  totalPoints: 4,
  earnedPoints: 1,
  pendingHumanPoints: 3,
  analyticsTotalPoints: 6,
  analyticsEarnedPoints: 4,
  analyticsPendingHumanPoints: 2,
});

const operationalForm = reportForm(false);
const analyticsForm = reportForm(true);
const operationalResponses = reportResponses(false);
const analyticsResponses = reportResponses(true);
const opReport = buildStudentReport(
  { benchmarkSeason: "MOY", completionStatus: "complete", responses: operationalResponses },
  operationalForm,
  { earnedPoints: 36, totalPoints: 45, pendingHumanPoints: 0, maxOperationalPoints: 45 },
  [],
);
const analyticsReport = buildStudentReport(
  { benchmarkSeason: "MOY", completionStatus: "complete", responses: analyticsResponses },
  analyticsForm,
  { earnedPoints: 36, totalPoints: 45, pendingHumanPoints: 0, maxOperationalPoints: 45 },
  [],
);
assert.equal(REPORT_VERSION, "pssa-ws3b-student-report-v2");
assert.equal(bandFor(36, 45, "complete"), "Strong");
assert.equal(analyticsReport.band, opReport.band, "analytics responses must not change operational readiness band");
assert.equal(analyticsReport.earnedPoints, opReport.earnedPoints, "analytics responses must not change operational earnedPoints");
assert.deepEqual(analyticsReport.clusterResults, opReport.clusterResults, "analytics responses must not change operational cluster results");
assert.equal(analyticsReport.additionalAnalyticsItems.label, "Additional Analytics Items — did not affect the diagnostic score");
assert.equal(analyticsReport.additionalAnalyticsItems.possiblePoints, 8);
assert.equal(analyticsReport.additionalAnalyticsItems.earnedPoints, 8);
assert.equal(analyticsReport.additionalAnalyticsItems.pendingHumanPoints, 0);
assert.equal(analyticsReport.additionalAnalyticsItems.byItem.length, 3);
assert.deepEqual(analyticsReport.additionalAnalyticsItems.byEc.map((row) => [row.eligibleContent, row.earnedPoints, row.possiblePoints]), [
  ["E03.A-C.2.1.1", 3, 3],
  ["E03.A-K.1.1.3", 3, 3],
  ["E03.B-K.1.1.1", 2, 2],
]);

const classReport = buildClassReport([
  { studentId: "s1", report: analyticsReport },
  { studentId: "s2", report: analyticsReport },
  { studentId: "s3", report: analyticsReport },
]);
assert.equal(classReport.additionalAnalyticsItems.label, "Additional Analytics Items — did not affect the diagnostic score");
assert.equal(classReport.additionalAnalyticsItems.possiblePoints, 24);
assert.equal(classReport.additionalAnalyticsItems.earnedPoints, 24);
assert.equal(classReport.medianOperationalScore, 36);

const dto = projectPssaStudentItem({
  interactionType: "MCQ",
  interactionSubtype: "single_select",
  pointValue: 1,
  scoringBucket: "analytics_only",
  responseSpecJson: { prompt: "Question", choices: [{ text: "A" }, { text: "B", distractorRole: "unsupported_inference" }] },
});
assertNoBannedKeys(dto);
assert.equal(JSON.stringify(dto).includes("scoringBucket"), false, "student DTO must not expose scoringBucket");

const moySummary = summarizePssaResponseBuckets(moySessionFixture());
assert.equal(moySessionFixture().form.items.length, 40, "MOY-shaped fixture delivers 40 items");
assert.deepEqual(moySummary, {
  totalPoints: 45,
  earnedPoints: 45,
  pendingHumanPoints: 0,
  analyticsTotalPoints: 8,
  analyticsEarnedPoints: 8,
  analyticsPendingHumanPoints: 0,
});

console.log("PSSA Phase 4A analytics-only scoring tests passed.");

function mcqItem(itemId: string, totalPoints: number) {
  return {
    itemId,
    interactionType: "MCQ",
    responseSpecJson: { choices: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }] },
    correctResponseJson: { correctIndex: 0 },
    scoringJson: { totalPoints },
  };
}

function ebsrItem(itemId: string) {
  return {
    itemId,
    interactionType: "EBSR",
    responseSpecJson: {
      partA: { choices: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }] },
      partB: { choices: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }] },
    },
    correctResponseJson: { partA: { correctIndex: 0 }, partB: { correctIndices: [1, 2] } },
    scoringJson: { totalPoints: 2, partAPoints: 1, partBPoints: 1, requirePartACorrectForFullCredit: true },
  };
}

function matchingGridItem(itemId: string) {
  return {
    itemId,
    interactionType: "MATCHING_GRID",
    responseSpecJson: {
      rows: [{ rowId: "r1" }, { rowId: "r2" }, { rowId: "r3" }],
      columns: [{ columnId: "c1" }, { columnId: "c2" }, { columnId: "c3" }],
    },
    correctResponseJson: { correctCells: [{ rowId: "r1", columnId: "c1" }, { rowId: "r2", columnId: "c2" }, { rowId: "r3", columnId: "c3" }] },
    scoringJson: { totalPoints: 3 },
  };
}

function reportForm(includeAnalytics: boolean): PssaReportForm {
  const operationalItems = [
    ...Array.from({ length: 15 }, (_, index) => reportItem(`op-k-${index}`, "E03.A-K.1.1.3", "A", 1)),
    ...Array.from({ length: 10 }, (_, index) => reportItem(`op-c-${index}`, "E03.B-C.3.1.1", "B", 1)),
    ...Array.from({ length: 10 }, (_, index) => reportItem(`op-d-${index}`, "E03.D.1.1.1", "D", 1)),
  ];
  const analyticsItems = includeAnalytics ? [
    reportItem("an-k-1", "E03.A-K.1.1.3", "A", 3, "analytics_only"),
    reportItem("an-k-2", "E03.B-K.1.1.1", "B", 2, "analytics_only"),
    reportItem("an-c-1", "E03.A-C.2.1.1", "A", 3, "analytics_only"),
  ] : [];
  return { formId: "moy-shaped", items: [...operationalItems, ...analyticsItems] };
}

function reportItem(itemId: string, eligibleContent: string, reportingCategory: string, pointValue: number, scoringBucket: "operational" | "analytics_only" = "operational") {
  return {
    itemId,
    eligibleContent,
    reportingCategory,
    interactionType: "MCQ",
    correctIndex: 0,
    scoringBucket,
    choices: [{ text: "A" }, { text: "B" }],
    pointValue,
  } as any;
}

function reportResponses(includeAnalytics: boolean): PssaReportResponse[] {
  const operational = (reportForm(false).items ?? []).map((item, index) => ({
    itemId: item.itemId!,
    selectedIndex: 0,
    isCorrect: index < 26,
    scoreStatus: "scored",
    pointsEarned: index < 26 ? 1 : 0,
    maxPoints: index < 25 ? 1 : index === 25 ? 11 : 0,
    scoringBucket: "operational",
  }));
  const analytics = includeAnalytics ? [
    { itemId: "an-k-1", selectedIndex: 0, isCorrect: true, scoreStatus: "scored", pointsEarned: 3, maxPoints: 3, scoringBucket: "analytics_only" },
    { itemId: "an-k-2", selectedIndex: 0, isCorrect: true, scoreStatus: "scored", pointsEarned: 2, maxPoints: 2, scoringBucket: "analytics_only" },
    { itemId: "an-c-1", selectedIndex: 0, isCorrect: true, scoreStatus: "scored", pointsEarned: 3, maxPoints: 3, scoringBucket: "analytics_only" },
  ] : [];
  return [...operational, ...analytics] as PssaReportResponse[];
}

function moySessionFixture() {
  const operationalItems = Array.from({ length: 35 }, (_, index) => ({ id: `op-${index}`, pointValue: index < 34 ? 1 : 11, scoringBucket: "operational" as const }));
  const analyticsItems = [
    { id: "an-1", pointValue: 1, scoringBucket: "analytics_only" as const },
    { id: "an-2", pointValue: 1, scoringBucket: "analytics_only" as const },
    { id: "an-3", pointValue: 2, scoringBucket: "analytics_only" as const },
    { id: "an-4", pointValue: 2, scoringBucket: "analytics_only" as const },
    { id: "an-5", pointValue: 2, scoringBucket: "analytics_only" as const },
  ];
  const items = [...operationalItems, ...analyticsItems];
  return {
    form: { items },
    responses: items.map((item) => ({ formItemId: item.id, maxPoints: item.pointValue, scoreStatus: "scored", pointsEarned: item.pointValue })),
  };
}
