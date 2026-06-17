import {
  MAPPING_VERSION,
  mapDistractor,
  type PssaStudentInsight,
} from "@/lib/content/pssaInsightMapping";

export const REPORT_VERSION = "pssa-ws3b-student-report-v1";

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
  eligibleContent?: string | null;
  reportingCategory?: string | null;
  interactionType?: string | null;
  itemType?: string | null;
  correctIndex?: number | null;
  structuredChoicesJson?: unknown;
  answerChoicesJson?: unknown;
  choices?: unknown;
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
  const complete = attempt.completionStatus !== "incomplete";
  const pendingHumanScore = Number(scoring.pendingHumanPoints ?? 0) > 0;
  const scoreStatus: PssaReportScoreStatus = !complete ? "incomplete" : pendingHumanScore ? "provisional" : "final";
  const maxPoints = Number(scoring.maxOperationalPoints ?? scoring.totalPoints ?? 45);
  const earnedPoints = typeof scoring.earnedPoints === "number" ? scoring.earnedPoints : sumEarnedPoints(attempt.responses ?? []);
  const band = bandFor(earnedPoints, maxPoints, complete ? "complete" : "incomplete");
  const clusterResults = buildClusterResults(items, responses);
  const priorityCluster = complete ? chooseCluster(clusterResults, "priority") : null;
  const strongestCluster = complete ? chooseCluster(clusterResults, "strongest") : null;
  const missedReview = buildMissedReview(items, responses);
  const likelyPatterns = insights.slice().sort(compareInsights);
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
  };
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

function itemId(item: PssaReportItem) {
  return String(item.itemId ?? item.id ?? "");
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
