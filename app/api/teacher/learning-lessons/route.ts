import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teacher = await db.teacherProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: { classes: { include: { enrollments: { include: { studentProfile: { include: { user: true } } } } } } },
  });
  if (!teacher) return NextResponse.json({ lessons: [], resources: [], standardsProgress: [] });

  const studentUserIds = teacher.classes.flatMap((classRoom) => classRoom.enrollments.map((enrollment) => enrollment.studentProfile.userId));
  const libraryLessons = await db.learningLesson.findMany({
    include: {
      learningPath: { include: { session: { include: { user: true, assessment: true } } } },
      progress: true,
      items: { orderBy: { order: "asc" } },
    },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { createdAt: "desc" }],
  });
  const lessons = await db.learningLesson.findMany({
    where: { learningPath: { session: { userId: { in: studentUserIds } } } },
    include: {
      learningPath: { include: { session: { include: { user: true, assessment: true } } } },
      progress: true,
      questAttempts: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
  const resources = await db.resourceLink.findMany({ orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }] });
  const readingCoachAttempts = await db.readingCoachAttempt.findMany({
    where: { userId: { in: studentUserIds } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const standardsMap = new Map<string, { standardCode: string; skill: string; lessonCount: number; completed: number; mastered: number }>();
  lessons.forEach((lesson) => {
    const key = `${lesson.standardCode}:${lesson.skill}`;
    if (!standardsMap.has(key)) standardsMap.set(key, { standardCode: lesson.standardCode, skill: lesson.skill, lessonCount: 0, completed: 0, mastered: 0 });
    const row = standardsMap.get(key)!;
    row.lessonCount += 1;
    const status = lesson.progress[0]?.status || "NOT_STARTED";
    if (status === "COMPLETED" || status === "MASTERED") row.completed += 1;
    if (status === "MASTERED") row.mastered += 1;
  });

  return NextResponse.json({
    classes: teacher.classes.map((classRoom) => ({
      id: classRoom.id,
      name: classRoom.name,
      grade: classRoom.grade,
      studentCount: classRoom.enrollments.length,
    })),
    libraryLessons: dedupeLibraryLessons(libraryLessons).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      gradeLevel: lesson.gradeLevel,
      standardCode: lesson.standardCode,
      standardLabel: lesson.standardLabel,
      skill: lesson.skill,
      generatedBy: lesson.generatedBy,
      aiStatus: lesson.aiStatus,
      lessonExplanation: lesson.lessonExplanation,
      workedExample: lesson.workedExample,
      whyAssigned: lesson.whyAssigned,
      resourceTitle: lesson.resourceTitle,
      resourceProvider: lesson.resourceProvider,
      resourceDescription: lesson.resourceDescription,
      guidedPractice: lesson.guidedPractice,
      independentPractice: lesson.independentPractice,
      exitTicket: lesson.exitTicket,
      masteryCheck: lesson.masteryCheck,
      retestRecommendation: lesson.retestRecommendation,
      items: lesson.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        title: item.title,
        content: item.content,
        order: item.order,
      })),
      sourceAssessment: lesson.learningPath.session.assessment.title,
      sourceStudent: lesson.learningPath.session.user.name,
      assignedCount: lesson.progress.length,
      createdAt: lesson.createdAt,
    })),
    lessons: lessons.map((lesson) => {
      const progress = lesson.progress[0];
      const guidedComplete = isStepComplete(progress?.guidedResponses);
      const independentComplete = isStepComplete(progress?.independentResponses);
      const exitTicketComplete = isStepComplete(progress?.exitTicketResponses);
      const masteryScore = progress?.masteryScore ?? null;
      const arcadeUnlocked = progress?.status === "MASTERED" || progress?.masteryStatus === "MASTERED" || (masteryScore ?? 0) >= 80;
      return {
        id: lesson.id,
        studentName: lesson.learningPath.session.user.name,
        assessmentTitle: lesson.learningPath.session.assessment.title,
        gradeLevel: lesson.gradeLevel,
        standardCode: lesson.standardCode,
        skill: lesson.skill,
        title: lesson.title,
        whyAssigned: lesson.whyAssigned,
        status: progress?.status || "NOT_STARTED",
        masteryScore,
        masteryStatus: progress?.masteryStatus || "NOT_STARTED",
        guidedComplete,
        independentComplete,
        exitTicketComplete,
        arcadeUnlocked,
        currentStep: currentStep({
          status: progress?.status || "NOT_STARTED",
          guidedComplete,
          independentComplete,
          exitTicketComplete,
          arcadeUnlocked,
          hasQuestAttempt: lesson.questAttempts.length > 0,
        }),
        questAttempts: lesson.questAttempts.length,
        latestQuestScore: lesson.questAttempts[0] ? `${lesson.questAttempts[0].score}/${lesson.questAttempts[0].maxScore}` : null,
        latestQuestXp: lesson.questAttempts[0]?.xpEarned ?? null,
      };
    }),
    resources,
    readingCoachAttempts: readingCoachAttempts.map((attempt) => ({
      id: attempt.id,
      studentName: attempt.user.name,
      gradeLevel: attempt.gradeLevel,
      activityType: attempt.activityType,
      accuracy: attempt.accuracy,
      wordsPerMinute: attempt.wordsPerMinute,
      focusAreas: attempt.focusAreas,
      provider: attempt.provider,
      createdAt: attempt.createdAt,
    })),
    standardsProgress: Array.from(standardsMap.values()),
  });
}

function isStepComplete(value: unknown) {
  return Boolean(value && typeof value === "object" && "completed" in value && (value as { completed?: unknown }).completed);
}

function currentStep({
  status,
  guidedComplete,
  independentComplete,
  exitTicketComplete,
  arcadeUnlocked,
  hasQuestAttempt,
}: {
  status: string;
  guidedComplete: boolean;
  independentComplete: boolean;
  exitTicketComplete: boolean;
  arcadeUnlocked: boolean;
  hasQuestAttempt: boolean;
}) {
  if (hasQuestAttempt) return "Arcade practice";
  if (arcadeUnlocked) return "Arcade unlocked";
  if (status === "MASTERED") return "Mastered";
  if (exitTicketComplete) return "Mastery check";
  if (independentComplete) return "Exit ticket";
  if (guidedComplete) return "Independent practice";
  if (status === "IN_PROGRESS" || status === "COMPLETED") return "Guided practice";
  return "Not started";
}

function dedupeLibraryLessons(lessons: any[]) {
  const seen = new Set<string>();
  const rows: any[] = [];
  for (const lesson of lessons) {
    const key = `${lesson.gradeLevel}:${lesson.standardCode}:${lesson.skill}:${lesson.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(lesson);
  }
  return rows;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const standardCode = String(body.standardCode || "").trim();
  const skill = String(body.skill || "").trim();
  const title = String(body.title || "").trim();
  const url = String(body.url || "").trim();
  const provider = String(body.provider || "Curated resource").trim();
  if (!standardCode || !skill || !title || !url) return NextResponse.json({ error: "Standard, skill, title, and URL are required." }, { status: 400 });

  const resource = await db.resourceLink.create({
    data: {
      gradeLevel: body.gradeLevel ? Number(body.gradeLevel) : null,
      standardCode,
      skill,
      title,
      url,
      provider,
      description: body.description ? String(body.description) : null,
      createdById: (session.user as any).id,
    },
  });
  return NextResponse.json({ resource });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const lessonIds = Array.isArray(body.lessonIds)
    ? body.lessonIds.map((id: unknown) => String(id)).filter(Boolean)
    : [String(body.lessonId || "")].filter(Boolean);
  const classRoomId = String(body.classRoomId || "");
  if (!lessonIds.length || !classRoomId) return NextResponse.json({ error: "At least one lesson and a class are required." }, { status: 400 });

  const teacher = await db.teacherProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: { classes: { include: { enrollments: { include: { studentProfile: true } } } } },
  });
  if (role === "TEACHER" && !teacher) return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });

  const classRoom = role === "TEACHER"
    ? teacher?.classes.find((room) => room.id === classRoomId)
    : await db.classRoom.findUnique({ where: { id: classRoomId }, include: { enrollments: { include: { studentProfile: true } } } });
  if (!classRoom) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const lessonCount = await db.learningLesson.count({ where: { id: { in: lessonIds } } });
  if (lessonCount !== lessonIds.length) return NextResponse.json({ error: "One or more lessons were not found." }, { status: 404 });

  const studentUserIds = classRoom.enrollments.map((enrollment) => enrollment.studentProfile.userId);
  await db.$transaction(
    lessonIds.flatMap((lessonId) =>
      studentUserIds.map((userId) =>
        db.studentLessonProgress.upsert({
          where: { lessonId_userId: { lessonId, userId } },
          update: {},
          create: { lessonId, userId },
        }),
      ),
    ),
  );

  return NextResponse.json({ ok: true, assignedCount: studentUserIds.length, lessonCount: lessonIds.length });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Resource id is required." }, { status: 400 });

  const resource = await db.resourceLink.update({
    where: { id },
    data: {
      gradeLevel: body.gradeLevel === "" ? null : body.gradeLevel === undefined ? undefined : Number(body.gradeLevel),
      standardCode: body.standardCode === undefined ? undefined : String(body.standardCode),
      skill: body.skill === undefined ? undefined : String(body.skill),
      title: body.title === undefined ? undefined : String(body.title),
      url: body.url === undefined ? undefined : String(body.url),
      provider: body.provider === undefined ? undefined : String(body.provider),
      description: body.description === undefined ? undefined : String(body.description),
    },
  });
  return NextResponse.json({ resource });
}
