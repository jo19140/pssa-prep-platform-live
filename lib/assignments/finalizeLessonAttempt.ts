import { createHash } from "node:crypto";
import { Prisma, type AssignmentRecipient, type GradeAttempt, type GradeRecord, type LearningAssignment } from "@prisma/client";

export const LESSON_MASTERY_SNAPSHOT_VERSION = "lesson-mastery-v1";

export type LessonMasteryScoreResult = {
  score: number;
  answers: Array<{ correct?: boolean } & Record<string, unknown>>;
};

export type FinalizeLessonAttemptInput = {
  recipient: AssignmentRecipient & { assignment: LearningAssignment };
  gradeRecord: GradeRecord;
  progress: { id: string; completedAt: Date | null; masteredAt: Date | null };
  scoreResult: LessonMasteryScoreResult;
  masteryStatus: string;
  responsePayload: unknown;
  now?: Date;
};

export type FinalizeLessonAttemptResult =
  | { finalized: true; attempt: GradeAttempt; idempotent: boolean }
  | { finalized: false; reason: "empty_score" };

export async function finalizeLessonAttempt(
  tx: Prisma.TransactionClient,
  input: FinalizeLessonAttemptInput,
): Promise<FinalizeLessonAttemptResult> {
  if (!input.scoreResult.answers.length) return { finalized: false, reason: "empty_score" };

  const completionKey = buildLessonCompletionKey(input.recipient.id, input.responsePayload);
  const existingAttempt = await tx.gradeAttempt.findUnique({ where: { completionKey } });
  if (existingAttempt) return { finalized: true, attempt: existingAttempt, idempotent: true };

  const attemptNumber = await nextAttemptNumber(tx, input.gradeRecord.id);
  const pointsEarned = input.scoreResult.answers.filter((answer) => answer.correct === true).length;
  const pointsPossible = input.scoreResult.answers.length;
  const submittedAt = input.progress.completedAt ?? input.progress.masteredAt ?? input.now ?? new Date();

  const attempt = await tx.gradeAttempt.create({
    data: {
      gradeRecordId: input.gradeRecord.id,
      attemptNumber,
      completionKey,
      snapshotVersion: LESSON_MASTERY_SNAPSHOT_VERSION,
      submittedAt,
      completionState: "COMPLETED",
      pointsEarned: new Prisma.Decimal(pointsEarned).toDecimalPlaces(2),
      pointsPossible: new Prisma.Decimal(pointsPossible).toDecimalPlaces(2),
      scoringStatus: "FINALIZED",
      responseSnapshotJson: toJson(input.responsePayload),
      scoringSnapshotJson: {
        scorePercent: input.scoreResult.score,
        correctCount: pointsEarned,
        total: pointsPossible,
        masteryStatus: input.masteryStatus,
        snapshotVersion: LESSON_MASTERY_SNAPSHOT_VERSION,
      },
      sourceProgressId: input.progress.id,
    },
  });

  if (attempt.gradeRecordId !== input.gradeRecord.id) {
    throw new Error("grade_attempt_record_mismatch");
  }

  await tx.gradeRecord.update({
    where: { id: input.gradeRecord.id },
    data: {
      status: "FINALIZED",
      scoreSource: "AUTO",
      pointsEarned: attempt.pointsEarned,
      pointsPossible: attempt.pointsPossible,
      selectedAttemptId: attempt.id,
      finalizedAt: submittedAt,
    },
  });

  await tx.assignmentRecipient.update({
    where: { id: input.recipient.id },
    data: {
      status: "COMPLETED",
      completedAt: submittedAt,
      submittedAt: input.recipient.submittedAt ?? submittedAt,
      startedAt: input.recipient.startedAt ?? submittedAt,
      openLessonStudentKey: null,
    },
  });

  await closeAssignmentIfComplete(tx, input.recipient.assignmentId);

  return { finalized: true, attempt, idempotent: false };
}

export function buildLessonCompletionKey(recipientId: string, responsePayload: unknown) {
  return createHash("sha256")
    .update(`${recipientId}:${stableStringify(responsePayload)}`)
    .digest("hex");
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

async function nextAttemptNumber(tx: Prisma.TransactionClient, gradeRecordId: string) {
  const latest = await tx.gradeAttempt.findFirst({
    where: { gradeRecordId },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true },
  });
  return (latest?.attemptNumber ?? 0) + 1;
}

async function closeAssignmentIfComplete(tx: Prisma.TransactionClient, assignmentId: string) {
  const assignment = await tx.learningAssignment.findUnique({
    where: { id: assignmentId },
    select: { status: true },
  });
  if (assignment?.status !== "ASSIGNED") return;

  const remaining = await tx.assignmentRecipient.count({
    where: { assignmentId, status: { not: "COMPLETED" } },
  });
  if (remaining === 0) {
    await tx.learningAssignment.update({
      where: { id: assignmentId },
      data: { status: "CLOSED" },
    });
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  return value as Prisma.InputJsonValue;
}
