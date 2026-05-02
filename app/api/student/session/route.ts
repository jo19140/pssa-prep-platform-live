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

  const include = {
    responses: { include: { essayEvaluation: true }, orderBy: { createdAt: "asc" as const } },
    report: true,
    assessment: { include: { questions: { orderBy: { questionNo: "asc" as const } }, passages: true } },
    learningPath: {
      include: {
        items: { orderBy: { order: "asc" as const } },
        lessons: { orderBy: { priority: "asc" as const }, include: { progress: { where: { userId: (session.user as any).id } }, items: { orderBy: { order: "asc" as const } } } },
      },
    },
  };
  let activeSession = await db.testSession.findFirst({ where: { userId: (session.user as any).id, assessmentId, submittedAt: null }, include, orderBy: { startedAt: "desc" } });
  if (!activeSession) activeSession = await db.testSession.findFirst({ where: { userId: (session.user as any).id, assessmentId, submittedAt: { not: null } }, include, orderBy: { submittedAt: "desc" } });
  if (!activeSession) activeSession = await db.testSession.create({ data: { userId: (session.user as any).id, assessmentId, currentQuestionNo: 1 }, include });
  const standards = assignment.standards ? assignment.standards.split(",").map((item) => item.trim()).filter(Boolean) : [];
  const hydratedSession = activeSession as any;
  const passageByKey = new Map<string, any>((hydratedSession.assessment.passages || []).map((passage: any) => [passage.passageKey, passage]));
  const questions = hydratedSession.assessment.questions.map((question: any) => {
    const payload = question.questionPayload as any;
    const passage = payload?.passageId ? passageByKey.get(payload.passageId) : null;
    if (!passage) return payload;
    return {
      ...payload,
      passageTitle: passage.title,
      passage: passage.content,
      tableData: passage.tableData,
      passageMetadata: {
        passageType: passage.passageType,
        genre: passage.genre,
        wordCountTarget: passage.wordCountTarget,
        actualWordCount: passage.actualWordCount,
        hasTable: passage.hasTable,
        hasSections: passage.hasSections,
        gradeLevel: passage.gradeLevel,
        metadata: passage.metadata,
      },
    };
  });
  return NextResponse.json({ sessionId: activeSession.id, assessment: hydratedSession.assessment, currentQuestionNo: activeSession.currentQuestionNo, submittedAt: activeSession.submittedAt, responses: hydratedSession.responses, report: hydratedSession.report, learningPath: hydratedSession.learningPath, questions, passages: hydratedSession.assessment.passages, standards, assignmentType: assignment.assignmentType || "FULL" });
}
