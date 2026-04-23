import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "PARENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parent = await db.parentProfile.findUnique({ where: { userId: (session.user as any).id }, include: { children: { include: { studentProfile: { include: { user: true } } } }, user: true } });
  if (!parent) return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
  const childUserIds = parent.children.map((c) => c.studentProfile.userId);
  const sessions = await db.testSession.findMany({ where: { userId: { in: childUserIds }, submittedAt: { not: null } }, include: { user: true, assessment: true, report: true }, orderBy: { submittedAt: "desc" } });
  const latestByChild = new Map<string, any>();
  for (const testSession of sessions) if (!latestByChild.has(testSession.userId)) latestByChild.set(testSession.userId, testSession);
  const children = parent.children.map((childLink) => { const studentUser = childLink.studentProfile.user; const latest = latestByChild.get(studentUser.id); const payload = (latest?.report?.summaryPayload as any) || {}; return { studentId: studentUser.id, studentName: studentUser.name, grade: childLink.studentProfile.grade, latestAssessment: latest?.assessment.title ?? null, latestScore: latest?.report?.percentScore ?? null, performanceBand: latest?.report?.performanceBand ?? null, growth: payload.growth ?? null, standardsMastery: payload.standardsMastery ?? [], standardsGrowth: payload.standardsGrowth ?? [], sessionId: latest?.id ?? null, submittedAt: latest?.submittedAt ?? null }; });
  return NextResponse.json({ parent: { id: parent.id, childCount: children.length }, children });
}
