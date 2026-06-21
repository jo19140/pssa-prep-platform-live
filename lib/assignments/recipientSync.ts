import { Prisma, type AssignmentRecipient, type GradeRecord, type LearningAssignment } from "@prisma/client";
import { openLessonStudentKey } from "@/lib/assignments/learningAssignmentServiceCore";

export type ProgressForRecipientSync = {
  id: string;
  lessonId: string;
  userId: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  masteredAt: Date | null;
};

export type SyncedRecipient = AssignmentRecipient & {
  assignment: LearningAssignment;
  gradeRecord: GradeRecord | null;
};

export async function syncRecipientFromProgress(
  tx: Prisma.TransactionClient,
  progress: ProgressForRecipientSync,
  now: Date = new Date(),
): Promise<SyncedRecipient | null> {
  const studentProfile = await tx.studentProfile.findUnique({
    where: { userId: progress.userId },
    select: { id: true },
  });
  if (!studentProfile) return null;

  const openRecipient = await tx.assignmentRecipient.findUnique({
    where: { openLessonStudentKey: openLessonStudentKey(progress.lessonId, studentProfile.id) },
    include: { assignment: true, gradeRecord: true },
  });
  const recipient = openRecipient ?? await findCompletedCanonicalRecipient(tx, progress, studentProfile.id);
  if (!recipient) return null;

  const nextStatus = recipientStatusFromProgress(progress.status);
  if (!nextStatus || wouldRegressRecipientStatus(recipient.status, nextStatus)) {
    return recipient;
  }

  const lifecycleTime = progress.completedAt ?? progress.masteredAt ?? progress.startedAt ?? now;
  const updateData: Prisma.AssignmentRecipientUpdateInput = {
    status: nextStatus,
  };

  if ((nextStatus === "IN_PROGRESS" || nextStatus === "SUBMITTED" || nextStatus === "COMPLETED") && !recipient.startedAt) {
    updateData.startedAt = progress.startedAt ?? lifecycleTime;
  }
  if ((nextStatus === "SUBMITTED" || nextStatus === "COMPLETED") && !recipient.submittedAt) {
    updateData.submittedAt = progress.completedAt ?? progress.masteredAt ?? lifecycleTime;
  }
  if (nextStatus === "COMPLETED" && !recipient.completedAt) {
    updateData.completedAt = progress.completedAt ?? progress.masteredAt ?? lifecycleTime;
  }

  return tx.assignmentRecipient.update({
    where: { id: recipient.id },
    data: updateData,
    include: { assignment: true, gradeRecord: true },
  });
}

async function findCompletedCanonicalRecipient(
  tx: Prisma.TransactionClient,
  progress: ProgressForRecipientSync,
  studentProfileId: string,
) {
  const nextStatus = recipientStatusFromProgress(progress.status);
  if (nextStatus !== "COMPLETED") return null;
  return tx.assignmentRecipient.findFirst({
    where: {
      studentProfileId,
      assignment: { lessonId: progress.lessonId, assignmentType: "LESSON" },
    },
    include: { assignment: true, gradeRecord: true },
    orderBy: { createdAt: "desc" },
  });
}

function recipientStatusFromProgress(status: string) {
  if (status === "MASTERED" || status === "COMPLETED") return "COMPLETED";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "SUBMITTED") return "SUBMITTED";
  return status === "NOT_STARTED" ? "NOT_STARTED" : null;
}

function wouldRegressRecipientStatus(current: AssignmentRecipient["status"], next: AssignmentRecipient["status"]) {
  return recipientStatusRank(current) > recipientStatusRank(next);
}

function recipientStatusRank(status: AssignmentRecipient["status"]) {
  switch (status) {
    case "COMPLETED":
      return 3;
    case "SUBMITTED":
      return 2;
    case "IN_PROGRESS":
      return 1;
    case "NOT_STARTED":
    default:
      return 0;
  }
}
