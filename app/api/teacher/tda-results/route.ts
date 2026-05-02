import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const scoreBands = ["Below Basic", "Basic", "Proficient", "Advanced"];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") || "";
  const assessmentId = searchParams.get("assessmentId") || "";
  const gradeLevel = Number.parseInt(searchParams.get("gradeLevel") || "", 10);
  const scoreBand = searchParams.get("scoreBand") || "";

  const context = await getTeacherContext((session.user as any).id, role);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });

  const selectedClassIds = classId ? context.classes.filter((classRoom) => classRoom.id === classId).map((classRoom) => classRoom.id) : context.classes.map((classRoom) => classRoom.id);
  const selectedStudentUserIds = context.classes
    .filter((classRoom) => selectedClassIds.includes(classRoom.id))
    .flatMap((classRoom) => classRoom.enrollments.map((enrollment) => enrollment.studentProfile.userId));

  const responses = await db.responseRecord.findMany({
    where: {
      questionType: "TDA",
      session: {
        userId: { in: selectedStudentUserIds },
        submittedAt: { not: null },
        ...(assessmentId ? { assessmentId } : {}),
        ...(Number.isFinite(gradeLevel) ? { assessment: { grade: gradeLevel } } : {}),
      },
      essayEvaluation: { isNot: null },
    },
    include: {
      essayEvaluation: true,
      session: {
        include: {
          user: { include: { studentProfile: { include: { enrollments: { include: { classRoom: true } } } } } },
          assessment: { include: { assignments: { include: { classRoom: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = responses
    .map((response) => buildResult(response, selectedClassIds))
    .filter((result) => !scoreBand || result.performanceBand === scoreBand || result.displayBand === scoreBand);

  const assessments = uniqueBy(
    responses.map((response) => ({ id: response.session.assessment.id, title: response.session.assessment.title })),
    "id",
  );
  const gradeLevels = Array.from(new Set(responses.map((response) => response.session.assessment.grade))).sort((a, b) => a - b);

  return NextResponse.json({
    filters: {
      classes: context.classes.map((classRoom) => ({ id: classRoom.id, name: classRoom.name, grade: classRoom.grade })),
      assessments,
      gradeLevels,
      scoreBands,
    },
    results,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const responseRecordId = String(body.responseRecordId || "");
  const teacherScore = Number.parseInt(String(body.teacherScore || ""), 10);
  const teacherFeedback = typeof body.teacherFeedback === "string" ? body.teacherFeedback.trim() : "";
  if (!responseRecordId) return NextResponse.json({ error: "Missing responseRecordId." }, { status: 400 });
  if (!Number.isFinite(teacherScore) || teacherScore < 1 || teacherScore > 4) return NextResponse.json({ error: "Teacher score must be 1-4." }, { status: 400 });

  const context = await getTeacherContext((session.user as any).id, role);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const allowedStudentIds = new Set(context.classes.flatMap((classRoom) => classRoom.enrollments.map((enrollment) => enrollment.studentProfile.userId)));

  const response = await db.responseRecord.findUnique({
    where: { id: responseRecordId },
    include: { essayEvaluation: true, session: true },
  });
  if (!response || response.questionType !== "TDA" || !response.essayEvaluation) return NextResponse.json({ error: "TDA response not found." }, { status: 404 });
  if (role !== "ADMIN" && !allowedStudentIds.has(response.session.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.essayEvaluation.update({
    where: { responseRecordId },
    data: {
      teacherScore,
      teacherFeedback: teacherFeedback || null,
      teacherRubricBreakdown: buildTeacherRubricBreakdown(teacherScore, teacherFeedback) as Prisma.InputJsonValue,
      reviewedAt: new Date(),
      reviewedById: (session.user as any).id,
    },
  });

  return NextResponse.json({ ok: true, evaluation: updated });
}

async function getTeacherContext(userId: string, role: string) {
  if (role === "ADMIN") {
    const classes = await db.classRoom.findMany({
      include: { enrollments: { include: { studentProfile: { include: { user: true } } } } },
      orderBy: { name: "asc" },
    });
    return { classes };
  }

  const teacher = await db.teacherProfile.findUnique({
    where: { userId },
    include: { classes: { include: { enrollments: { include: { studentProfile: { include: { user: true } } } } }, orderBy: { name: "asc" } } },
  });
  if (!teacher) return { error: "Teacher profile not found.", status: 404 };
  return { classes: teacher.classes };
}

function buildResult(response: any, selectedClassIds: string[]) {
  const payload = response.answerPayload || {};
  const evaluation = response.essayEvaluation;
  const studentClasses = response.session.user.studentProfile?.enrollments?.map((enrollment: any) => enrollment.classRoom) || [];
  const assignedClasses = response.session.assessment.assignments?.map((assignment: any) => assignment.classRoom) || [];
  const classRoom = assignedClasses.find((item: any) => selectedClassIds.includes(item.id)) || studentClasses.find((item: any) => selectedClassIds.includes(item.id)) || studentClasses[0] || assignedClasses[0] || null;
  const displayScore = evaluation.teacherScore ?? evaluation.score;
  const teacherFriendlyFeedback = evaluation.teacherFeedback || buildTeacherFriendlyFeedback(evaluation, displayScore);
  const needsReview = displayScore <= 2 || hasWeakEvidence(evaluation, String(payload.essay || ""));

  return {
    responseRecordId: response.id,
    sessionId: response.session.id,
    studentName: response.session.user.name,
    studentEmail: response.session.user.email,
    classRoomId: classRoom?.id || null,
    className: classRoom?.name || "Unassigned",
    assessmentId: response.session.assessment.id,
    assessmentTitle: response.session.assessment.title,
    gradeLevel: response.session.assessment.grade,
    prompt: String(payload.prompt || "TDA prompt unavailable."),
    essay: String(payload.essay || ""),
    aiScore: evaluation.score,
    teacherScore: evaluation.teacherScore,
    displayScore,
    maxScore: evaluation.maxScore,
    performanceBand: evaluation.performanceBand,
    displayBand: scoreToBand(displayScore),
    strengths: asStringArray(evaluation.strengths),
    areasForGrowth: asStringArray(evaluation.areasForGrowth),
    teacherFriendlyFeedback,
    studentFriendlyFeedback: evaluation.feedback,
    nextSteps: asStringArray(evaluation.nextSteps),
    rubricBreakdown: normalizeRubricBreakdown(evaluation.teacherRubricBreakdown || evaluation.rubricBreakdown),
    gradingProvider: evaluation.gradingProvider,
    needsReview,
    submittedAt: response.session.submittedAt,
    reviewedAt: evaluation.reviewedAt,
  };
}

function buildTeacherFriendlyFeedback(evaluation: any, score: number) {
  const focus = score >= 3 ? "The response is near or at proficiency." : "The response should be reviewed before sharing final writing guidance.";
  const growth = asStringArray(evaluation.areasForGrowth).slice(0, 2).join(" ");
  return `${focus} ${growth || "Check the claim, evidence, explanation, organization, and conventions against the PSSA TDA rubric."}`;
}

function hasWeakEvidence(evaluation: any, essay: string) {
  const breakdown = evaluation.rubricBreakdown || {};
  const evidence = String(breakdown.evidence || breakdown.textEvidence || "").toLowerCase();
  const growth = asStringArray(evaluation.areasForGrowth).join(" ").toLowerCase();
  const lowerEssay = essay.toLowerCase();
  const evidenceLanguage = ["evidence", "text", "passage", "author", "states", "shows", "suggests", "quote", "paragraph"].some((word) => lowerEssay.includes(word));
  return evidence.includes("limited") || evidence.includes("missing") || growth.includes("evidence") || !evidenceLanguage;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function scoreToBand(score: number) {
  if (score >= 4) return "Advanced";
  if (score >= 3) return "Proficient";
  if (score >= 2) return "Basic";
  return "Below Basic";
}

function buildTeacherRubricBreakdown(score: number, feedback: string) {
  const descriptor = score >= 4 ? "advanced" : score >= 3 ? "proficient" : score >= 2 ? "basic" : "below basic";
  return {
    analysisOfText: descriptor,
    useOfTextEvidence: descriptor,
    explanationOfEvidence: descriptor,
    organization: descriptor,
    languageAndConventions: descriptor,
    teacherNote: feedback || "Teacher score override saved.",
  };
}

function normalizeRubricBreakdown(value: any) {
  const source = value || {};
  return {
    analysisOfText: source.analysisOfText ?? source.analysis ?? "Not scored",
    useOfTextEvidence: source.useOfTextEvidence ?? source.textEvidence ?? source.evidence ?? "Not scored",
    explanationOfEvidence: source.explanationOfEvidence ?? source.explanation ?? "Not scored",
    organization: source.organization ?? "Not scored",
    languageAndConventions: source.languageAndConventions ?? source.conventions ?? "Not scored",
  };
}

function uniqueBy<T extends Record<string, any>>(items: T[], key: keyof T) {
  return Array.from(new Map(items.map((item) => [item[key], item])).values());
}
