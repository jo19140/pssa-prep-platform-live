import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  assembleBridgeLessons,
  assertUniqueStudentProfileIds,
  isApprovedLearningLessonReviewStatus,
  parseSchoolDateUtcNoon,
  planAssignmentOutcomes,
} from "@/lib/content/pssaAssignRecommendedLesson";
import { loadPssaClassReportForTeacher } from "@/lib/content/pssaClassReportServerLoader";
import { suggestLessonsForReport } from "@/lib/content/pssaLessonBridge";
import { pssaNoStoreHeaders } from "@/lib/content/pssaItemReview";
import { buildPrebuiltLessonSeeds } from "@/lib/prebuiltLessonLibrary";

const requestSchema = z.object({
  classRoomId: z.string().trim().min(1).max(128),
  formId: z.string().trim().min(1).max(128),
  benchmarkSeason: z.string().trim().min(1).max(40).optional(),
  groupId: z.string().trim().min(1).max(128),
  lessonId: z.string().trim().min(1).max(128),
  studentProfileIds: z.array(z.string().trim().min(1).max(128)).min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return json({ error: "Unauthorized" }, 401);
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return json({ error: "Forbidden" }, 403);

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request", issues: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;
  if (!assertUniqueStudentProfileIds(body.studentProfileIds)) return json({ error: "Duplicate studentProfileIds" }, 400);
  const dueDate = parseSchoolDateUtcNoon(body.dueDate);
  if (!dueDate) return json({ error: "Invalid dueDate" }, 400);

  const teacher = await db.teacherProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!teacher) return json({ error: "Teacher profile not found" }, 404);

  const loaded = await loadPssaClassReportForTeacher({
    db,
    classRoomId: body.classRoomId,
    formId: body.formId,
    teacherId: teacher.id,
    benchmarkSeason: body.benchmarkSeason,
  });
  if ("error" in loaded) {
    if (loaded.error === "class_not_found") return json({ error: "Class not found" }, 404);
    if (loaded.error === "form_not_found") return json({ error: "Form not found" }, 404);
    return json({ error: "Forbidden" }, 403);
  }
  if (body.studentProfileIds.length > loaded.classRoom.enrollments.length) return json({ error: "Too many studentProfileIds" }, 400);

  const group = loaded.report.suggestedGroups.find((row) => row.groupId === body.groupId);
  if (!group) return json({ error: "stale_report_group" }, 409);

  const enrolledProfileIds = new Set(loaded.classRoom.enrollments.map((enrollment) => enrollment.studentProfile.id));
  const groupProfileIds = new Set(group.studentIds);
  if (body.studentProfileIds.some((id) => !enrolledProfileIds.has(id) || !groupProfileIds.has(id))) {
    return json({ error: "studentProfileIds must be enrolled in class and in the suggested group" }, 400);
  }

  const dbLessons = await db.learningLesson.findMany({
    where: { reviewStatus: "APPROVED" },
    select: { id: true, title: true, skill: true, gradeLevel: true, standardCode: true, reviewStatus: true },
  });
  const bridgeLessons = assembleBridgeLessons(dbLessons, buildPrebuiltLessonSeeds());
  const suggestions = suggestLessonsForReport(loaded.report, bridgeLessons);
  const candidates = suggestions.perGroup.find((row) => row.groupId === body.groupId)?.candidates ?? [];
  const selectedLesson = bridgeLessons.find((lesson) => lesson.lessonId === body.lessonId);
  if (!selectedLesson || !isApprovedLearningLessonReviewStatus(selectedLesson.reviewStatus) || !candidates.some((candidate) => candidate.lessonId === body.lessonId)) {
    return json({ error: "stale_or_invalid_lesson_candidate" }, 409);
  }

  const profileToUserId = new Map<string, string>();
  for (const enrollment of loaded.classRoom.enrollments) {
    if (body.studentProfileIds.includes(enrollment.studentProfile.id)) {
      if (!enrollment.studentProfile.userId) return json({ error: `Missing linked user for studentProfileId ${enrollment.studentProfile.id}` }, 400);
      profileToUserId.set(enrollment.studentProfile.id, enrollment.studentProfile.userId);
    }
  }
  const requestedUserIds = body.studentProfileIds.map((id) => profileToUserId.get(id)).filter((id): id is string => Boolean(id));
  if (requestedUserIds.length !== body.studentProfileIds.length) return json({ error: "Missing linked user" }, 400);

  const existingProgress = await db.studentLessonProgress.findMany({
    where: { lessonId: body.lessonId, userId: { in: requestedUserIds } },
    select: {
      userId: true,
      status: true,
      guidedResponses: true,
      independentResponses: true,
      exitTicketResponses: true,
      masteryScore: true,
      masteryStatus: true,
      completedAt: true,
      masteredAt: true,
    },
  });
  const outcomes = planAssignmentOutcomes({
    requestedStudentProfileIds: body.studentProfileIds,
    profileToUserId,
    existingProgressByUserId: new Map(existingProgress.map((row) => [row.userId, row])),
  });

  await db.$transaction(async (tx) => {
    for (const outcome of outcomes) {
      await tx.studentLessonProgress.upsert({
        where: { lessonId_userId: { lessonId: body.lessonId, userId: outcome.userId } },
        update: { dueDate },
        create: { lessonId: body.lessonId, userId: outcome.userId, dueDate },
      });
    }
  });

  return json({
    ok: true,
    lessonId: body.lessonId,
    dueDate: body.dueDate,
    results: outcomes.map(({ studentProfileId, outcome }) => ({ studentProfileId, outcome })),
  }, 200);
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: pssaNoStoreHeaders() });
}
