import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyStudentLessonReviewGate } from "@/lib/learningLessonPersistence";
import { getStudentReadyPssaItems, getStudentReadyPssaPassages } from "@/lib/pssaGovernance";

const sessionQuerySchema = z.object({
  assessmentId: z.string().min(1).max(128).nullable(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const parsed = sessionQuerySchema.safeParse({ assessmentId: searchParams.get("assessmentId") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid request query", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  let assessmentId = parsed.data.assessmentId;
  const student = await db.studentProfile.findUnique({ where: { userId: (session.user as any).id }, include: { enrollments: true } });
  if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  const classIds = student.enrollments.map((e) => e.classRoomId);
  if (!classIds.length) return NextResponse.json({ error: "Student is not enrolled in a class" }, { status: 404 });

  let assignment = assessmentId
    ? await db.assignment.findFirst({ where: { assessmentId, classRoomId: { in: classIds }, status: "ASSIGNED" }, include: { assessment: true } })
    : null;

  if (!assignment) {
    assignment = await db.assignment.findFirst({ where: { classRoomId: { in: classIds }, status: "ASSIGNED" }, include: { assessment: true }, orderBy: { createdAt: "desc" } });
    assessmentId = assignment?.assessmentId || null;
  }

  if (!assignment || !assessmentId) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const isPssaAssessment = assignment.assessment?.state === "PA" && assignment.assessment?.subject === "ELA";
  const pssaAssessmentInclude = {
    responses: { include: { essayEvaluation: true }, orderBy: { createdAt: "asc" as const } },
    report: true,
    assessment: true,
    learningPath: {
      include: {
        items: { orderBy: { order: "asc" as const } },
        lessons: {
          orderBy: { priority: "asc" as const },
          include: {
            progress: { where: { userId: (session.user as any).id } },
            items: { orderBy: { order: "asc" as const } },
            steps: { orderBy: { order: "asc" as const } },
            heroResourceLink: { select: { title: true, url: true, provider: true, description: true, tier: true, belowGradeLevel: true, aboveGradeLevel: true } },
          },
        },
        session: { include: { responses: true, assessment: true } },
      },
    },
  };
  const include = {
    responses: { include: { essayEvaluation: true }, orderBy: { createdAt: "asc" as const } },
    report: true,
    assessment: { include: { questions: { orderBy: { questionNo: "asc" as const } }, passages: true } },
    learningPath: {
      include: {
        items: { orderBy: { order: "asc" as const } },
        lessons: {
          orderBy: { priority: "asc" as const },
          include: {
            progress: { where: { userId: (session.user as any).id } },
            items: { orderBy: { order: "asc" as const } },
            steps: { orderBy: { order: "asc" as const } },
            heroResourceLink: { select: { title: true, url: true, provider: true, description: true, tier: true, belowGradeLevel: true, aboveGradeLevel: true } },
          },
        },
        session: { include: { responses: true, assessment: true } },
      },
    },
  };
  const sessionInclude = isPssaAssessment ? pssaAssessmentInclude : include;
  let activeSession = await db.testSession.findFirst({ where: { userId: (session.user as any).id, assessmentId, submittedAt: null }, include: sessionInclude, orderBy: { startedAt: "desc" } });
  if (!activeSession) activeSession = await db.testSession.findFirst({ where: { userId: (session.user as any).id, assessmentId, submittedAt: { not: null } }, include: sessionInclude, orderBy: { submittedAt: "desc" } });
  if (!activeSession) activeSession = await db.testSession.create({ data: { userId: (session.user as any).id, assessmentId, currentQuestionNo: 1 }, include: sessionInclude });
  const standards = assignment.standards ? assignment.standards.split(",").map((item) => item.trim()).filter(Boolean) : [];
  const hydratedSession = activeSession as any;
  if (isPssaAssessment) {
    const [pssaItems, pssaPassages] = await Promise.all([
      getStudentReadyPssaItems({
        where: { gradeLevel: hydratedSession.assessment.grade, subject: hydratedSession.assessment.subject },
        orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { id: "asc" }],
      }),
      getStudentReadyPssaPassages({
        where: { gradeLevel: hydratedSession.assessment.grade, subject: hydratedSession.assessment.subject },
        orderBy: [{ title: "asc" }],
      }),
    ]);
    if (!pssaItems.length) {
      return NextResponse.json(
        { error: "No student-ready Pennsylvania PSSA ELA content is available for this assignment." },
        { status: 409 },
      );
    }
    const questions = pssaItems.map(pssaItemToStudentQuestion);
    return NextResponse.json({
      sessionId: activeSession.id,
      assessment: hydratedSession.assessment,
      currentQuestionNo: activeSession.currentQuestionNo,
      submittedAt: activeSession.submittedAt,
      responses: hydratedSession.responses,
      report: hydratedSession.report,
      learningPath: withCrossGradeResources(hydratedSession.learningPath ? await applyStudentLessonReviewGate(hydratedSession.learningPath, (session.user as any).id) : null),
      questions,
      passages: pssaPassages,
      standards,
      assignmentType: assignment.assignmentType || "FULL",
    });
  }
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
  const learningPath = hydratedSession.learningPath
    ? await applyStudentLessonReviewGate(hydratedSession.learningPath, (session.user as any).id)
    : null;
  return NextResponse.json({ sessionId: activeSession.id, assessment: hydratedSession.assessment, currentQuestionNo: activeSession.currentQuestionNo, submittedAt: activeSession.submittedAt, responses: hydratedSession.responses, report: hydratedSession.report, learningPath: withCrossGradeResources(learningPath), questions, passages: hydratedSession.assessment.passages, standards, assignmentType: assignment.assignmentType || "FULL" });
}

function pssaItemToStudentQuestion(item: any) {
  const preview = item.studentPreviewJson && typeof item.studentPreviewJson === "object" ? item.studentPreviewJson : {};
  return {
    ...(preview as Record<string, unknown>),
    id: item.id,
    gradeLevel: item.gradeLevel,
    type: item.itemType,
    skill: item.skill,
    standardCode: item.standardCode,
    passageId: item.passageId,
  };
}

function withCrossGradeResources(learningPath: any) {
  if (!learningPath?.lessons?.length) return learningPath;
  return {
    ...learningPath,
    lessons: learningPath.lessons.map((lesson: any) => {
      const sourcePayload = lesson.sourcePayload && typeof lesson.sourcePayload === "object" ? lesson.sourcePayload : {};
      const crossGradeResources = (sourcePayload as any).crossGradeResources && typeof (sourcePayload as any).crossGradeResources === "object"
        ? (sourcePayload as any).crossGradeResources
        : {};
      return {
        ...lesson,
        scaffoldResources: lesson.scaffoldResources || crossGradeResources.scaffold || [],
        stretchResources: lesson.stretchResources || crossGradeResources.stretch || [],
      };
    }),
  };
}
