import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { planAssignmentOutcomes } from "@/lib/content/pssaAssignRecommendedLesson";
import {
  assertApprovedLesson,
  assertIdempotencyReuse,
  assertNoLegacyProgressConflicts,
  openLessonStudentKey,
  planOpenCycle,
  LearningAssignmentServiceError,
  type ExistingProgressForAssignment,
} from "@/lib/assignments/learningAssignmentServiceCore";

export { LearningAssignmentServiceError };
export {
  buildLessonAssignmentRequestFingerprint,
  buildReportRecommendationIdempotencyKey,
} from "@/lib/assignments/learningAssignmentServiceCore";

type Database = PrismaClient;

export type CreateLessonAssignmentInput = {
  lessonId: string;
  classRoomId: string;
  assignedByUserId: string;
  studentProfileIds: string[];
  dueDate?: Date | null;
  origin: "MANUAL" | "REPORT_RECOMMENDATION";
  idempotencyKey: string;
  requestFingerprint: string;
  originKey?: string | null;
  reportContext?: Prisma.InputJsonObject | null;
  audienceLabel?: string | null;
  reportFormId?: string | null;
  reportGroupId?: string | null;
};

export type CreateLessonAssignmentResult = {
  assignmentId: string;
  reused: boolean;
  results: Array<{ studentProfileId: string; userId: string; outcome: "created" | "updated" }>;
};

export async function createLessonAssignment(
  input: CreateLessonAssignmentInput,
  database: Database = db,
): Promise<CreateLessonAssignmentResult> {
  return runSerializableWithRetry(database, (tx) => createLessonAssignmentInTransaction(tx, input));
}

async function createLessonAssignmentInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateLessonAssignmentInput,
): Promise<CreateLessonAssignmentResult> {
  const lesson = await tx.learningLesson.findUnique({
    where: { id: input.lessonId },
    select: { id: true, title: true, reviewStatus: true, gradeLevel: true, standardCode: true, skill: true },
  });
  if (!lesson) throw new LearningAssignmentServiceError("lesson_not_approved");
  assertApprovedLesson(lesson.reviewStatus);

  const existingIdempotent = await tx.learningAssignment.findUnique({
    where: {
      assignedByUserId_idempotencyKey: {
        assignedByUserId: input.assignedByUserId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    select: { id: true, requestFingerprint: true },
  });
  const idempotencyAction = assertIdempotencyReuse(existingIdempotent, input.requestFingerprint);

  const profileToUserId = await loadProfileToUserId(tx, input.classRoomId, input.studentProfileIds);
  const requestedUserIds = input.studentProfileIds.map((studentProfileId) => {
    const userId = profileToUserId.get(studentProfileId);
    if (!userId) throw new LearningAssignmentServiceError("missing_student_profile", `missing_student_profile:${studentProfileId}`);
    return userId;
  });

  const existingProgress = await tx.studentLessonProgress.findMany({
    where: { lessonId: input.lessonId, userId: { in: requestedUserIds } },
    select: {
      userId: true,
      status: true,
      guidedResponses: true,
      independentResponses: true,
      exitTicketResponses: true,
      masteryScore: true,
      masteryStatus: true,
    },
  });
  const existingProgressByUserId = new Map(existingProgress.map((row) => [row.userId, row satisfies ExistingProgressForAssignment]));
  const outcomes = planAssignmentOutcomes({
    requestedStudentProfileIds: input.studentProfileIds,
    profileToUserId,
    existingProgressByUserId,
  });

  if (idempotencyAction === "reuse" && existingIdempotent) {
    await updateStudentLessonProgress(tx, input.lessonId, input.dueDate ?? null, outcomes);
    return { assignmentId: existingIdempotent.id, reused: true, results: outcomes };
  }

  const canonicalRecipients = await tx.assignmentRecipient.findMany({
    where: {
      studentProfileId: { in: input.studentProfileIds },
      assignment: { lessonId: input.lessonId },
    },
    select: { studentProfileId: true },
  });
  const canonicalRecipientProfileIds = new Set(canonicalRecipients.map((recipient) => recipient.studentProfileId));
  assertNoLegacyProgressConflicts({
    studentProfileIds: input.studentProfileIds,
    profileToUserId,
    existingProgressByUserId,
    canonicalRecipientProfileIds,
  });

  const openRecipients = await tx.assignmentRecipient.findMany({
    where: {
      openLessonStudentKey: {
        in: input.studentProfileIds.map((studentProfileId) => openLessonStudentKey(input.lessonId, studentProfileId)),
      },
    },
    select: { assignmentId: true, studentProfileId: true },
  });
  const openPlan = planOpenCycle({ studentProfileIds: input.studentProfileIds, openRecipients });

  if (openPlan.action === "reuse") {
    await tx.learningAssignment.update({
      where: { id: openPlan.assignmentId },
      data: { dueDate: input.dueDate ?? null },
    });
    await updateStudentLessonProgress(tx, input.lessonId, input.dueDate ?? null, outcomes);
    return { assignmentId: openPlan.assignmentId, reused: true, results: outcomes };
  }

  const assignment = await tx.learningAssignment.create({
    data: {
      title: lesson.title,
      assignmentType: "LESSON",
      origin: input.origin,
      status: "ASSIGNED",
      classRoomId: input.classRoomId,
      assignedByUserId: input.assignedByUserId,
      gradeLevel: lesson.gradeLevel,
      standards: [lesson.standardCode],
      lessonId: lesson.id,
      dueDate: input.dueDate ?? null,
      audienceLabel: input.audienceLabel ?? null,
      originContextJson: input.reportContext ?? Prisma.JsonNull,
      reportFormId: input.reportFormId ?? null,
      reportGroupId: input.reportGroupId ?? null,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      originKey: input.originKey ?? null,
      recipients: {
        create: input.studentProfileIds.map((studentProfileId) => ({
          studentProfileId,
          status: "NOT_STARTED",
          openLessonStudentKey: openLessonStudentKey(input.lessonId, studentProfileId),
          gradeRecord: {
            create: {
              status: "UNGRADED",
              gradeLevelAtAssignment: lesson.gradeLevel,
            },
          },
        })),
      },
    },
    select: { id: true },
  });

  await updateStudentLessonProgress(tx, input.lessonId, input.dueDate ?? null, outcomes);
  return { assignmentId: assignment.id, reused: false, results: outcomes };
}

async function loadProfileToUserId(
  tx: Prisma.TransactionClient,
  classRoomId: string,
  studentProfileIds: string[],
) {
  const enrollments = await tx.enrollment.findMany({
    where: { classRoomId, studentProfileId: { in: studentProfileIds } },
    include: { studentProfile: { select: { id: true, userId: true } } },
  });
  if (enrollments.length !== studentProfileIds.length) {
    throw new LearningAssignmentServiceError("missing_student_profile");
  }
  return new Map(enrollments.map((enrollment) => [enrollment.studentProfile.id, enrollment.studentProfile.userId]));
}

async function updateStudentLessonProgress(
  tx: Prisma.TransactionClient,
  lessonId: string,
  dueDate: Date | null,
  outcomes: Array<{ userId: string }>,
) {
  for (const outcome of outcomes) {
    await tx.studentLessonProgress.upsert({
      where: { lessonId_userId: { lessonId, userId: outcome.userId } },
      update: { dueDate },
      create: { lessonId, userId: outcome.userId, dueDate },
    });
  }
}

async function runSerializableWithRetry<T>(
  database: Database,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await database.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof LearningAssignmentServiceError) throw error;
      if (!isRetryablePrismaError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function isRetryablePrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002")
  );
}
