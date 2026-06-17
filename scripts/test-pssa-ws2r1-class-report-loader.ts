import assert from "node:assert/strict";

import {
  assembleClassReport,
  mapLoadedResponse,
  selectReportSession,
  type ClassReportLoaderEntry,
  type LoadedSession,
} from "@/lib/content/pssaClassReportLoader";
import type { PssaReportForm } from "@/lib/content/pssaStudentReport";

const form: PssaReportForm = {
  formId: "form-live",
  formVersion: "sha256:synthetic",
  items: [
    mcq("k1", "E03.A-K.1.1.1", "unsupported_inference"),
    mcq("k2", "E03.A-K.1.1.2", "unsupported_inference"),
    mcq("k3", "E03.A-K.1.1.3", "unsupported_inference"),
    mcq("c1", "E03.A-C.2.1.1", "wrong_emphasis"),
    mcq("c2", "E03.A-C.2.1.2", "wrong_emphasis"),
    mcq("c3", "E03.A-C.2.1.3", "wrong_emphasis"),
    mcq("d1", "E03.D.1.1.1", "missing_quotation_marks", "D"),
    mcq("d2", "E03.D.1.1.2", "missing_quotation_marks", "D"),
    mcq("d3", "E03.D.1.1.3", "missing_quotation_marks", "D"),
  ],
};

const oldSubmitted = submitted(20, "2026-01-01T00:00:00.000Z", wrong("k1", 1), wrong("k2", 1), wrong("k3", 1));
const latestSubmitted = submitted(37, "2026-01-03T00:00:00.000Z", wrong("k1", 1), wrong("k2", 1), wrong("k3", 1), correct("c1"));
const activePartial: LoadedSession = {
  status: "in_progress",
  earnedPoints: null,
  totalPoints: null,
  pendingHumanPoints: null,
  updatedAt: "2026-01-04T00:00:00.000Z",
  responses: [wrong("c1", 1), wrong("c2", 1), wrong("c3", 1)],
};
const invalidated: LoadedSession = {
  status: "invalidated_midflight",
  earnedPoints: 45,
  totalPoints: 45,
  pendingHumanPoints: 0,
  updatedAt: "2026-01-05T00:00:00.000Z",
  responses: [wrong("d1", 1)],
};

assert.equal(selectReportSession([oldSubmitted, activePartial, latestSubmitted])?.earnedPoints, 37, "latest submitted must win over newer in-progress");
assert.equal(selectReportSession([invalidated]), null, "invalidated-only session should be ignored");

const entries: ClassReportLoaderEntry[] = [
  { studentId: "sp1", session: [oldSubmitted, activePartial, latestSubmitted] },
  { studentId: "sp2", session: submitted(35, "2026-01-02T00:00:00.000Z", wrong("k1", 1), wrong("k2", 1), wrong("k3", 1), correct("c1")) },
  { studentId: "sp3", session: submitted(34, "2026-01-02T01:00:00.000Z", wrong("k1", 1), wrong("k2", 1), wrong("k3", 1), correct("c1")) },
  { studentId: "sp4", session: activePartial },
  { studentId: "sp5", session: null },
  { studentId: "sp6", session: invalidated },
];

const report = assembleClassReport(entries, { form, benchmarkSeason: "fall", formId: "form-live", formVersion: "sha256:synthetic" });
assert.equal(report.formId, "form-live");
assert.equal(report.benchmarkSeason, "fall");
assert.equal(report.assignedStudents, 6);
assert.equal(report.completedStudents, 3);
assert.equal(report.incompleteStudents, 3);
assert.deepEqual(report.scoreStatusCounts, { final: 3, provisional: 0, incomplete: 3 });
assert.deepEqual(report.bandDistribution, { Strong: 1, Developing: 2, "Needs support": 0, Incomplete: 3 });
assert.equal(report.medianOperationalScore, 35, "median must use stored session earnedPoints");

const keyTrend = report.misconceptionMap.find((row) => row.cluster === "Key Ideas & Evidence" && row.roleFamily === "unsupported_inference");
assert(keyTrend);
assert.equal(keyTrend.classLabel, "high_priority_class_trend");
assert.deepEqual(keyTrend.studentIds, ["sp1", "sp2", "sp3"], "studentIds must be StudentProfile ids from the wrapper");
assert.equal(report.suggestedGroups.find((group) => group.cluster === "Key Ideas & Evidence")?.studentIds.join(","), "sp1,sp2,sp3");
assert.equal(JSON.stringify(report).includes("sp4"), false, "in-progress partial responses must not enter insight patterns");

const mapped = mapLoadedResponse({
  itemId: "mapped",
  responsePayloadJson: { selectedIndex: 1, selectedChoiceIndex: 2 },
  scoreStatus: "scored",
  pointsEarned: 0,
  maxPoints: 1,
});
assert.deepEqual(mapped, {
  itemId: "mapped",
  selectedIndex: 1,
  selectedChoiceIndex: 2,
  isCorrect: false,
  scoreStatus: "scored",
  pointsEarned: 0,
  maxPoints: 1,
});

const deterministic = assembleClassReport(entries.slice().reverse(), { form, benchmarkSeason: "fall", formId: "form-live", formVersion: "sha256:synthetic" });
assert.deepEqual(report, deterministic);

console.log("WS2-R1 loader proof:", {
  assigned: report.assignedStudents,
  completed: report.completedStudents,
  incomplete: report.incompleteStudents,
  medianOperationalScore: report.medianOperationalScore,
  keyTrend: keyTrend.classLabel,
});
console.log("PSSA WS2-R1 class report loader tests passed.");

function mcq(itemId: string, eligibleContent: string, role: string, reportingCategory = "A") {
  return {
    itemId,
    interactionType: "MCQ",
    eligibleContent,
    reportingCategory,
    correctIndex: 0,
    structuredChoicesJson: [
      { text: "Correct", isCorrect: true, distractorRole: null },
      { text: "Wrong", isCorrect: false, distractorRole: role },
    ],
  };
}

function submitted(earnedPoints: number, submittedAt: string, ...responses: LoadedSession["responses"][number][]): LoadedSession {
  return {
    status: "submitted",
    earnedPoints,
    totalPoints: 45,
    pendingHumanPoints: 0,
    submittedAt,
    updatedAt: submittedAt,
    createdAt: submittedAt,
    responses,
  };
}

function wrong(itemId: string, selectedIndex: number): LoadedSession["responses"][number] {
  return {
    itemId,
    responsePayloadJson: { selectedIndex },
    scoreStatus: "scored",
    pointsEarned: 0,
    maxPoints: 1,
  };
}

function correct(itemId: string): LoadedSession["responses"][number] {
  return {
    itemId,
    responsePayloadJson: { selectedIndex: 0 },
    scoreStatus: "scored",
    pointsEarned: 1,
    maxPoints: 1,
  };
}
