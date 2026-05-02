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
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      studentName: lesson.learningPath.session.user.name,
      assessmentTitle: lesson.learningPath.session.assessment.title,
      gradeLevel: lesson.gradeLevel,
      standardCode: lesson.standardCode,
      skill: lesson.skill,
      title: lesson.title,
      whyAssigned: lesson.whyAssigned,
      status: lesson.progress[0]?.status || "NOT_STARTED",
      masteryScore: lesson.progress[0]?.masteryScore ?? null,
      masteryStatus: lesson.progress[0]?.masteryStatus || "NOT_STARTED",
      questAttempts: lesson.questAttempts.length,
      latestQuestScore: lesson.questAttempts[0] ? `${lesson.questAttempts[0].score}/${lesson.questAttempts[0].maxScore}` : null,
      latestQuestXp: lesson.questAttempts[0]?.xpEarned ?? null,
    })),
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
