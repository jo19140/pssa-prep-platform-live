import { deriveStudentInsights } from "@/lib/content/pssaInsightMapping";
import { buildClassReport, type ClassReport, type StudentReportInput } from "@/lib/content/pssaClassReport";
import { buildStudentReport, type PssaReportForm, type PssaReportResponse } from "@/lib/content/pssaStudentReport";

export type LoadedResponse = {
  itemId: string;
  responsePayloadJson: unknown;
  scoreStatus: string;
  pointsEarned: number | null;
  maxPoints: number;
  scoringBucket?: "operational" | "analytics_only" | string | null;
};

export type LoadedSession = {
  status: "submitted" | "in_progress" | "invalidated_midflight";
  earnedPoints: number | null;
  totalPoints: number | null;
  pendingHumanPoints: number | null;
  analyticsEarnedPoints?: number | null;
  analyticsTotalPoints?: number | null;
  analyticsPendingHumanPoints?: number | null;
  submittedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  responses: LoadedResponse[];
};

export type ClassReportLoaderEntry = {
  studentId: string;
  session: LoadedSession | LoadedSession[] | null;
};

export type AssembleClassReportOptions = {
  form: PssaReportForm;
  benchmarkSeason: string;
  formId: string;
  formVersion?: string;
};

export function assembleClassReport(entries: ClassReportLoaderEntry[], opts: AssembleClassReportOptions): ClassReport {
  const inputs: StudentReportInput[] = entries
    .slice()
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
    .map((entry) => {
      const session = selectReportSession(entry.session);
      const report = session?.status === "submitted"
        ? buildSubmittedReport(session, opts)
        : buildIncompleteReport(opts);
      return { studentId: entry.studentId, report };
    });
  return buildClassReport(inputs, { benchmarkSeason: opts.benchmarkSeason, formId: opts.formId, formVersion: opts.formVersion });
}

export function selectReportSession(session: LoadedSession | LoadedSession[] | null): LoadedSession | null {
  const sessions = (Array.isArray(session) ? session : session ? [session] : [])
    .filter((row) => row.status !== "invalidated_midflight")
    .sort(compareSessionsLatestFirst);
  return sessions.find((row) => row.status === "submitted") ?? null;
}

export function mapLoadedResponse(response: LoadedResponse): PssaReportResponse {
  const payload = plainObject(response.responsePayloadJson);
  return {
    itemId: response.itemId,
    ...(typeof payload.selectedIndex === "number" ? { selectedIndex: payload.selectedIndex } : {}),
    ...(typeof payload.selectedChoiceIndex === "number" ? { selectedChoiceIndex: payload.selectedChoiceIndex } : {}),
    isCorrect: response.scoreStatus === "scored" && response.pointsEarned === response.maxPoints,
    scoreStatus: response.scoreStatus,
    pointsEarned: response.pointsEarned,
    maxPoints: response.maxPoints,
    ...(response.scoringBucket ? { scoringBucket: response.scoringBucket } : {}),
  };
}

function buildSubmittedReport(session: LoadedSession, opts: AssembleClassReportOptions) {
  const responses = session.responses.map(mapLoadedResponse);
  const attempt = { benchmarkSeason: opts.benchmarkSeason, completionStatus: "complete", responses };
  const operationalResponses = responses.filter((response) => scoringBucketOfResponse(response) === "operational");
  const insights = deriveStudentInsights({ ...attempt, responses: operationalResponses }, operationalForm(opts.form));
  return buildStudentReport(attempt, opts.form, {
    earnedPoints: session.earnedPoints,
    totalPoints: session.totalPoints,
    maxOperationalPoints: 45,
    pendingHumanPoints: session.pendingHumanPoints ?? 0,
  }, insights, {
    benchmarkSeason: opts.benchmarkSeason,
    formVersion: opts.formVersion,
  });
}

function buildIncompleteReport(opts: AssembleClassReportOptions) {
  return buildStudentReport(
    { benchmarkSeason: opts.benchmarkSeason, completionStatus: "incomplete", responses: [] },
    opts.form,
    { earnedPoints: null, totalPoints: 45, maxOperationalPoints: 45, pendingHumanPoints: 0 },
    [],
    { benchmarkSeason: opts.benchmarkSeason, formVersion: opts.formVersion },
  );
}

function operationalForm(form: PssaReportForm): PssaReportForm {
  return { ...form, items: (form.items ?? []).filter((item) => item.scoringBucket !== "analytics_only") };
}

function scoringBucketOfResponse(response: PssaReportResponse) {
  return response.scoringBucket === "analytics_only" ? "analytics_only" : "operational";
}

function compareSessionsLatestFirst(a: LoadedSession, b: LoadedSession) {
  const aSubmitted = a.status === "submitted" ? 0 : 1;
  const bSubmitted = b.status === "submitted" ? 0 : 1;
  if (aSubmitted !== bSubmitted) return aSubmitted - bSubmitted;
  return sessionTime(b) - sessionTime(a);
}

function sessionTime(session: LoadedSession) {
  return timeValue(session.submittedAt ?? session.updatedAt ?? session.createdAt);
}

function timeValue(value: Date | string | null | undefined) {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
