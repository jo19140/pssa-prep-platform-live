import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  buildLessonAssignmentRequestFingerprint,
  createLessonAssignment,
  LearningAssignmentServiceError,
} from "@/lib/assignments/learningAssignmentService";
import { buildPrebuiltLessonSeeds } from "@/lib/prebuiltLessonLibrary";
import { deriveLessonVisibility } from "@/lib/teacher/teacherLessonLibraryCore";

const NO_STORE = { "Cache-Control": "no-store" };

const requestSchema = z.object({
  lessonId: z.string().trim().min(1).max(128),
  classRoomId: z.string().trim().min(1).max(128),
  recipientMode: z.enum(["class", "selected"]),
  studentProfileIds: z.array(z.string().trim().min(1).max(128)).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  idempotencyKey: z.string().trim().min(1).max(128),
});

export async function GET() {
  const auth = await requireUser(["TEACHER"]);
  if ("error" in auth) return withNoStore(auth.error);
  const teacher = await db.teacherProfile.findUnique({
    where: { userId: auth.user.id },
    select: {
      id: true,
      classes: {
        orderBy: [{ grade: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          grade: true,
          enrollments: {
            orderBy: { id: "asc" },
            select: {
              studentProfile: {
                select: { id: true, user: { select: { name: true, email: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!teacher) return json({ error: "Teacher profile not found" }, 404);
  return json({
    classes: teacher.classes.map((classRoom) => ({
      id: classRoom.id,
      name: classRoom.name,
      grade: classRoom.grade,
      students: classRoom.enrollments.map((enrollment) => ({
        id: enrollment.studentProfile.id,
        name: enrollment.studentProfile.user.name || enrollment.studentProfile.user.email || "Student",
      })),
    })),
  }, 200);
}

export async function POST(req: Request) {
  const auth = await requireUser(["TEACHER"]);
  if ("error" in auth) return withNoStore(auth.error);

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request", issues: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;
  const dueDate = parseSchoolDateUtcNoon(body.dueDate);
  if (!dueDate) return json({ error: "Invalid dueDate" }, 400);

  const teacher = await db.teacherProfile.findUnique({ where: { userId: auth.user.id } });
  if (!teacher) return json({ error: "Teacher profile not found" }, 404);

  const classRoom = await db.classRoom.findFirst({
    where: { id: body.classRoomId, teacherId: teacher.id },
    include: { enrollments: { include: { studentProfile: { select: { id: true } } } } },
  });
  if (!classRoom) return json({ error: "Class not found" }, 403);

  const rosterIds = classRoom.enrollments.map((enrollment) => enrollment.studentProfile.id);
  const studentProfileIds = body.recipientMode === "class"
    ? rosterIds
    : [...new Set(body.studentProfileIds ?? [])];
  if (studentProfileIds.length === 0) return json({ error: "studentProfileIds required" }, 400);
  if (body.recipientMode === "selected" && studentProfileIds.length !== (body.studentProfileIds ?? []).length) {
    return json({ error: "Duplicate studentProfileIds" }, 400);
  }
  const roster = new Set(rosterIds);
  if (studentProfileIds.some((id) => !roster.has(id))) return json({ error: "studentProfileIds must be enrolled in class" }, 400);

  const lesson = await db.learningLesson.findUnique({
    where: { id: body.lessonId },
    select: { id: true, title: true, gradeLevel: true, skill: true, reviewStatus: true },
  });
  if (!lesson || lesson.reviewStatus !== "APPROVED") return json({ error: "lesson_not_assignable" }, 409);
  if (!isStateTrackVisibleLesson(lesson)) return json({ error: "lesson_not_assignable" }, 409);

  const audienceLabel = body.recipientMode === "class"
    ? `${classRoom.name} · whole class`
    : studentProfileIds.length === 1
      ? `${classRoom.name} · 1 student`
      : `${classRoom.name} · ${studentProfileIds.length} students`;

  try {
    const result = await createLessonAssignment({
      lessonId: body.lessonId,
      classRoomId: body.classRoomId,
      assignedByUserId: auth.user.id,
      studentProfileIds,
      dueDate,
      origin: "MANUAL",
      idempotencyKey: body.idempotencyKey,
      requestFingerprint: buildLessonAssignmentRequestFingerprint({
        lessonId: body.lessonId,
        studentProfileIds,
        dueDate,
      }),
      originKey: null,
      audienceLabel,
    });
    return json({
      ok: true,
      assignmentId: result.assignmentId,
      reused: result.reused,
      dueDate: body.dueDate,
      results: result.results.map(({ studentProfileId, outcome }) => ({ studentProfileId, outcome })),
    }, 200);
  } catch (error) {
    if (error instanceof LearningAssignmentServiceError) {
      if (error.code === "missing_student_profile") return json({ error: "Missing linked user" }, 400);
      if (error.code === "idempotency_key_reuse") return json({ error: error.code }, 400);
      return json({ error: error.code }, 409);
    }
    throw error;
  }
}

function isStateTrackVisibleLesson(lesson: { gradeLevel: number; skill: string }) {
  const seed = buildPrebuiltLessonSeeds().find((candidate) => (
    candidate.gradeLevel === lesson.gradeLevel &&
    candidate.skill.trim().toLowerCase() === lesson.skill.trim().toLowerCase()
  ));
  if (!seed) return false;
  const visibility = deriveLessonVisibility(seed);
  return visibility.visible && visibility.placement === "state_track";
}

function parseSchoolDateUtcNoon(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
