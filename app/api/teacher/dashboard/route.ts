import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStandardSupportGroups } from "@/lib/teacherStandardsGrouping";
import { buildStandardsRecommendations } from "@/lib/standardsRecommendations";
import { buildClassGrowthSummary, buildStandardsGrowthAggregate } from "@/lib/classGrowth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const userId = (session.user as any).id;
  const teacher = await db.teacherProfile.findUnique({ where: { userId }, include: { school: true, classes: { include: { school: true, enrollments: { include: { studentProfile: { include: { user: true } } } } } } } });
  if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  const allowedClasses = classId ? teacher.classes.filter((c) => c.id === classId) : teacher.classes;
  const studentUserIds = allowedClasses.flatMap((c) => c.enrollments.map((e) => e.studentProfile.userId));
  const where: any = { userId: { in: studentUserIds } };
  if (startDate || endDate) { where.startedAt = {}; if (startDate) where.startedAt.gte = new Date(`${startDate}T00:00:00.000Z`); if (endDate) where.startedAt.lte = new Date(`${endDate}T23:59:59.999Z`); }
  const sessions = await db.testSession.findMany({ where, include: { user: true, report: true, responses: true, assessment: true }, orderBy: { startedAt: "desc" } });
  const reports = sessions.filter((s) => s.report);
  const avgScore = reports.length ? Math.round(reports.reduce((sum, s) => sum + (s.report?.percentScore || 0), 0) / reports.length) : 0;
  const studentRows = sessions.map((testSession) => { const summaryPayload = (testSession.report?.summaryPayload as any) || {}; return { sessionId: testSession.id, studentName: testSession.user.name, assessmentTitle: testSession.assessment.title, scorePercent: testSession.report?.percentScore ?? null, performanceBand: testSession.report?.performanceBand ?? null, strongestSkill: summaryPayload.strongestSkill ?? null, weakestSkill: summaryPayload.weakestSkill ?? null, growth: summaryPayload.growth ?? null, submittedAt: testSession.submittedAt }; });
  const standardProfiles = sessions.filter((s) => s.report).map((s) => { const summaryPayload = (s.report?.summaryPayload as any) || {}; return { studentId: s.user.id, studentName: s.user.name, sessionId: s.id, standardsMastery: summaryPayload.standardsMastery || [] }; });
  const standardGroups = buildStandardSupportGroups(standardProfiles);
  const standardRecommendations = buildStandardsRecommendations(standardGroups);
  const growthRows = sessions.filter((s) => s.report).map((s) => { const growth = ((s.report?.summaryPayload as any) || {}).growth || null; return { studentId: s.user.id, studentName: s.user.name, previousScore: growth?.previousScore ?? null, currentScore: s.report?.percentScore ?? 0, growthPoints: growth?.growthPoints ?? null, previousBand: growth?.previousBand ?? null, currentBand: s.report?.performanceBand ?? "Below Basic" }; });
  const classGrowth = buildClassGrowthSummary(growthRows);
  const standardsGrowthProfiles = sessions.filter((s) => s.report).map((s) => { const summaryPayload = (s.report?.summaryPayload as any) || {}; return { studentId: s.user.id, studentName: s.user.name, standardsGrowth: summaryPayload.standardsGrowth || [] }; });
  const standardsGrowthSummary = buildStandardsGrowthAggregate(standardsGrowthProfiles);
  const groupedByStudent = new Map<string, any>();
  for (const testSession of sessions) {
    if (testSession.report?.percentScore == null) continue;
    if (!groupedByStudent.has(testSession.user.id)) groupedByStudent.set(testSession.user.id, { studentId: testSession.user.id, studentName: testSession.user.name, trend: [] });
    groupedByStudent.get(testSession.user.id).trend.push({ dateMs: new Date(testSession.startedAt).getTime(), label: new Date(testSession.startedAt).toLocaleDateString(), score: testSession.report.percentScore });
  }
  const studentTrendLines = Array.from(groupedByStudent.values()).map((row) => ({ ...row, trend: row.trend.sort((a: any,b: any)=>a.dateMs-b.dateMs).map(({ label, score }: any) => ({ label, score })) }));
  return NextResponse.json({ teacher: { id: teacher.id, schoolId: teacher.schoolId, schoolName: teacher.school?.name || teacher.schoolName, gradeBand: teacher.gradeBand, classCount: teacher.classes.length, studentCount: studentUserIds.length }, classes: teacher.classes.map((c) => ({ id: c.id, name: c.name, grade: c.grade, schoolId: c.schoolId, schoolName: c.school?.name || teacher.schoolName })), overview: { sessionCount: sessions.length, completedReportCount: reports.length, averageScore: avgScore }, students: studentRows, standardGroups, standardRecommendations, classGrowth, standardsGrowthSummary, studentTrendLines });
}
