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
  if (!student) return NextResponse.json({ assignments: [], latestLearningPath: null });
  const classIds = student.enrollments.map((e) => e.classRoomId);
  if (!classIds.length) return NextResponse.json({ assignments: [], latestLearningPath: null });
  const assignments = await db.assignment.findMany({ where: { classRoomId: { in: classIds }, status: "ASSIGNED" }, include: { assessment: true }, orderBy: { createdAt: "desc" } });
  const readingCoachAssignments = await db.readingCoachAssignment.findMany({
    where: { classRoomId: { in: classIds }, status: "ASSIGNED" },
    include: { attempts: { where: { userId: (session.user as any).id }, orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  const sessions = await db.testSession.findMany({ where: { userId: (session.user as any).id, assessmentId: { in: assignments.map((a) => a.assessmentId) } }, include: { report: true }, orderBy: { startedAt: "desc" } });
  const latestLearningPath = await db.learningPath.findFirst({
    where: { session: { is: { userId: (session.user as any).id, submittedAt: { not: null } } } },
    include: {
      items: { orderBy: { order: "asc" } },
      lessons: { orderBy: { priority: "asc" }, include: { progress: { where: { userId: (session.user as any).id } }, questAttempts: { where: { userId: (session.user as any).id }, orderBy: { createdAt: "desc" }, take: 3 }, items: { orderBy: { order: "asc" } } } },
      session: { select: { assessment: { select: { title: true, grade: true } }, submittedAt: true, scorePercent: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    assignments: assignments.map((a) => { const existing = sessions.find((s) => s.assessmentId === a.assessmentId); const statusLabel = existing?.submittedAt ? "Completed" : existing ? "In Progress" : "Not Started"; return { assignmentId: a.id, assessmentId: a.assessmentId, title: a.assessment.title, assignmentType: a.assignmentType, statusLabel, dueDate: a.dueDate, submittedAt: existing?.submittedAt ?? null, sessionId: existing?.id ?? null }; }),
    readingCoachAssignments: readingCoachAssignments.map((assignment) => ({
      assignmentId: assignment.id,
      title: assignment.title,
      gradeLevel: assignment.gradeLevel,
      activityType: assignment.activityType,
      expectedText: assignment.expectedText,
      dueDate: assignment.dueDate,
      statusLabel: assignment.attempts.length ? "Completed" : "Not Started",
      latestAttempt: assignment.attempts[0] || null,
    })),
    latestLearningPath,
  });
}
