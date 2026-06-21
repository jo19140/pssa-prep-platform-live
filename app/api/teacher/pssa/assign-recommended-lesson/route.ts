import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildLessonAssignmentRequestFingerprint,
  buildReportRecommendationIdempotencyKey,
  createLessonAssignment,
  LearningAssignmentServiceError,
} from "@/lib/assignments/learningAssignmentService";
import {
  assembleBridgeLessons,
  assertUniqueStudentProfileIds,
  isApprovedLearningLessonReviewStatus,
  parseSchoolDateUtcNoon,
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

  let assignmentResult;
  try {
    assignmentResult = await createLessonAssignment({
      lessonId: body.lessonId,
      classRoomId: body.classRoomId,
      assignedByUserId: String((session.user as any).id),
      studentProfileIds: body.studentProfileIds,
      dueDate,
      origin: "REPORT_RECOMMENDATION",
      idempotencyKey: buildReportRecommendationIdempotencyKey({
        classRoomId: body.classRoomId,
        formId: body.formId,
        benchmarkSeason: body.benchmarkSeason,
        groupId: body.groupId,
        lessonId: body.lessonId,
        studentProfileIds: body.studentProfileIds,
        dueDate,
      }),
      requestFingerprint: buildLessonAssignmentRequestFingerprint({
        lessonId: body.lessonId,
        studentProfileIds: body.studentProfileIds,
        dueDate,
      }),
      originKey: `report:${body.formId}:${body.groupId}:${body.lessonId}`,
      reportFormId: body.formId,
      reportGroupId: body.groupId,
      audienceLabel: `${group.label} · ${body.studentProfileIds.length} students`,
      reportContext: {
        groupLabel: group.label,
        cluster: group.cluster,
        roleFamily: group.roleFamily,
        formId: body.formId,
        groupId: body.groupId,
        reportVersion: loaded.report.classReportVersion,
        bridgeVersion: suggestions.bridgeVersion,
      },
    });
  } catch (error) {
    if (error instanceof LearningAssignmentServiceError) {
      if (error.code === "missing_student_profile") return json({ error: "Missing linked user" }, 400);
      return json({ error: error.code }, 409);
    }
    throw error;
  }

  return json({
    ok: true,
    lessonId: body.lessonId,
    dueDate: body.dueDate,
    results: assignmentResult.results.map(({ studentProfileId, outcome }) => ({ studentProfileId, outcome })),
  }, 200);
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: pssaNoStoreHeaders() });
}
