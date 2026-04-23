import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildParentEmailSummary } from "@/lib/parentEmails";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "PARENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { studentId } = await req.json();
  const parent = await db.parentProfile.findUnique({ where: { userId: (session.user as any).id }, include: { user: true, children: { include: { studentProfile: { include: { user: true } } } } } });
  if (!parent) return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
  const allowed = parent.children.map((c) => c.studentProfile.userId);
  if (!allowed.includes(studentId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const latestSession = await db.testSession.findFirst({ where: { userId: studentId, submittedAt: { not: null } }, include: { assessment: true, report: true, user: true }, orderBy: { submittedAt: "desc" } });
  if (!latestSession?.report) return NextResponse.json({ error: "No completed report found" }, { status: 404 });
  const payload = (latestSession.report.summaryPayload as any) || {};
  const standardsMastery = payload.standardsMastery || [];
  const strongestStandards = [...standardsMastery].sort((a,b)=>b.percentScore-a.percentScore).slice(0,3);
  const needsSupportStandards = [...standardsMastery].sort((a,b)=>a.percentScore-b.percentScore).slice(0,3);
  const html = buildParentEmailSummary({ studentName: latestSession.user.name, assessmentTitle: latestSession.assessment.title, score: latestSession.report.percentScore, performanceBand: latestSession.report.performanceBand, growthPoints: payload.growth?.growthPoints ?? null, strongestStandards, needsSupportStandards });
  await sendEmail({ to: parent.user.email, subject: `${latestSession.user.name} Progress Summary`, html });
  return NextResponse.json({ ok: true });
}
