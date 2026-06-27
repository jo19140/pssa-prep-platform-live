import {
  MAPPING_VERSION,
  type PssaStudentInsight,
  type RoleFamily,
} from "@/lib/content/pssaInsightMapping";
import {
  CLUSTER_ORDER,
  REPORT_VERSION,
  type PssaClusterSignal,
  type PssaAdditionalAnalyticsItems,
  type PssaAnalyticsDokRow,
  type PssaDokCategoryRow,
  type PssaDokSummaryRow,
  type PssaReportBand,
  type PssaReportCluster,
  type PssaStudentReport,
} from "@/lib/content/pssaStudentReport";

export const CLASS_REPORT_VERSION = "pssa-ws3c-class-report-v1";

export type StudentReportInput = {
  studentId: string;
  report: PssaStudentReport;
};

export type ClassMisconceptionLabel =
  | "high_priority_class_trend"
  | "class_trend"
  | "small_group_opportunity"
  | "below_threshold";

export type ClassClusterResult = {
  cluster: PssaReportCluster;
  completedStudents: number;
  usableStudents: number;
  studentsNeedingSupport: number;
  classPercent: number | null;
  signal: PssaClusterSignal;
  limitedEvidence: boolean;
};

export type ClassMisconceptionMapEntry = {
  cluster: PssaReportCluster;
  roleFamily: RoleFamily;
  classLabel: ClassMisconceptionLabel;
  studentsAffected: number;
  sharePct: number;
  totalResponses: number;
  studentIds: string[];
  interpretation: string;
  recommendedAction: string;
  recommendedSkill?: string;
};

export type SuggestedClassGroup = {
  groupId: string;
  label: string;
  cluster: PssaReportCluster;
  roleFamily: RoleFamily;
  classLabel: Exclude<ClassMisconceptionLabel, "below_threshold">;
  studentIds: string[];
  recommendedAction: string;
  recommendedSkill?: string;
};

export type ClassAnalyticsItemsSummary = PssaAdditionalAnalyticsItems & {
  studentCount: number;
};

export type ClassDokSummaryRow = PssaDokSummaryRow;

export type ClassDokCategoryRow = PssaDokCategoryRow;

export type ClassReport = {
  classReportVersion: typeof CLASS_REPORT_VERSION;
  reportVersion: typeof REPORT_VERSION;
  mappingVersion: typeof MAPPING_VERSION;
  benchmarkSeason: string;
  formId: string;
  formVersion?: string;
  assignedStudents: number;
  completedStudents: number;
  incompleteStudents: number;
  scoreStatusCounts: { final: number; provisional: number; incomplete: number };
  medianOperationalScore: number | null;
  bandDistribution: Record<PssaReportBand, number>;
  clusterResults: ClassClusterResult[];
  topPriorityCluster: PssaReportCluster | null;
  topClassInsight: string | null;
  misconceptionMap: ClassMisconceptionMapEntry[];
  suggestedGroups: SuggestedClassGroup[];
  byDok?: ClassDokSummaryRow[];
  byDokCategory?: ClassDokCategoryRow[];
  additionalAnalyticsItems: ClassAnalyticsItemsSummary;
};

type BuildClassReportOptions = {
  formId?: string;
  benchmarkSeason?: string;
  formVersion?: string;
};

type PatternContribution = {
  studentId: string;
  cluster: PssaReportCluster;
  roleFamily: RoleFamily;
  evidenceCount: number;
  insight: PssaStudentInsight;
};

const labelSeverity: Record<Exclude<ClassMisconceptionLabel, "below_threshold">, number> = {
  high_priority_class_trend: 0,
  class_trend: 1,
  small_group_opportunity: 2,
};

export function buildClassReport(studentReports: StudentReportInput[], opts: BuildClassReportOptions = {}): ClassReport {
  const inputs = studentReports.slice().sort((a, b) => a.studentId.localeCompare(b.studentId));
  const formId = commonField(inputs, "formId", opts.formId ?? "unknown");
  const benchmarkSeason = commonField(inputs, "benchmarkSeason", opts.benchmarkSeason ?? "unknown");
  const formVersion = opts.formVersion ?? commonOptionalField(inputs, "formVersion");
  const completed = inputs.filter((input) => input.report.scoreStatus !== "incomplete");
  const scoreStatusCounts = countStatuses(inputs);
  const clusterResults = buildClassClusterResults(completed);
  const limitedClusters = new Set(clusterResults.filter((row) => row.limitedEvidence).map((row) => row.cluster));
  const contributions = buildPatternContributions(completed);
  const misconceptionMap = buildMisconceptionMap(contributions, completed.length, limitedClusters);
  const suggestedGroups = buildSuggestedGroups(misconceptionMap, completed, contributions);
  const topPriorityCluster = chooseTopPriorityCluster(clusterResults);
  const topClassInsight = buildTopClassInsight(misconceptionMap);
  const byDok = buildClassByDok(completed);
  const byDokCategory = buildClassByDokCategory(completed);
  const additionalAnalyticsItems = buildClassAnalyticsItems(completed);

  return {
    classReportVersion: CLASS_REPORT_VERSION,
    reportVersion: REPORT_VERSION,
    mappingVersion: MAPPING_VERSION,
    benchmarkSeason,
    formId,
    ...(formVersion ? { formVersion } : {}),
    assignedStudents: inputs.length,
    completedStudents: completed.length,
    incompleteStudents: inputs.length - completed.length,
    scoreStatusCounts,
    medianOperationalScore: median(completed.map((input) => input.report.earnedPoints).filter(isNumber)),
    bandDistribution: buildBandDistribution(inputs),
    clusterResults,
    topPriorityCluster,
    topClassInsight,
    misconceptionMap,
    suggestedGroups,
    byDok,
    byDokCategory,
    additionalAnalyticsItems,
  };
}

function buildClassAnalyticsItems(inputs: StudentReportInput[]): ClassAnalyticsItemsSummary {
  const studentBlocks = inputs.map((input) => input.report.additionalAnalyticsItems).filter(Boolean);
  const byItem = studentBlocks.flatMap((block) => block.byItem);
  const analyticsByDok = buildClassAnalyticsByDok(studentBlocks);
  const byEcMap = new Map<string, { earnedPoints: number; possiblePoints: number; pendingHumanPoints: number }>();
  for (const block of studentBlocks) {
    for (const row of block.byEc) {
      const existing = byEcMap.get(row.eligibleContent) ?? { earnedPoints: 0, possiblePoints: 0, pendingHumanPoints: 0 };
      existing.earnedPoints += row.earnedPoints;
      existing.possiblePoints += row.possiblePoints;
      existing.pendingHumanPoints += row.pendingHumanPoints;
      byEcMap.set(row.eligibleContent, existing);
    }
  }
  const earnedPoints = studentBlocks.reduce((sum, block) => sum + block.earnedPoints, 0);
  const possiblePoints = studentBlocks.reduce((sum, block) => sum + block.possiblePoints, 0);
  const pendingHumanPoints = studentBlocks.reduce((sum, block) => sum + block.pendingHumanPoints, 0);
  return {
    label: "Additional Analytics Items — did not affect the diagnostic score",
    studentCount: inputs.length,
    earnedPoints,
    possiblePoints,
    pendingHumanPoints,
    percent: possiblePoints > 0 ? Math.round((earnedPoints / possiblePoints) * 1000) / 10 : null,
    byItem,
    byEc: [...byEcMap].map(([eligibleContent, row]) => ({
      eligibleContent,
      ...row,
      percent: row.possiblePoints > 0 ? Math.round((row.earnedPoints / row.possiblePoints) * 1000) / 10 : null,
    })).sort((a, b) => a.eligibleContent.localeCompare(b.eligibleContent)),
    analyticsByDok,
  };
}

function buildClassByDok(inputs: StudentReportInput[]): ClassDokSummaryRow[] {
  const grouped = new Map<number, ClassDokSummaryRow>();
  for (const input of inputs) {
    for (const row of input.report.byDok ?? []) {
      const existing = grouped.get(row.dok) ?? {
        dok: row.dok,
        itemCount: 0,
        operationalPoints: 0,
        earnedPoints: 0,
        pendingHumanPoints: 0,
      };
      existing.itemCount += row.itemCount;
      existing.operationalPoints += row.operationalPoints;
      existing.earnedPoints += row.earnedPoints;
      existing.pendingHumanPoints += row.pendingHumanPoints;
      grouped.set(row.dok, existing);
    }
  }
  return [1, 2, 3].map((dok) => grouped.get(dok) ?? {
    dok: dok as ClassDokSummaryRow["dok"],
    itemCount: 0,
    operationalPoints: 0,
    earnedPoints: 0,
    pendingHumanPoints: 0,
  });
}

function buildClassByDokCategory(inputs: StudentReportInput[]): ClassDokCategoryRow[] {
  const grouped = new Map<string, ClassDokCategoryRow>();
  for (const input of inputs) {
    for (const row of input.report.byDokCategory ?? []) {
      const key = `${row.dok}:${row.reportingCategory}`;
      const existing = grouped.get(key) ?? {
        dok: row.dok,
        reportingCategory: row.reportingCategory,
        itemCount: 0,
        operationalPoints: 0,
        earnedPoints: 0,
        pendingHumanPoints: 0,
      };
      existing.itemCount += row.itemCount;
      existing.operationalPoints += row.operationalPoints;
      existing.earnedPoints += row.earnedPoints;
      existing.pendingHumanPoints += row.pendingHumanPoints;
      grouped.set(key, existing);
    }
  }
  return [...grouped.values()].sort((a, b) => {
    if (a.dok !== b.dok) return a.dok - b.dok;
    return a.reportingCategory.localeCompare(b.reportingCategory);
  });
}

function buildClassAnalyticsByDok(blocks: PssaAdditionalAnalyticsItems[]): PssaAnalyticsDokRow[] {
  const grouped = new Map<number, number>();
  for (const block of blocks) {
    for (const row of block.analyticsByDok ?? []) {
      grouped.set(row.dok, (grouped.get(row.dok) ?? 0) + row.itemCount);
    }
  }
  return [1, 2, 3].map((dok) => ({
    dok: dok as PssaAnalyticsDokRow["dok"],
    itemCount: grouped.get(dok) ?? 0,
  }));
}

function buildPatternContributions(inputs: StudentReportInput[]): PatternContribution[] {
  const contributions: PatternContribution[] = [];
  for (const input of inputs) {
    const missedClusterByItem = new Map(input.report.missedReview.map((row) => [row.itemId, row.cluster]));
    for (const insight of input.report.likelyPatterns) {
      const countsByCluster = new Map<PssaReportCluster, number>();
      for (const evidence of insight.evidence) {
        const cluster = missedClusterByItem.get(evidence.itemId);
        if (!cluster) {
          throw new Error(`pssa_class_report_unresolved_evidence_cluster:${input.studentId}:${evidence.itemId}`);
        }
        countsByCluster.set(cluster, (countsByCluster.get(cluster) ?? 0) + 1);
      }
      for (const [cluster, evidenceCount] of countsByCluster) {
        contributions.push({
          studentId: input.studentId,
          cluster,
          roleFamily: insight.roleFamily,
          evidenceCount,
          insight,
        });
      }
    }
  }
  return contributions.sort(compareContributions);
}

function buildMisconceptionMap(
  contributions: PatternContribution[],
  completedCount: number,
  limitedClusters: Set<PssaReportCluster>,
): ClassMisconceptionMapEntry[] {
  const grouped = new Map<string, {
    cluster: PssaReportCluster;
    roleFamily: RoleFamily;
    studentIds: Set<string>;
    totalResponses: number;
    insight: PssaStudentInsight;
  }>();

  for (const contribution of contributions) {
    const key = mapKey(contribution.cluster, contribution.roleFamily);
    if (!grouped.has(key)) {
      grouped.set(key, {
        cluster: contribution.cluster,
        roleFamily: contribution.roleFamily,
        studentIds: new Set(),
        totalResponses: 0,
        insight: contribution.insight,
      });
    }
    const row = grouped.get(key)!;
    row.studentIds.add(contribution.studentId);
    row.totalResponses += contribution.evidenceCount;
  }

  return [...grouped.values()]
    .map((row) => {
      const studentsAffected = row.studentIds.size;
      const share = completedCount > 0 ? studentsAffected / completedCount : 0;
      const classLabel = limitedClusters.has(row.cluster) ? "below_threshold" : labelFor(studentsAffected, share);
      return {
        cluster: row.cluster,
        roleFamily: row.roleFamily,
        classLabel,
        studentsAffected,
        sharePct: roundPct(share * 100),
        totalResponses: row.totalResponses,
        studentIds: [...row.studentIds].sort(),
        interpretation: row.insight.interpretation,
        recommendedAction: row.insight.teacherMove,
        ...(row.insight.recommendedSkill ? { recommendedSkill: row.insight.recommendedSkill } : {}),
      };
    })
    .sort(compareMapEntries);
}

function buildSuggestedGroups(
  misconceptionMap: ClassMisconceptionMapEntry[],
  completed: StudentReportInput[],
  contributions: PatternContribution[],
): SuggestedClassGroup[] {
  const roleSetByStudent = new Map<string, Set<string>>();
  for (const contribution of contributions) {
    const set = roleSetByStudent.get(contribution.studentId) ?? new Set<string>();
    set.add(mapKey(contribution.cluster, contribution.roleFamily));
    roleSetByStudent.set(contribution.studentId, set);
  }
  const reportByStudent = new Map(completed.map((input) => [input.studentId, input.report]));
  const assigned = new Set<string>();
  const groups: SuggestedClassGroup[] = [];

  for (const candidate of misconceptionMap.filter(isActionableEntry).sort(compareGroupCandidates)) {
    const key = mapKey(candidate.cluster, candidate.roleFamily);
    const studentIds = candidate.studentIds.filter((studentId) => {
      if (assigned.has(studentId)) return false;
      const report = reportByStudent.get(studentId);
      return report?.priorityCluster === candidate.cluster && roleSetByStudent.get(studentId)?.has(key);
    });
    if (studentIds.length < 2) continue;
    for (const studentId of studentIds) assigned.add(studentId);
    groups.push({
      groupId: `${candidate.cluster}:${candidate.roleFamily}`.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase(),
      label: groupLabel(candidate.cluster, candidate.roleFamily),
      cluster: candidate.cluster,
      roleFamily: candidate.roleFamily,
      classLabel: candidate.classLabel,
      studentIds,
      recommendedAction: candidate.recommendedAction,
      ...(candidate.recommendedSkill ? { recommendedSkill: candidate.recommendedSkill } : {}),
    });
  }
  return groups;
}

function buildClassClusterResults(completed: StudentReportInput[]): ClassClusterResult[] {
  return CLUSTER_ORDER.map((cluster) => {
    const rows = completed.map((input) => input.report.clusterResults.find((row) => row.cluster === cluster)).filter(Boolean);
    const usableRows = rows.filter((row) => row && !row.limitedEvidence && row.percent !== null);
    const pointRows = usableRows.filter((row) => typeof row?.earnedPoints === "number" && typeof row.maxPoints === "number" && row.maxPoints > 0);
    const limitedEvidence = usableRows.length < 3;
    const classPercent = limitedEvidence ? null : aggregateClusterPercent(usableRows, pointRows);
    return {
      cluster,
      completedStudents: completed.length,
      usableStudents: usableRows.length,
      studentsNeedingSupport: rows.filter((row) => row?.signal === "needs_support").length,
      classPercent,
      signal: limitedEvidence ? "limited_evidence" : signalFor(classPercent ?? 0),
      limitedEvidence,
    };
  });
}

function aggregateClusterPercent(
  usableRows: NonNullable<PssaStudentReport["clusterResults"][number]>[],
  pointRows: NonNullable<PssaStudentReport["clusterResults"][number]>[],
) {
  if (pointRows.length === usableRows.length) {
    const earned = pointRows.reduce((sum, row) => sum + (row.earnedPoints ?? 0), 0);
    const max = pointRows.reduce((sum, row) => sum + (row.maxPoints ?? 0), 0);
    return max > 0 ? earned / max : null;
  }
  const percentRows = usableRows.filter((row) => row.percent !== null);
  return percentRows.length ? percentRows.reduce((sum, row) => sum + (row.percent ?? 0), 0) / percentRows.length : null;
}

function chooseTopPriorityCluster(clusterResults: ClassClusterResult[]) {
  const candidates = clusterResults.filter((row) => !row.limitedEvidence && row.classPercent !== null);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => {
    const delta = (a.classPercent ?? 0) - (b.classPercent ?? 0);
    if (delta !== 0) return delta;
    return CLUSTER_ORDER.indexOf(a.cluster) - CLUSTER_ORDER.indexOf(b.cluster);
  })[0].cluster;
}

function buildTopClassInsight(misconceptionMap: ClassMisconceptionMapEntry[]) {
  const top = misconceptionMap.filter(isActionableEntry).sort(compareGroupCandidates)[0];
  if (!top) return null;
  return `Several students may benefit from ${top.recommendedSkill ?? groupLabel(top.cluster, top.roleFamily)} practice in ${top.cluster}.`;
}

function commonField(inputs: StudentReportInput[], field: "formId" | "benchmarkSeason", fallback: string) {
  if (!inputs.length) return fallback;
  const value = inputs[0].report[field];
  for (const input of inputs) {
    if (input.report[field] !== value) throw new Error(`pssa_class_report_mixed_${field}`);
  }
  return value;
}

function commonOptionalField(inputs: StudentReportInput[], field: "formVersion") {
  const values = new Set(inputs.map((input) => input.report[field]).filter(Boolean));
  return values.size === 1 ? String([...values][0]) : undefined;
}

function countStatuses(inputs: StudentReportInput[]) {
  return inputs.reduce((counts, input) => {
    counts[input.report.scoreStatus] += 1;
    return counts;
  }, { final: 0, provisional: 0, incomplete: 0 });
}

function buildBandDistribution(inputs: StudentReportInput[]): Record<PssaReportBand, number> {
  const distribution: Record<PssaReportBand, number> = { Strong: 0, Developing: 0, "Needs support": 0, Incomplete: 0 };
  for (const input of inputs) {
    if (input.report.scoreStatus === "incomplete") distribution.Incomplete += 1;
    else distribution[input.report.band] += 1;
  }
  return distribution;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function labelFor(studentsAffected: number, share: number): ClassMisconceptionLabel {
  if (studentsAffected < 3) return "below_threshold";
  if (share >= 0.33) return "high_priority_class_trend";
  if (share >= 0.25) return "class_trend";
  return "small_group_opportunity";
}

function groupLabel(cluster: PssaReportCluster, roleFamily: RoleFamily) {
  if (cluster === "Key Ideas & Evidence" && roleFamily === "too_narrow") return "Main Idea Support";
  if (cluster === "Key Ideas & Evidence") return "Evidence Builders";
  if (cluster === "Vocabulary") return "Vocabulary in Context";
  if (cluster === "Craft & Structure") return "Structure & Craft";
  if (cluster === "Conventions") return "Conventions Check";
  return cluster;
}

function isActionableEntry(entry: ClassMisconceptionMapEntry): entry is ClassMisconceptionMapEntry & { classLabel: Exclude<ClassMisconceptionLabel, "below_threshold"> } {
  return entry.classLabel !== "below_threshold";
}

function compareMapEntries(a: ClassMisconceptionMapEntry, b: ClassMisconceptionMapEntry) {
  if (b.studentsAffected !== a.studentsAffected) return b.studentsAffected - a.studentsAffected;
  const clusterDelta = CLUSTER_ORDER.indexOf(a.cluster) - CLUSTER_ORDER.indexOf(b.cluster);
  if (clusterDelta !== 0) return clusterDelta;
  return a.roleFamily.localeCompare(b.roleFamily);
}

function compareGroupCandidates(a: ClassMisconceptionMapEntry & { classLabel: Exclude<ClassMisconceptionLabel, "below_threshold"> }, b: ClassMisconceptionMapEntry & { classLabel: Exclude<ClassMisconceptionLabel, "below_threshold"> }) {
  const severityDelta = labelSeverity[a.classLabel] - labelSeverity[b.classLabel];
  if (severityDelta !== 0) return severityDelta;
  if (b.studentsAffected !== a.studentsAffected) return b.studentsAffected - a.studentsAffected;
  const clusterDelta = CLUSTER_ORDER.indexOf(a.cluster) - CLUSTER_ORDER.indexOf(b.cluster);
  if (clusterDelta !== 0) return clusterDelta;
  return a.roleFamily.localeCompare(b.roleFamily);
}

function compareContributions(a: PatternContribution, b: PatternContribution) {
  return `${a.studentId}:${a.cluster}:${a.roleFamily}`.localeCompare(`${b.studentId}:${b.cluster}:${b.roleFamily}`);
}

function mapKey(cluster: PssaReportCluster, roleFamily: RoleFamily) {
  return `${cluster}::${roleFamily}`;
}

function signalFor(percent: number): PssaClusterSignal {
  if (percent >= 0.8) return "strong";
  if (percent >= 0.6) return "developing";
  return "needs_support";
}

function roundPct(value: number) {
  return Math.round(value * 100) / 100;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
