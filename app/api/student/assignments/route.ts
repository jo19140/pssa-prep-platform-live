import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const student = await db.studentProfile.findUnique({ where: { userId: (session.user as any).id }, include: { enrollments: { include: { classRoom: true } } } });
  if (!student) return NextResponse.json({ assignments: [] });
  const classIds = student.enrollments.map((e) => e.classRoomId);
  if (!classIds.length) return NextResponse.json({ assignments: [] });
  const assignments = await db.assignment.findMany({ where: { classRoomId: { in: classIds }, status: "ASSIGNED" }, include: { assessment: true }, orderBy: { createdAt: "desc" } });
  const sessions = await db.testSession.findMany({ where: { userId: (session.user as any).id, assessmentId: { in: assignments.map((a) => a.assessmentId) } }, include: { report: true }, orderBy: { startedAt: "desc" } });
  return NextResponse.json({ assignments: assignments.map((a) => { const existing = sessions.find((s) => s.assessmentId === a.assessmentId); const statusLabel = existing?.submittedAt ? "Completed" : existing ? "In Progress" : "Not Started"; return { assignmentId: a.id, assessmentId: a.assessmentId, title: a.assessment.title, statusLabel, dueDate: a.dueDate, submittedAt: existing?.submittedAt ?? null, sessionId: existing?.id ?? null }; }) });
}
