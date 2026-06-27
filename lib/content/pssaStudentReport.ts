import {
  MAPPING_VERSION,
  mapDistractor,
  type PssaStudentInsight,
} from "@/lib/content/pssaInsightMapping";
import { dokLevelFor, type PssaDokLevel } from "@/lib/content/pssaDokCrosswalk";

export const REPORT_VERSION = "pssa-ws3b-student-report-v2";

export const CLUSTER_ORDER = [
  "Key Ideas & Evidence",
  "Craft & Structure",
  "Vocabulary",
  "Conventions",
] as const;

export type PssaReportCluster = typeof CLUSTER_ORDER[number];
export type PssaReportBand = "Strong" | "Developing" | "Needs support" | "Incomplete";
export type PssaReportScoreStatus = "final" | "provisional" | "incomplete";
export type PssaClusterSignal = "strong" | "developing" | "needs_support" | "limited_evidence";

export type PssaReportItem = {
  itemId?: string;
  id?: string;
  dokLevel?: PssaDokLevel | null;
  eligibleContent?: string | null;
  reportingCategory?: string | null;
  interactionType?: string | null;
  itemType?: string | null;
  correctIndex?: number | null;
  structuredChoicesJson?: unknown;
  answerChoicesJson?: unknown;
  choices?: unknown;
  scoringBucket?: "operational" | "analytics_only" | string | null;
};

export type PssaReportForm = {
  id?: string;
  formId?: string;
  version?: string;
  formVersion?: string;
  blueprintVersion?: string;
  contentHash?: string;
  items?: PssaReportItem[];
};

export type PssaReportAttempt = {
  benchmarkSeason?: string;
  completionStatus?: "complete" | "incomplete" | string;
  responses?: PssaReportResponse[];
};

export type PssaReportResponse = {
  itemId: string;
  selectedIndex?: number | null;
  selectedChoiceIndex?: number | null;
  isCorrect?: boolean | null;
  scoreStatus?: string | null;
  pointsEarned?: number | null;
  maxPoints?: number | null;
  scoringBucket?: "operational" | "analytics_only" | string | null;
};

export type PssaReportScoring = {
  totalPoints?: number | null;
  earnedPoints?: number | null;
  pendingHumanPoints?: number | null;
  maxOperationalPoints?: number | null;
};

export type PssaClusterResult = {
  cluster: PssaReportCluster;
  itemsCorrect: number;
  itemsTotal: number;
  usableItems: number;
  earnedPoints?: number;
  maxPoints?: number;
  percent: number | null;
  signal: PssaClusterSignal;
  limitedEvidence: boolean;
};

export type PssaMissedReviewRow = {
  itemId: string;
  cluster: PssaReportCluster;
  itemType: string;
  pointsEarned?: number | null;
  maxPoints?: number | null;
  responseSignal: string;
  teacherMove: string;
  evidenceItemIds: string[];
};

export type PssaAnalyticsItemRow = {
  itemId: string;
  dokLevel: PssaDokLevel | null;
  cluster: PssaReportCluster;
  eligibleContent: string | null;
  itemType: string;
  pointsEarned: number | null;
  maxPoints: number;
  scoreStatus: string | null;
};

export type PssaAnalyticsEcRow = {
  eligibleContent: string;
  earnedPoints: number;
  possiblePoints: number;
  pendingHumanPoints: number;
  percent: number | null;
};

export type PssaAdditionalAnalyticsItems = {
  label: "Additional Analytics Items — did not affect the diagnostic score";
  earnedPoints: number;
  possiblePoints: number;
  pendingHumanPoints: number;
  percent: number | null;
  byItem: PssaAnalyticsItemRow[];
  byEc: PssaAnalyticsEcRow[];
  analyticsByDok?: PssaAnalyticsDokRow[];
};

export type PssaDokSummaryRow = {
  dok: PssaDokLevel;
  itemCount: number;
  operationalPoints: number;
  earnedPoints: number;
  pendingHumanPoints: number;
};

export type PssaAnalyticsDokRow = {
  dok: PssaDokLevel;
  itemCount: number;
};

export type PssaDokCategoryRow = {
  dok: PssaDokLevel;
  reportingCategory: string;
  itemCount: number;
  operationalPoints: number;
  earnedPoints: number;
  pendingHumanPoints: number;
};

export type PssaStudentReport = {
  reportVersion: typeof REPORT_VERSION;
  mappingVersion: typeof MAPPING_VERSION;
  benchmarkSeason: string;
  formId: string;
  formVersion?: string;
  scoreStatus: PssaReportScoreStatus;
  pendingHumanScore: boolean;
  earnedPoints: number | null;
  maxPoints: number;
  band: PssaReportBand;
  clusterResults: PssaClusterResult[];
  priorityCluster: PssaReportCluster | null;
  strongestCluster: PssaReportCluster | null;
  recommendedNextStep: string | null;
  likelyPatterns: PssaStudentInsight[];
  missedReview: PssaMissedReviewRow[];
  byDok?: PssaDokSummaryRow[];
  byDokCategory?: PssaDokCategoryRow[];
  additionalAnalyticsItems: PssaAdditionalAnalyticsItems;
};

export function clusterOf(item: PssaReportItem): PssaReportCluster {
  if (String(item.reportingCategory ?? "").toUpperCase() === "D") return "Conventions";
  const ec = String(item.eligibleContent ?? "");
  const strand = ec.match(/^E\d{2}\.([A-Z])-([A-Z])\./)?.[2] ?? ec.match(/^E\d{2}\.([A-Z])-/)?.[1];
  if (strand === "K") return "Key Ideas & Evidence";
  if (strand === "C") return "Craft & Structure";
  if (strand === "V") return "Vocabulary";
  throw new Error(`pssa_report_unclusterable_item:${item.itemId ?? item.id ?? "unknown"}`);
}

export function bandFor(score: number, maxScore: number, completionStatus: string): PssaReportBand {
  if (completionStatus === "incomplete") return "Incomplete";
  const percent = maxScore > 0 ? score / maxScore : 0;
  if (score >= 36 && percent >= 0.8) return "Strong";
  if (score >= 27 && percent >= 0.6) return "Developing";
  return "Needs support";
}

export function buildStudentReport(
  attempt: PssaReportAttempt,
  form: PssaReportForm,
  scoring: PssaReportScoring,
  insights: PssaStudentInsight[],
  opts: { benchmarkSeason?: string; formVersion?: string } = {},
): PssaStudentReport {
  const items = form.items ?? [];
  const responses = new Map((attempt.responses ?? []).map((response) => [response.itemId, response]));
  const operationalItems = items.filter(isOperationalItem);
  const operationalResponses = new Map((attempt.responses ?? []).filter((response) => isOperationalResponse(response, items)).map((response) => [response.itemId, response]));
  const complete = attempt.completionStatus !== "incomplete";
  const pendingHumanScore = Number(scoring.pendingHumanPoints ?? 0) > 0;
  const scoreStatus: PssaReportScoreStatus = !complete ? "incomplete" : pendingHumanScore ? "provisional" : "final";
  const maxPoints = Number(scoring.maxOperationalPoints ?? scoring.totalPoints ?? 45);
  const earnedPoints = typeof scoring.earnedPoints === "number" ? scoring.earnedPoints : sumEarnedPoints([...operationalResponses.values()]);
  const band = bandFor(earnedPoints, maxPoints, complete ? "complete" : "incomplete");
  const clusterResults = buildClusterResults(operationalItems, operationalResponses);
  const priorityCluster = complete ? chooseCluster(clusterResults, "priority") : null;
  const strongestCluster = complete ? chooseCluster(clusterResults, "strongest") : null;
  const missedReview = buildMissedReview(operationalItems, operationalResponses);
  const likelyPatterns = insights.slice().sort(compareInsights);
  const byDok = buildByDok(operationalItems, operationalResponses);
  const byDokCategory = buildByDokCategory(operationalItems, operationalResponses);
  const additionalAnalyticsItems = buildAdditionalAnalyticsItems(items, responses);
  const recommendedNextStep = complete
    ? recommendedNextStepFor(priorityCluster, likelyPatterns, missedReview, clusterResults)
    : null;

  return {
    reportVersion: REPORT_VERSION,
    mappingVersion: MAPPING_VERSION,
    benchmarkSeason: opts.benchmarkSeason ?? attempt.benchmarkSeason ?? "unknown",
    formId: form.formId ?? form.id ?? "unknown",
    ...(opts.formVersion || form.formVersion || form.version || form.blueprintVersion || form.contentHash ? { formVersion: String(opts.formVersion ?? form.formVersion ?? form.version ?? form.blueprintVersion ?? form.contentHash) } : {}),
    scoreStatus,
    pendingHumanScore,
    earnedPoints: complete ? earnedPoints : null,
    maxPoints,
    band,
    clusterResults,
    priorityCluster,
    strongestCluster,
    recommendedNextStep,
    likelyPatterns,
    missedReview,
    byDok,
    byDokCategory,
    additionalAnalyticsItems,
  };
}

function buildAdditionalAnalyticsItems(items: PssaReportItem[], responses: Map<string, PssaReportResponse>): PssaAdditionalAnalyticsItems {
  const byItem = items.filter((item) => scoringBucketOfItem(item) === "analytics_only").map((item) => {
    const response = responses.get(itemId(item));
    return {
      itemId: itemId(item),
      dokLevel: itemDokLevel(item),
      cluster: clusterOf(item),
      eligibleContent: item.eligibleContent ?? null,
      itemType: String(item.interactionType ?? item.itemType ?? ""),
      pointsEarned: response?.pointsEarned ?? null,
      maxPoints: response?.maxPoints ?? 0,
      scoreStatus: response?.scoreStatus ?? null,
    };
  });
  const earnedPoints = byItem.reduce((sum, row) => sum + (typeof row.pointsEarned === "number" ? row.pointsEarned : 0), 0);
  const possiblePoints = byItem.reduce((sum, row) => sum + row.maxPoints, 0);
  const pendingHumanPoints = byItem.filter((row) => row.scoreStatus === "pending_human_scoring").reduce((sum, row) => sum + row.maxPoints, 0);
  return {
    label: "Additional Analytics Items — did not affect the diagnostic score",
    earnedPoints,
    possiblePoints,
    pendingHumanPoints,
    percent: possiblePoints > 0 ? Math.round((earnedPoints / possiblePoints) * 1000) / 10 : null,
    byItem,
    byEc: buildAnalyticsByEc(byItem),
    analyticsByDok: buildAnalyticsByDok(byItem),
  };
}

function buildByDok(items: PssaReportItem[], responses: Map<string, PssaReportResponse>): PssaDokSummaryRow[] {
  const grouped = new Map<PssaDokLevel, PssaDokSummaryRow>();
  for (const item of items) {
    const dok = itemDokLevel(item);
    if (!dok) continue;
    const response = responses.get(itemId(item));
    const row = grouped.get(dok) ?? { dok, itemCount: 0, operationalPoints: 0, earnedPoints: 0, pendingHumanPoints: 0 };
    row.itemCount += 1;
    row.operationalPoints += response?.maxPoints ?? 0;
    row.earnedPoints += typeof response?.pointsEarned === "number" ? response.pointsEarned : 0;
    if (response?.scoreStatus === "pending_human_scoring") row.pendingHumanPoints += response.maxPoints ?? 0;
    grouped.set(dok, row);
  }
  return [1, 2, 3].map((dok) => grouped.get(dok as PssaDokLevel) ?? {
    dok: dok as PssaDokLevel,
    itemCount: 0,
    operationalPoints: 0,
    earnedPoints: 0,
    pendingHumanPoints: 0,
  });
}

function buildByDokCategory(items: PssaReportItem[], responses: Map<string, PssaReportResponse>): PssaDokCategoryRow[] {
  const grouped = new Map<string, PssaDokCategoryRow>();
  for (const item of items) {
    const dok = itemDokLevel(item);
    if (!dok) continue;
    const reportingCategory = String(item.reportingCategory ?? "unknown");
    const key = `${dok}:${reportingCategory}`;
    const response = responses.get(itemId(item));
    const row = grouped.get(key) ?? {
      dok,
      reportingCategory,
      itemCount: 0,
      operationalPoints: 0,
      earnedPoints: 0,
      pendingHumanPoints: 0,
    };
    row.itemCount += 1;
    row.operationalPoints += response?.maxPoints ?? 0;
    row.earnedPoints += typeof response?.pointsEarned === "number" ? response.pointsEarned : 0;
    if (response?.scoreStatus === "pending_human_scoring") row.pendingHumanPoints += response.maxPoints ?? 0;
    grouped.set(key, row);
  }
  return [...grouped.values()].sort((a, b) => {
    if (a.dok !== b.dok) return a.dok - b.dok;
    return a.reportingCategory.localeCompare(b.reportingCategory);
  });
}

function buildAnalyticsByEc(items: PssaAnalyticsItemRow[]): PssaAnalyticsEcRow[] {
  const grouped = new Map<string, PssaAnalyticsEcRow>();
  for (const item of items) {
    const eligibleContent = item.eligibleContent ?? "unknown";
    const row = grouped.get(eligibleContent) ?? { eligibleContent, earnedPoints: 0, possiblePoints: 0, pendingHumanPoints: 0, percent: null };
    row.earnedPoints += typeof item.pointsEarned === "number" ? item.pointsEarned : 0;
    row.possiblePoints += item.maxPoints;
    if (item.scoreStatus === "pending_human_scoring") row.pendingHumanPoints += item.maxPoints;
    row.percent = row.possiblePoints > 0 ? Math.round((row.earnedPoints / row.possiblePoints) * 1000) / 10 : null;
    grouped.set(eligibleContent, row);
  }
  return [...grouped.values()].sort((a, b) => a.eligibleContent.localeCompare(b.eligibleContent));
}

function buildAnalyticsByDok(items: PssaAnalyticsItemRow[]): PssaAnalyticsDokRow[] {
  const grouped = new Map<PssaDokLevel, number>();
  for (const item of items) {
    if (!item.dokLevel) continue;
    grouped.set(item.dokLevel, (grouped.get(item.dokLevel) ?? 0) + 1);
  }
  return [1, 2, 3].map((dok) => ({
    dok: dok as PssaDokLevel,
    itemCount: grouped.get(dok as PssaDokLevel) ?? 0,
  }));
}

function buildClusterResults(items: PssaReportItem[], responses: Map<string, PssaReportResponse>) {
  return CLUSTER_ORDER.map((cluster) => {
    const clusterItems = items.filter((item) => clusterOf(item) === cluster);
    let itemsCorrect = 0;
    let pointsKnown = false;
    let earnedPoints = 0;
    let maxPoints = 0;
    for (const item of clusterItems) {
      const response = responses.get(itemId(item));
      if (response?.isCorrect === true) itemsCorrect += 1;
      if (typeof response?.pointsEarned === "number" && typeof response.maxPoints === "number") {
        pointsKnown = true;
        earnedPoints += response.pointsEarned;
        maxPoints += response.maxPoints;
      }
    }
    const itemsTotal = clusterItems.length;
    const percent = itemsTotal > 0 ? itemsCorrect / itemsTotal : null;
    const limitedEvidence = itemsTotal < 3;
    return {
      cluster,
      itemsCorrect,
      itemsTotal,
      usableItems: itemsTotal,
      ...(pointsKnown ? { earnedPoints, maxPoints } : {}),
      percent,
      signal: limitedEvidence ? "limited_evidence" : signalFor(percent ?? 0),
      limitedEvidence,
    };
  });
}

function buildMissedReview(items: PssaReportItem[], responses: Map<string, PssaReportResponse>) {
  const rows: PssaMissedReviewRow[] = [];
  for (const item of items) {
    const response = responses.get(itemId(item));
    if (!response || response.isCorrect === true) continue;
    const cluster = clusterOf(item);
    const itemType = String(item.interactionType ?? item.itemType ?? "");
    const base = {
      itemId: itemId(item),
      cluster,
      itemType,
      pointsEarned: response.pointsEarned,
      maxPoints: response.maxPoints,
      evidenceItemIds: [itemId(item)],
    };
    if (itemType.toUpperCase() === "MCQ") {
      const role = distractorRoleAt(item, selectedIndexOf(response));
      if (role) {
        const mapped = mapDistractor(role);
        rows.push({
          ...base,
          responseSignal: `May reflect ${mapped.roleFamily.replace(/_/g, " ")} on this item.`,
          teacherMove: mapped.teacherMove,
        });
        continue;
      }
    }
    rows.push({ ...base, responseSignal: "", teacherMove: "" });
  }
  return rows.sort((a, b) => a.itemId.localeCompare(b.itemId));
}

function chooseCluster(results: PssaClusterResult[], mode: "priority" | "strongest") {
  const candidates = results.filter((result) => !result.limitedEvidence && result.percent !== null);
  if (!candidates.length) return null;
  const sorted = candidates.sort((a, b) => {
    const delta = mode === "priority" ? (a.percent! - b.percent!) : (b.percent! - a.percent!);
    if (delta !== 0) return delta;
    if (b.itemsTotal !== a.itemsTotal) return b.itemsTotal - a.itemsTotal;
    return CLUSTER_ORDER.indexOf(a.cluster) - CLUSTER_ORDER.indexOf(b.cluster);
  });
  return sorted[0].cluster;
}

function recommendedNextStepFor(
  priorityCluster: PssaReportCluster | null,
  insights: PssaStudentInsight[],
  missedReview: PssaMissedReviewRow[],
  clusterResults: PssaClusterResult[],
) {
  if (!priorityCluster) return null;
  const clusterItemIds = new Set(missedReview.filter((row) => row.cluster === priorityCluster).map((row) => row.itemId));
  const insight = insights.find((row) => row.evidence.some((evidence) => clusterItemIds.has(evidence.itemId)));
  if (insight) return insight.teacherMove;
  const priority = clusterResults.find((row) => row.cluster === priorityCluster);
  if (priority && priority.percent !== null && priority.percent >= 0.8) return "Continue grade-level practice and add enrichment with longer text evidence tasks.";
  return genericNextStep(priorityCluster);
}

function genericNextStep(cluster: PssaReportCluster) {
  if (cluster === "Key Ideas & Evidence") return "Practice finding the exact detail that supports an answer before choosing.";
  if (cluster === "Craft & Structure") return "Practice explaining how word choice, structure, or point of view affects meaning.";
  if (cluster === "Vocabulary") return "Practice using nearby context to test word meaning in the sentence.";
  return "Practice one convention pattern at a time, then apply it in short editing sentences.";
}

function signalFor(percent: number): PssaClusterSignal {
  if (percent >= 0.8) return "strong";
  if (percent >= 0.6) return "developing";
  return "needs_support";
}

function sumEarnedPoints(responses: PssaReportResponse[]) {
  return responses.reduce((sum, response) => sum + (typeof response.pointsEarned === "number" ? response.pointsEarned : 0), 0);
}

function isOperationalItem(item: PssaReportItem) {
  return scoringBucketOfItem(item) === "operational";
}

function isOperationalResponse(response: PssaReportResponse, items: PssaReportItem[]) {
  if (response.scoringBucket) return scoringBucketOfResponse(response) === "operational";
  const item = items.find((row) => itemId(row) === response.itemId);
  return !item || isOperationalItem(item);
}

function scoringBucketOfItem(item: PssaReportItem) {
  return item.scoringBucket === "analytics_only" ? "analytics_only" : "operational";
}

function scoringBucketOfResponse(response: PssaReportResponse) {
  return response.scoringBucket === "analytics_only" ? "analytics_only" : "operational";
}

function itemId(item: PssaReportItem) {
  return String(item.itemId ?? item.id ?? "");
}

function itemDokLevel(item: PssaReportItem) {
  return item.dokLevel ?? dokLevelFor(itemId(item));
}

function selectedIndexOf(response: PssaReportResponse) {
  const selected = response.selectedIndex ?? response.selectedChoiceIndex;
  return typeof selected === "number" && Number.isInteger(selected) ? selected : null;
}

function distractorRoleAt(item: PssaReportItem, selectedIndex: number | null) {
  if (selectedIndex == null) return null;
  const structured = arraySource(item.structuredChoicesJson);
  const structuredRole = structured[selectedIndex]?.distractorRole;
  if (typeof structuredRole === "string" && structuredRole) return structuredRole;
  const choices = arraySource(item.choices ?? item.answerChoicesJson);
  const role = choices[selectedIndex]?.distractorRole;
  return typeof role === "string" && role ? role : null;
}

function compareInsights(a: PssaStudentInsight, b: PssaStudentInsight) {
  return `${a.roleFamily}:${a.evidence.map((row) => row.itemId).join(",")}`.localeCompare(`${b.roleFamily}:${b.evidence.map((row) => row.itemId).join(",")}`);
}

function arraySource(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}
