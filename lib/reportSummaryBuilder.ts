import { Prisma } from "@prisma/client";
import { buildGrowthSummary } from "@/lib/growth";
import { getPerformanceBand } from "@/lib/performance";
import { buildStandardsMastery } from "@/lib/standards";
import { buildStandardsGrowth } from "@/lib/standardsGrowth";
import { db } from "@/lib/db";

export async function recomputeReportForSession(sessionId: string) {
  const currentSession = await db.testSession.findUnique({
    where: { id: sessionId },
    include: { assessment: true, user: true },
  });
  if (!currentSession) throw new Error("Session not found");

  const responses = await db.responseRecord.findMany({ where: { sessionId }, include: { essayEvaluation: true } });
  const totalPoints = responses.reduce((sum, r) => sum + r.maxPoints, 0);
  const earnedPoints = responses.reduce((sum, r) => sum + r.scorePointsEarned, 0);
  const percentScore = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const performanceBand = getPerformanceBand(percentScore);
  const previousSession = await db.testSession.findFirst({
    where: {
      userId: currentSession.userId,
      assessmentId: currentSession.assessmentId,
      submittedAt: { not: null },
      id: { not: sessionId },
    },
    include: { report: true },
    orderBy: { submittedAt: "desc" },
  });
  const previousScore = previousSession?.report?.percentScore ?? null;
  const previousBand = previousSession?.report?.performanceBand ?? null;
  const growth = buildGrowthSummary({ previousScore, currentScore: percentScore, previousBand, currentBand: performanceBand });
  const standardsMastery = buildStandardsMastery(responses);
  const previousStandards = ((previousSession?.report?.summaryPayload as any)?.standardsMastery) || [];
  const standardsGrowth = buildStandardsGrowth(standardsMastery, previousStandards);
  const essayEvaluations = responses.filter((response) => response.essayEvaluation).map((response) => response.essayEvaluation);
  const pendingEssayResponseIds = responses
    .filter((response) => response.questionType === "TDA" && !response.essayEvaluation)
    .map((response) => response.id);
  const conventionsResponses = responses.filter((response) => response.questionType === "CONVENTIONS");
  const conventionsPerformance = conventionsResponses.length
    ? {
        earnedPoints: conventionsResponses.reduce((sum, response) => sum + response.scorePointsEarned, 0),
        totalPoints: conventionsResponses.reduce((sum, response) => sum + response.maxPoints, 0),
        questionCount: conventionsResponses.length,
      }
    : null;
  const diagnosticPerformance = buildDiagnosticPerformance(responses);
  const summaryPayload = {
    earnedPoints,
    totalPoints,
    standardsMastery,
    standardsGrowth,
    growth,
    essayEvaluations,
    essayGradingPending: pendingEssayResponseIds.length > 0,
    pendingEssayResponseIds,
    conventionsPerformance,
    diagnosticPerformance,
  };

  await db.testSession.update({
    where: { id: sessionId },
    data: {
      submittedAt: currentSession.submittedAt || new Date(),
      earnedPoints,
      totalPoints,
      scorePercent: percentScore,
      proficiencyBand: performanceBand,
    },
  });
  const report = await db.reportSummary.upsert({
    where: { sessionId },
    update: {
      percentScore,
      performanceBand,
      growthFromPrevious: growth.growthPoints,
      previousReportId: previousSession?.report?.id ?? null,
      summaryPayload: summaryPayload as Prisma.InputJsonValue,
    },
    create: {
      sessionId,
      percentScore,
      performanceBand,
      strongestSkill: null,
      weakestSkill: null,
      growthFromPrevious: growth.growthPoints,
      previousReportId: previousSession?.report?.id ?? null,
      summaryPayload: summaryPayload as Prisma.InputJsonValue,
    },
  });

  return { currentSession, responses, report, summaryPayload, standardsMastery, percentScore, performanceBand };
}

export function buildDiagnosticPerformance(responses: any[]) {
  const groups: Record<string, { label: string; earnedPoints: number; totalPoints: number; questionCount: number }> = {
    literary: { label: "Literary Comprehension", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    informational: { label: "Informational Comprehension", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    paired: { label: "Paired Text Analysis", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    tda: { label: "TDA Writing", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    conventions: { label: "Conventions", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
  };
  responses.forEach((response) => {
    const payload = (response.answerPayload || {}) as any;
    const type =
      response.questionType === "TDA"
        ? "tda"
        : response.questionType === "CONVENTIONS"
          ? "conventions"
          : payload.passageType === "LITERARY"
            ? "literary"
            : payload.passageType === "PAIRED_TEXT"
              ? "paired"
              : "informational";
    groups[type].earnedPoints += response.scorePointsEarned || 0;
    groups[type].totalPoints += response.maxPoints || 0;
    groups[type].questionCount += 1;
  });
  return Object.values(groups).filter((group) => group.questionCount).map((group) => {
    const percentScore = group.totalPoints ? Math.round((group.earnedPoints / group.totalPoints) * 100) : 0;
    return { ...group, percentScore, performanceBand: getPerformanceBand(percentScore) };
  });
}
