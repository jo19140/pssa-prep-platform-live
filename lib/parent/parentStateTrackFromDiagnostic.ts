import { db } from "@/lib/db";
import { mapLoadedResponse } from "@/lib/content/pssaClassReportLoader";
import { normalizePssaReportForm, type NormalizablePssaForm } from "@/lib/content/pssaReportFormNormalizer";
import { buildStudentReport, type PssaClusterSignal } from "@/lib/content/pssaStudentReport";
import type { PssaStudentInsight } from "@/lib/content/pssaInsightMapping";
import type { ParentDashboardStateTrackPayload } from "@/lib/parent/loadParentDashboard";

const OPERATIONAL_MAX_POINTS = 45;

const CLUSTER_ROWS = {
  "Key Ideas & Evidence": { standardCode: "key_ideas_evidence", standardLabel: "Key Ideas & Evidence" },
  "Craft & Structure": { standardCode: "craft_structure", standardLabel: "Craft & Structure" },
  Vocabulary: { standardCode: "vocabulary", standardLabel: "Vocabulary" },
  Conventions: { standardCode: "conventions", standardLabel: "Conventions" },
} as const;

export class ParentStateTrackDiagnosticError extends Error {
  constructor(readonly reason: "corrupt_score" | "unsupported_operational_max") {
    super(`parent_statetrack_diagnostic_${reason}`);
  }
}

export type ParentStateTrackSession = {
  id: string;
  userId: string;
  formId: string;
  formContentHashAtStart: string | null;
  status: string;
  earnedPoints: number | null;
  totalPoints: number | null;
  pendingHumanPoints: number | null;
  submittedAt: Date | string | null;
  form: NormalizablePssaForm & {
    gradeLevel: number;
    totalPoints?: number | null;
    blueprintVersion: string | null;
  };
  responses: Array<{
    itemId: string;
    responsePayloadJson: unknown;
    scoreStatus: string;
    pointsEarned: number | null;
    maxPoints: number;
  }>;
};

export type ParentDiagnosticSeason = {
  benchmarkSeason: "BOY" | "MOY" | "EOY" | "Diagnostic";
  displaySeason: "Fall" | "Winter" | "Spring" | "Diagnostic";
};

export async function loadParentStateTrack(userId: string): Promise<ParentDashboardStateTrackPayload | null> {
  const studentProfile = await db.studentProfile.findUnique({
    where: { userId },
    select: { grade: true, user: { select: { name: true } } },
  });
  if (!studentProfile?.grade) return null;

  const sessions = await db.pssaFormSession.findMany({
    where: {
      userId,
      status: "submitted",
      submittedAt: { not: null },
      form: { gradeLevel: studentProfile.grade },
    },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    include: {
      form: {
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              item: {
                select: {
                  id: true,
                  itemType: true,
                  interactionType: true,
                  eligibleContent: true,
                  reportingCategory: true,
                  responseSpecJson: true,
                  correctResponseJson: true,
                },
              },
            },
          },
        },
      },
      responses: { orderBy: { positionSnapshot: "asc" } },
    },
  });
  const latest = sessions[0];
  if (!latest) return null;

  return buildParentStateTrackPayloadFromDiagnostic({
    userId,
    studentName: studentProfile.user.name,
    grade: studentProfile.grade,
    latest,
    olderSessions: sessions.slice(1),
  });
}

export function buildParentStateTrackPayloadFromDiagnostic({
  userId,
  studentName,
  grade,
  latest,
  olderSessions,
}: {
  userId: string;
  studentName: string | null;
  grade: number | null;
  latest: ParentStateTrackSession;
  olderSessions: ParentStateTrackSession[];
}): ParentDashboardStateTrackPayload {
  assertOperationalScore(latest);

  const season = deriveDiagnosticSeason(latest.form.gradeLevel, latest.form.blueprintVersion);
  const responses = latest.responses.map(mapLoadedResponse);
  const parentSafeInsights: PssaStudentInsight[] = [];
  const report = buildStudentReport(
    { benchmarkSeason: season.benchmarkSeason, completionStatus: "complete", responses },
    normalizePssaReportForm(latest.form),
    {
      earnedPoints: latest.earnedPoints,
      totalPoints: latest.totalPoints,
      maxOperationalPoints: OPERATIONAL_MAX_POINTS,
      pendingHumanPoints: latest.pendingHumanPoints ?? 0,
    },
    parentSafeInsights,
    { benchmarkSeason: season.benchmarkSeason, formVersion: latest.formContentHashAtStart || latest.form.contentHash },
  );
  const pendingHumanPoints = latest.pendingHumanPoints ?? 0;
  const scoreStatus = pendingHumanPoints > 0 ? "provisional" : "final";

  return {
    studentId: userId,
    studentName: studentName?.trim() || "Student",
    grade,
    latestAssessment: `Grade ${latest.form.gradeLevel} ELA Diagnostic — ${season.displaySeason}`,
    latestScore: percentScore(latest),
    performanceBand: report.band,
    growth: scoreStatus === "final" ? growthFor(latest, olderSessions, report.band) : null,
    standardsMastery: report.clusterResults.flatMap((row) => {
      if (!Number.isFinite(row.percent)) return [];
      const cluster = CLUSTER_ROWS[row.cluster];
      return [{
        standardCode: cluster.standardCode,
        standardLabel: cluster.standardLabel,
        percentScore: Math.round(Number(row.percent) * 100),
        performanceBand: row.limitedEvidence ? "Limited evidence" : bandForSignal(row.signal),
      }];
    }),
    standardsGrowth: [],
    sessionId: latest.id,
    submittedAt: latest.submittedAt instanceof Date ? latest.submittedAt : latest.submittedAt ? new Date(latest.submittedAt) : null,
    scoreStatus,
  };
}

export function deriveDiagnosticSeason(_gradeLevel: number, blueprintVersion: string | null | undefined): ParentDiagnosticSeason {
  const value = String(blueprintVersion ?? "").toLowerCase();
  if (/\b(moy|winter|mid[-_\s]?year)\b/.test(value)) return { benchmarkSeason: "MOY", displaySeason: "Winter" };
  if (/\b(eoy|spring|end[-_\s]?year)\b/.test(value)) return { benchmarkSeason: "EOY", displaySeason: "Spring" };
  if (/\b(boy|fall|beginning[-_\s]?year)\b/.test(value)) return { benchmarkSeason: "BOY", displaySeason: "Fall" };
  return { benchmarkSeason: "Diagnostic", displaySeason: "Diagnostic" };
}

export function selectLatestGradeMatchedSession(sessions: ParentStateTrackSession[], grade: number | null): ParentStateTrackSession | null {
  if (grade == null) return null;
  return sessions
    .filter((session) => session.status === "submitted" && session.submittedAt && session.form.gradeLevel === grade)
    .sort(compareSubmittedLatestFirst)[0] ?? null;
}

function growthFor(latest: ParentStateTrackSession, olderSessions: ParentStateTrackSession[], currentBand: string) {
  const prior = olderSessions.find((session) => comparablePrior(latest, session));
  if (!prior) return null;
  assertOperationalScore(prior);
  const previousScore = percentScore(prior);
  const currentScore = percentScore(latest);
  return {
    previousScore,
    currentScore,
    growthPoints: currentScore - previousScore,
    previousBand: bandFromScore(previousScore),
    currentBand,
    wording: "since the previous attempt on this diagnostic",
  };
}

function comparablePrior(latest: ParentStateTrackSession, prior: ParentStateTrackSession) {
  return prior.status === "submitted"
    && prior.formId === latest.formId
    && nonEmpty(prior.formContentHashAtStart)
    && nonEmpty(latest.formContentHashAtStart)
    && prior.formContentHashAtStart === latest.formContentHashAtStart
    && prior.totalPoints === latest.totalPoints
    && prior.form.totalPoints === latest.form.totalPoints
    && (prior.pendingHumanPoints ?? 0) === 0
    && (latest.pendingHumanPoints ?? 0) === 0;
}

function assertOperationalScore(session: ParentStateTrackSession) {
  if (!Number.isFinite(session.earnedPoints) || !Number.isFinite(session.totalPoints)) {
    throw new ParentStateTrackDiagnosticError("corrupt_score");
  }
  if (session.totalPoints !== OPERATIONAL_MAX_POINTS || session.form.totalPoints !== OPERATIONAL_MAX_POINTS) {
    throw new ParentStateTrackDiagnosticError("unsupported_operational_max");
  }
}

function percentScore(session: ParentStateTrackSession) {
  return Math.round((Number(session.earnedPoints) / OPERATIONAL_MAX_POINTS) * 100);
}

function bandFromScore(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Developing";
  return "Needs support";
}

function bandForSignal(signal: PssaClusterSignal) {
  switch (signal) {
    case "strong":
      return "Strong";
    case "developing":
      return "Growing";
    case "needs_support":
      return "Needs support";
    case "limited_evidence":
      return "Limited evidence";
  }
}

function compareSubmittedLatestFirst(a: ParentStateTrackSession, b: ParentStateTrackSession) {
  const timeDelta = submittedTime(b) - submittedTime(a);
  if (timeDelta !== 0) return timeDelta;
  return b.id.localeCompare(a.id);
}

function submittedTime(session: ParentStateTrackSession) {
  const value = session.submittedAt instanceof Date ? session.submittedAt.getTime() : new Date(String(session.submittedAt)).getTime();
  return Number.isFinite(value) ? value : 0;
}

function nonEmpty(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}
