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
  const student = await db.studentProfile.findUnique({ where: { userId: (session.user as any).id }, include: { enrollments: true } });
  if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  const classIds = student.enrollments.map((e) => e.classRoomId);
  if (!classIds.length) return NextResponse.json({ error: "Student is not enrolled in a class" }, { status: 404 });

  let assignment = assessmentId
    ? await db.assignment.findFirst({ where: { assessmentId, classRoomId: { in: classIds }, status: "ASSIGNED" } })
    : null;

  if (!assignment) {
    assignment = await db.assignment.findFirst({ where: { classRoomId: { in: classIds }, status: "ASSIGNED" }, orderBy: { createdAt: "desc" } });
    assessmentId = assignment?.assessmentId || null;
  }

  if (!assignment || !assessmentId) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  let activeSession = await db.testSession.findFirst({ where: { userId: (session.user as any).id, assessmentId, submittedAt: null }, include: { responses: { orderBy: { createdAt: "asc" } }, report: true, assessment: true }, orderBy: { startedAt: "desc" } });
  if (!activeSession) activeSession = await db.testSession.findFirst({ where: { userId: (session.user as any).id, assessmentId, submittedAt: { not: null } }, include: { responses: { orderBy: { createdAt: "asc" } }, report: true, assessment: true }, orderBy: { submittedAt: "desc" } });
  if (!activeSession) activeSession = await db.testSession.create({ data: { userId: (session.user as any).id, assessmentId, currentQuestionNo: 1 }, include: { responses: { orderBy: { createdAt: "asc" } }, report: true, assessment: true } });
  const standards = assignment.standards ? assignment.standards.split(",").map((item) => item.trim()).filter(Boolean) : [];
  return NextResponse.json({ sessionId: activeSession.id, assessment: activeSession.assessment, currentQuestionNo: activeSession.currentQuestionNo, submittedAt: activeSession.submittedAt, responses: activeSession.responses, report: activeSession.report, standards, assignmentType: assignment.assignmentType || "FULL" });
}
