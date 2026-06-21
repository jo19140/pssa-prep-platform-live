import { createHash } from "node:crypto";

export type AssignmentServiceErrorCode =
  | "lesson_not_approved"
  | "idempotency_key_reuse"
  | "legacy_progress_conflict"
  | "cycle_conflict"
  | "missing_student_profile"
  | "empty_recipient_set";

export class LearningAssignmentServiceError extends Error {
  constructor(
    public readonly code: AssignmentServiceErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "LearningAssignmentServiceError";
  }
}

export type ExistingProgressForAssignment = {
  userId: string;
  status: string;
  guidedResponses?: unknown;
  independentResponses?: unknown;
  exitTicketResponses?: unknown;
  masteryScore?: number | null;
};

export type OpenRecipientForAssignment = {
  assignmentId: string;
  studentProfileId: string;
};

export type ExistingAssignmentForIdempotency = {
  id: string;
  requestFingerprint: string;
};

export function assertApprovedLesson(reviewStatus: string) {
  if (reviewStatus !== "APPROVED") {
    throw new LearningAssignmentServiceError("lesson_not_approved");
  }
}

export function assertIdempotencyReuse(
  existingAssignment: ExistingAssignmentForIdempotency | null,
  requestFingerprint: string,
): "create" | "reuse" {
  if (!existingAssignment) return "create";
  if (existingAssignment.requestFingerprint !== requestFingerprint) {
    throw new LearningAssignmentServiceError("idempotency_key_reuse");
  }
  return "reuse";
}

export function isPristineStudentLessonProgress(progress: ExistingProgressForAssignment) {
  return (
    progress.status === "NOT_STARTED" &&
    progress.guidedResponses == null &&
    progress.independentResponses == null &&
    progress.exitTicketResponses == null &&
    progress.masteryScore == null
  );
}

export function assertNoLegacyProgressConflicts(params: {
  studentProfileIds: string[];
  profileToUserId: Map<string, string>;
  existingProgressByUserId: Map<string, ExistingProgressForAssignment>;
  canonicalRecipientProfileIds: Set<string>;
}) {
  for (const studentProfileId of params.studentProfileIds) {
    if (params.canonicalRecipientProfileIds.has(studentProfileId)) continue;
    const userId = params.profileToUserId.get(studentProfileId);
    if (!userId) throw new LearningAssignmentServiceError("missing_student_profile", `missing_student_profile:${studentProfileId}`);
    const progress = params.existingProgressByUserId.get(userId);
    if (progress && !isPristineStudentLessonProgress(progress)) {
      throw new LearningAssignmentServiceError("legacy_progress_conflict", `legacy_progress_conflict:${studentProfileId}`);
    }
  }
}

export function planOpenCycle(params: {
  studentProfileIds: string[];
  openRecipients: OpenRecipientForAssignment[];
}): { action: "create" } | { action: "reuse"; assignmentId: string } {
  if (params.studentProfileIds.length === 0) throw new LearningAssignmentServiceError("empty_recipient_set");
  if (params.openRecipients.length === 0) return { action: "create" };

  const requested = new Set(params.studentProfileIds);
  const openProfileIds = new Set(params.openRecipients.map((recipient) => recipient.studentProfileId));
  const assignmentIds = new Set(params.openRecipients.map((recipient) => recipient.assignmentId));

  if (
    openProfileIds.size === requested.size &&
    params.openRecipients.every((recipient) => requested.has(recipient.studentProfileId)) &&
    assignmentIds.size === 1
  ) {
    return { action: "reuse", assignmentId: params.openRecipients[0].assignmentId };
  }

  throw new LearningAssignmentServiceError("cycle_conflict");
}

export function openLessonStudentKey(lessonId: string, studentProfileId: string) {
  return `${lessonId}:${studentProfileId}`;
}

export function buildLessonAssignmentRequestFingerprint(params: {
  lessonId: string;
  studentProfileIds: string[];
  dueDate: Date | null | undefined;
}) {
  return sha256([
    "lesson_assignment_request",
    params.lessonId,
    params.studentProfileIds.slice().sort().join(","),
    params.dueDate ? params.dueDate.toISOString() : "no_due_date",
  ].join("|"));
}

export function buildReportRecommendationIdempotencyKey(params: {
  classRoomId: string;
  formId: string;
  benchmarkSeason?: string;
  groupId: string;
  lessonId: string;
  studentProfileIds: string[];
  dueDate: Date;
}) {
  return sha256([
    "report_recommendation",
    params.classRoomId,
    params.formId,
    params.benchmarkSeason ?? "unknown",
    params.groupId,
    params.lessonId,
    params.studentProfileIds.slice().sort().join(","),
    params.dueDate.toISOString(),
  ].join("|"));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
