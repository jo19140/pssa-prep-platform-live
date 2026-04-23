import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  let assessmentId = searchParams.get("assessmentId");
  if (!assessmentId) {
    const fallback = await db.assessment.findFirst({ orderBy: { createdAt: "asc" } });
    assessmentId = fallback?.id || null;
  }
  if (!assessmentId) return NextResponse.json({ error: "No assessment found" }, { status: 404 });
  const student = await db.studentProfile.findUnique({ where: { userId: (session.user as any).id }, include: { enrollments: true } });
  const assignment = student ? await db.assignment.findFirst({ where: { assessmentId, classRoomId: { in: student.enrollments.map((e) => e.classRoomId) } } }) : null;
  let activeSession = await db.testSession.findFirst({ where: { userId: (session.user as any).id, assessmentId, submittedAt: null }, include: { responses: true, report: true, assessment: true }, orderBy: { startedAt: "desc" } });
  if (!activeSession) activeSession = await db.testSession.create({ data: { userId: (session.user as any).id, assessmentId, currentQuestionNo: 1 }, include: { responses: true, report: true, assessment: true } });
  return NextResponse.json({ sessionId: activeSession.id, assessment: activeSession.assessment, currentQuestionNo: activeSession.currentQuestionNo, submittedAt: activeSession.submittedAt, responses: activeSession.responses, report: activeSession.report, standards: assignment?.standards || [], assignmentType: assignment?.assignmentType || "FULL" });
}
