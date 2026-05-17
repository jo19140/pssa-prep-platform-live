import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const resourceLinkSchema = z.object({
  gradeLevel: z.union([z.coerce.number().int().min(3).max(8), z.literal(""), z.null()]).optional(),
  standardCode: z.string().trim().min(1).max(80),
  skill: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  url: z.string().trim().url().max(2048),
  provider: z.string().trim().max(120).optional().default("Curated resource"),
  description: z.string().trim().max(1000).optional().nullable(),
});

const assignLessonsSchema = z.object({
  lessonId: z.string().max(128).optional(),
  lessonIds: z.array(z.string().min(1).max(128)).max(100).optional(),
  classRoomId: z.string().min(1).max(128),
});

const updateResourceSchema = resourceLinkSchema.partial().extend({
  id: z.string().min(1).max(128),
});

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
  const studentClassByUserId = new Map<string, { className: string; classId: string }>();
  for (const classRoom of teacher.classes) {
    for (const enrollment of classRoom.enrollments) {
      if (!studentClassByUserId.has(enrollment.studentProfile.userId)) {
        studentClassByUserId.set(enrollment.studentProfile.userId, { className: classRoom.name, classId: classRoom.id });
      }
    }
  }
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
  const teacherGrades = Array.from(new Set(teacher.classes.map((classRoom) => classRoom.grade))).sort((a, b) => a - b);
  const resourcesRaw = await db.resourceLink.findMany({ orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { title: "asc" }] });
  const resources = resourcesRaw.sort((a, b) => {
    const aMatch = a.gradeLevel != null && teacherGrades.includes(a.gradeLevel) ? 0 : 1;
    const bMatch = b.gradeLevel != null && teacherGrades.includes(b.gradeLevel) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return (a.gradeLevel || 99) - (b.gradeLevel || 99) || a.standardCode.localeCompare(b.standardCode) || a.title.localeCompare(b.title);
  });
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
    teacherGrades,
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
      sourcePayload: lesson.sourcePayload,
      qualityBlueprint: getSourceField(lesson.sourcePayload, "qualityBlueprint"),
      qualityReview: getSourceField(lesson.sourcePayload, "qualityReview"),
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
        studentEmail: lesson.learningPath.session.user.email,
        className: studentClassByUserId.get(lesson.learningPath.session.userId)?.className || null,
        classId: studentClassByUserId.get(lesson.learningPath.session.userId)?.classId || null,
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
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
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

function getSourceField(sourcePayload: unknown, key: string) {
  if (!sourcePayload || typeof sourcePayload !== "object") return null;
  return (sourcePayload as Record<string, unknown>)[key] || null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = String((session.user as any).id || "unknown");
  const userLimit = await consumeRateLimit({ key: `teacher-learning-lessons:user:${userId}`, capacity: 30, refillIntervalMs: 60 * 60 * 1000 });
  const ipLimit = await consumeRateLimit({ key: `teacher-learning-lessons:ip:${getClientIp(req)}`, capacity: 90, refillIntervalMs: 60 * 60 * 1000 });
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many learning-lesson requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec)) } });
  }

  const parsed = resourceLinkSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const body = parsed.data;

  const resource = await db.resourceLink.create({
    data: {
      gradeLevel: body.gradeLevel ? Number(body.gradeLevel) : null,
      standardCode: body.standardCode,
      skill: body.skill,
      title: body.title,
      url: body.url,
      provider: body.provider,
      description: body.description || null,
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

  const parsed = assignLessonsSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const body = parsed.data;
  const lessonIds = body.lessonIds?.length ? body.lessonIds : [body.lessonId || ""].filter(Boolean);
  const classRoomId = body.classRoomId;
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
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateResourceSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const body = parsed.data;

  const resource = await db.resourceLink.update({
    where: { id: body.id },
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
