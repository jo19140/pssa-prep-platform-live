import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildScheduledGrowthEmail } from "@/lib/scheduledReports";
import { sendEmail } from "@/lib/email";
import { buildClassGrowthSummary, buildStandardsGrowthAggregate } from "@/lib/classGrowth";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const schedules = await db.reportSchedule.findMany({ where: { isEnabled: true }, include: { teacher: true, classRoom: { include: { enrollments: { include: { studentProfile: { include: { user: true } } } } } } } });
  let sentCount = 0;
  const today = new Date().getDay();
  for (const schedule of schedules) {
    if (schedule.frequency === "WEEKLY" && schedule.sendDay != null && schedule.sendDay !== today) continue;
    const studentIds = schedule.classRoom?.enrollments.map((e) => e.studentProfile.userId) || [];
    const sessions = await db.testSession.findMany({ where: { userId: { in: studentIds }, submittedAt: { not: null } }, include: { user: true, report: true } });
    const reports = sessions.filter((s) => s.report);
    const growthRows = reports.map((s) => { const payload = (s.report?.summaryPayload as any) || {}; const growth = payload.growth || {}; return { studentId: s.user.id, studentName: s.user.name, previousScore: growth.previousScore ?? null, currentScore: s.report?.percentScore ?? 0, growthPoints: growth.growthPoints ?? null, previousBand: growth.previousBand ?? null, currentBand: s.report?.performanceBand ?? "Below Basic" }; });
    const classGrowth = buildClassGrowthSummary(growthRows);
    const standardsGrowthProfiles = reports.map((s) => { const payload = (s.report?.summaryPayload as any) || {}; return { studentId: s.user.id, studentName: s.user.name, standardsGrowth: payload.standardsGrowth || [] }; });
    const standardsGrowthSummary = buildStandardsGrowthAggregate(standardsGrowthProfiles);
    const emailText = buildScheduledGrowthEmail({ className: schedule.classRoom?.name || "All Classes", averageGrowth: classGrowth.averageGrowth, improvedCount: classGrowth.improvedCount, flatCount: classGrowth.flatCount, declinedCount: classGrowth.declinedCount, topGrowthStudents: classGrowth.topGrowthStudents, stalledStudents: classGrowth.stalledStudents, standardsGrowthSummary });
    await sendEmail({ to: schedule.teacher.email, subject: `Scheduled Class Growth Report`, html: emailText.replace(/\n/g, "<br/>") });
    sentCount++;
  }
  return NextResponse.json({ ok: true, sentCount });
}
