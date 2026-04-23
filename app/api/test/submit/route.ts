import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildStandardsMastery } from "@/lib/standards";
import { buildGrowthSummary } from "@/lib/growth";
import { getPerformanceBand } from "@/lib/performance";
import { buildStandardsGrowth } from "@/lib/standardsGrowth";

export async function POST(req: Request) {
  const { sessionId } = await req.json();
  const currentSession = await db.testSession.findUnique({ where: { id: sessionId }, include: { assessment: true, user: true } });
  if (!currentSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const responses = await db.responseRecord.findMany({ where: { sessionId } });
  const totalPoints = responses.reduce((sum, r) => sum + r.maxPoints, 0);
  const earnedPoints = responses.reduce((sum, r) => sum + r.scorePointsEarned, 0);
  const percentScore = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const performanceBand = getPerformanceBand(percentScore);
  const previousSession = await db.testSession.findFirst({ where: { userId: currentSession.userId, assessmentId: currentSession.assessmentId, submittedAt: { not: null }, id: { not: sessionId } }, include: { report: true }, orderBy: { submittedAt: "desc" } });
  const previousScore = previousSession?.report?.percentScore ?? null;
  const previousBand = previousSession?.report?.performanceBand ?? null;
  const growth = buildGrowthSummary({ previousScore, currentScore: percentScore, previousBand, currentBand: performanceBand });
  const standardsMastery = buildStandardsMastery(responses);
  const previousStandards = ((previousSession?.report?.summaryPayload as any)?.standardsMastery) || [];
  const standardsGrowth = buildStandardsGrowth(standardsMastery, previousStandards);
  await db.testSession.update({ where: { id: sessionId }, data: { submittedAt: new Date(), earnedPoints, totalPoints, scorePercent: percentScore, proficiencyBand: performanceBand } });
  const report = await db.reportSummary.upsert({ where: { sessionId }, update: { percentScore, performanceBand, growthFromPrevious: growth.growthPoints, previousReportId: previousSession?.report?.id ?? null, summaryPayload: { earnedPoints, totalPoints, standardsMastery, standardsGrowth, growth } }, create: { sessionId, percentScore, performanceBand, strongestSkill: null, weakestSkill: null, growthFromPrevious: growth.growthPoints, previousReportId: previousSession?.report?.id ?? null, summaryPayload: { earnedPoints, totalPoints, standardsMastery, standardsGrowth, growth } } });
  return NextResponse.json({ ok: true, reportId: report.id });
}
