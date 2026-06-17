import assert from "node:assert/strict";

import { MAPPING_VERSION, type PssaStudentInsight, type RoleFamily } from "@/lib/content/pssaInsightMapping";
import {
  CLASS_REPORT_VERSION,
  buildClassReport,
  type StudentReportInput,
} from "@/lib/content/pssaClassReport";
import {
  CLUSTER_ORDER,
  REPORT_VERSION,
  type PssaReportBand,
  type PssaReportCluster,
  type PssaStudentReport,
} from "@/lib/content/pssaStudentReport";

const bannedPhrases = [
  "the class cannot",
  "the class believes",
  "definitely",
  "guessed",
  "Below Basic",
  "Basic",
  "Proficient",
  "Advanced",
];

const mainCohort = [
  student("s01", { earnedPoints: 45, band: "Strong", priorityCluster: "Key Ideas & Evidence", patterns: [pattern("unsupported_inference", "Key Ideas & Evidence", "k1")] }),
  student("s02", { earnedPoints: 40, band: "Strong", priorityCluster: "Key Ideas & Evidence", patterns: [pattern("unsupported_inference", "Key Ideas & Evidence", "k2")] }),
  student("s03", { earnedPoints: 36, band: "Strong", priorityCluster: "Key Ideas & Evidence", patterns: [pattern("unsupported_inference", "Key Ideas & Evidence", "k3")] }),
  student("s04", { earnedPoints: 35, band: "Developing", priorityCluster: "Craft & Structure", patterns: [pattern("unsupported_inference", "Key Ideas & Evidence", "k4"), pattern("wrong_emphasis", "Craft & Structure", "c1"), pattern("plausible_misreading", "Craft & Structure", "c4")] }),
  student("s05", { earnedPoints: 34, band: "Developing", priorityCluster: "Craft & Structure", patterns: [pattern("wrong_emphasis", "Craft & Structure", "c2"), pattern("plausible_misreading", "Craft & Structure", "c5")] }),
  student("s06", { earnedPoints: 33, band: "Developing", priorityCluster: "Craft & Structure", patterns: [pattern("wrong_emphasis", "Craft & Structure", "c3"), pattern("plausible_misreading", "Craft & Structure", "c6")] }),
  student("s07", { earnedPoints: 32, band: "Developing", priorityCluster: "Vocabulary", patterns: [pattern("plausible_misreading", "Vocabulary", "v1")] }),
  student("s08", { earnedPoints: 31, band: "Developing", priorityCluster: "Vocabulary", patterns: [pattern("plausible_misreading", "Vocabulary", "v2")] }),
  student("s09", { earnedPoints: 30, band: "Developing", priorityCluster: "Vocabulary", patterns: [pattern("plausible_misreading", "Vocabulary", "v3")] }),
  student("s10", { earnedPoints: 29, band: "Developing", priorityCluster: "Conventions", patterns: [pattern("quotation_marks", "Conventions", "d1")] }),
  student("s11", { earnedPoints: 28, band: "Developing", priorityCluster: "Conventions", patterns: [pattern("quotation_marks", "Conventions", "d2")] }),
  student("s12", { earnedPoints: 20, band: "Needs support", priorityCluster: "Conventions", patterns: [] }),
  student("s13", { scoreStatus: "incomplete", earnedPoints: null, band: "Incomplete", priorityCluster: null, patterns: [pattern("unsupported_inference", "Key Ideas & Evidence", "ignored")] }),
];

const classReport = buildClassReport(mainCohort);

assert.equal(classReport.classReportVersion, CLASS_REPORT_VERSION);
assert.equal(classReport.reportVersion, REPORT_VERSION);
assert.equal(classReport.mappingVersion, MAPPING_VERSION);
assert.equal(classReport.formId, "synthetic-form");
assert.equal(classReport.benchmarkSeason, "fall");
assert.equal(classReport.formVersion, "synthetic-v1");
assert.equal(classReport.assignedStudents, 13);
assert.equal(classReport.completedStudents, 12);
assert.equal(classReport.incompleteStudents, 1);
assert.deepEqual(classReport.scoreStatusCounts, { final: 11, provisional: 1, incomplete: 1 });
assert.equal(classReport.medianOperationalScore, 32.5);
assert.deepEqual(classReport.bandDistribution, { Strong: 3, Developing: 8, "Needs support": 1, Incomplete: 1 });

const keyEvidence = entry("Key Ideas & Evidence", "unsupported_inference");
assert.equal(keyEvidence.studentsAffected, 4);
assert.equal(keyEvidence.sharePct, 33.33);
assert.equal(keyEvidence.classLabel, "high_priority_class_trend");
assert.deepEqual(keyEvidence.studentIds, ["s01", "s02", "s03", "s04"]);
assert.equal(keyEvidence.totalResponses, 4);
assert.equal(keyEvidence.recommendedSkill, "unsupported_inference skill");

const craftWrong = entry("Craft & Structure", "wrong_emphasis");
assert.equal(craftWrong.studentsAffected, 3);
assert.equal(craftWrong.sharePct, 25);
assert.equal(craftWrong.classLabel, "class_trend");

const craftPlausible = entry("Craft & Structure", "plausible_misreading");
assert.equal(craftPlausible.studentsAffected, 3);
assert.equal(craftPlausible.classLabel, "class_trend");

const vocabPlausible = entry("Vocabulary", "plausible_misreading");
assert.equal(vocabPlausible.studentsAffected, 3);
assert.equal(vocabPlausible.classLabel, "below_threshold", "limited evidence clusters cannot get a class verdict");
assert.equal(classReport.suggestedGroups.some((group) => group.cluster === "Vocabulary"), false);

const keyGroup = classReport.suggestedGroups.find((group) => group.cluster === "Key Ideas & Evidence" && group.roleFamily === "unsupported_inference")!;
assert.deepEqual(keyGroup.studentIds, ["s01", "s02", "s03"], "group membership must use priority cluster, not every affected student");
assert.equal(keyGroup.label, "Evidence Builders");

const craftGroups = classReport.suggestedGroups.filter((group) => group.cluster === "Craft & Structure");
assert.equal(craftGroups.length, 1, "first qualifying group assignment should suppress a second group for the same students");
assert.deepEqual(craftGroups[0].studentIds, ["s04", "s05", "s06"]);
assert.equal(new Set(classReport.suggestedGroups.flatMap((group) => group.studentIds)).size, classReport.suggestedGroups.flatMap((group) => group.studentIds).length, "a student may appear in at most one group");

const conventionsMap = entry("Conventions", "quotation_marks");
assert.equal(conventionsMap.classLabel, "below_threshold");
assert.equal(classReport.suggestedGroups.some((group) => group.cluster === "Conventions"), false, "entries with fewer than two priority-need members should not form groups");

assert.notEqual(classReport.topPriorityCluster, "Vocabulary");
assert(classReport.topClassInsight?.startsWith("Several students may benefit from"), "top insight must be hedged");

const smallGroupCohort = Array.from({ length: 13 }, (_, index) => student(`g${String(index + 1).padStart(2, "0")}`, {
  earnedPoints: 35 - index,
  band: index < 10 ? "Developing" : "Needs support",
  priorityCluster: index < 3 ? "Key Ideas & Evidence" : "Craft & Structure",
  patterns: index < 3 ? [pattern("too_narrow", "Key Ideas & Evidence", `sg${index}`)] : [],
}));
const smallGroupReport = buildClassReport(smallGroupCohort);
assert.equal(findEntry(smallGroupReport, "Key Ideas & Evidence", "too_narrow").classLabel, "small_group_opportunity");
assert.deepEqual(smallGroupReport.suggestedGroups.find((group) => group.roleFamily === "too_narrow")?.studentIds, ["g01", "g02", "g03"]);

const belowThresholdReport = buildClassReport([
  student("b1", { patterns: [pattern("wrong_section", "Key Ideas & Evidence", "b1")] }),
  student("b2", { patterns: [pattern("wrong_section", "Key Ideas & Evidence", "b2")] }),
  student("b3", { patterns: [] }),
  student("b4", { patterns: [] }),
]);
assert.equal(findEntry(belowThresholdReport, "Key Ideas & Evidence", "wrong_section").classLabel, "below_threshold");
assert.equal(belowThresholdReport.suggestedGroups.length, 0, "below-threshold entries must stay mapped but not grouped");

assert.throws(
  () => buildClassReport([student("m1", {}), student("m2", { formId: "other-form" })]),
  /pssa_class_report_mixed_formId/,
);
assert.throws(
  () => buildClassReport([student("m1", {}), student("m2", { benchmarkSeason: "winter" })]),
  /pssa_class_report_mixed_benchmarkSeason/,
);
assert.throws(
  () => buildClassReport([student("u1", { patterns: [pattern("unsupported_inference", "Key Ideas & Evidence", "missing", { omitMissedReview: true })] })]),
  /pssa_class_report_unresolved_evidence_cluster:u1:missing/,
);

const allCorrect = buildClassReport([
  student("a1", { earnedPoints: 45, band: "Strong", priorityCluster: null, patterns: [] }),
  student("a2", { earnedPoints: 44, band: "Strong", priorityCluster: null, patterns: [] }),
  student("a3", { earnedPoints: 43, band: "Strong", priorityCluster: null, patterns: [] }),
]);
assert.equal(allCorrect.misconceptionMap.length, 0);
assert.equal(allCorrect.suggestedGroups.length, 0);
assert.equal(allCorrect.topClassInsight, null);

const deterministicA = buildClassReport(mainCohort);
const deterministicB = buildClassReport(mainCohort.slice().reverse());
assert.deepEqual(deterministicA, deterministicB, "input order must not affect class report output");

const generatedText = JSON.stringify([classReport, smallGroupReport, belowThresholdReport, allCorrect]);
for (const phrase of bannedPhrases) assert.equal(generatedText.includes(phrase), false, `generated class report text must not include ${phrase}`);

console.log("WS3-C misconception labels:", classReport.misconceptionMap.map((row) => `${row.cluster}/${row.roleFamily}=${row.classLabel}`).join("; "));
console.log("WS3-C suggested groups:", classReport.suggestedGroups.map((group) => `${group.label}:${group.studentIds.join(",")}`).join("; "));
console.log("PSSA WS3-C class report tests passed.");

function student(studentId: string, opts: {
  formId?: string;
  benchmarkSeason?: string;
  formVersion?: string;
  scoreStatus?: "final" | "provisional" | "incomplete";
  earnedPoints?: number | null;
  band?: PssaReportBand;
  priorityCluster?: PssaReportCluster | null;
  patterns?: ReturnType<typeof pattern>[];
}): StudentReportInput {
  const scoreStatus = opts.scoreStatus ?? (studentId === "s06" ? "provisional" : "final");
  const report: PssaStudentReport = {
    reportVersion: REPORT_VERSION,
    mappingVersion: MAPPING_VERSION,
    benchmarkSeason: opts.benchmarkSeason ?? "fall",
    formId: opts.formId ?? "synthetic-form",
    formVersion: opts.formVersion ?? "synthetic-v1",
    scoreStatus,
    pendingHumanScore: scoreStatus === "provisional",
    earnedPoints: opts.earnedPoints ?? 30,
    maxPoints: 45,
    band: opts.band ?? "Developing",
    clusterResults: clusterRows(scoreStatus === "incomplete"),
    priorityCluster: opts.priorityCluster ?? "Key Ideas & Evidence",
    strongestCluster: "Key Ideas & Evidence",
    recommendedNextStep: null,
    likelyPatterns: (opts.patterns ?? []).map((row) => row.insight),
    missedReview: (opts.patterns ?? []).filter((row) => !row.omitMissedReview).map((row) => ({
      itemId: row.itemId,
      cluster: row.cluster,
      itemType: "MCQ",
      pointsEarned: 0,
      maxPoints: 1,
      responseSignal: "Synthetic signal.",
      teacherMove: row.insight.teacherMove,
      evidenceItemIds: [row.itemId],
    })),
  };
  return { studentId, report };
}

function pattern(roleFamily: RoleFamily, cluster: PssaReportCluster, itemId: string, opts: { omitMissedReview?: boolean } = {}): {
  itemId: string;
  cluster: PssaReportCluster;
  omitMissedReview: boolean;
  insight: PssaStudentInsight;
} {
  return {
    itemId,
    cluster,
    omitMissedReview: opts.omitMissedReview ?? false,
    insight: {
      mappingVersion: MAPPING_VERSION,
      benchmarkSeason: "fall",
      formId: "synthetic-form",
      formVersion: "synthetic-v1",
      confidence: "likely" as const,
      roleFamily,
      interpretation: `Possible pattern for ${roleFamily}.`,
      teacherMove: `Practice ${roleFamily.replace(/_/g, " ")} with text evidence.`,
      recommendedSkill: `${roleFamily} skill`,
      evidence: [{ itemId, roleFamily, distractorRole: `${roleFamily}_distractor`, clusterId: "passage-not-report-cluster" }],
    },
  };
}

function clusterRows(incomplete: boolean): PssaStudentReport["clusterResults"] {
  return CLUSTER_ORDER.map((cluster) => {
    const limitedEvidence = cluster === "Vocabulary" || incomplete;
    const percent = cluster === "Craft & Structure" ? 0.55 : cluster === "Conventions" ? 0.5 : cluster === "Vocabulary" ? 1 : 0.7;
    return {
      cluster,
      itemsCorrect: Math.round(percent * 10),
      itemsTotal: 10,
      usableItems: 10,
      earnedPoints: Math.round(percent * 10),
      maxPoints: 10,
      percent,
      signal: limitedEvidence ? "limited_evidence" as const : percent >= 0.8 ? "strong" as const : percent >= 0.6 ? "developing" as const : "needs_support" as const,
      limitedEvidence,
    };
  });
}

function entry(cluster: PssaReportCluster, roleFamily: RoleFamily) {
  return findEntry(classReport, cluster, roleFamily);
}

function findEntry(report: ReturnType<typeof buildClassReport>, cluster: PssaReportCluster, roleFamily: RoleFamily) {
  const row = report.misconceptionMap.find((entry) => entry.cluster === cluster && entry.roleFamily === roleFamily);
  assert(row, `expected map entry for ${cluster}/${roleFamily}`);
  return row;
}
