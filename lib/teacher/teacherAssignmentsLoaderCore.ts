import type { Prisma } from "@prisma/client";

export const TEACHER_ASSIGNMENT_BANNED_KEYS = [
  "completionKey",
  "responseSnapshotJson",
  "scoringSnapshotJson",
  "sourceProgressId",
  "openLessonStudentKey",
  "idempotencyKey",
  "requestFingerprint",
  "originContextJson",
  "selectedAttemptId",
  "gradeRecordId",
] as const;

export type TeacherAssignmentRow = {
  id: string;
  title: string;
  gradeLevel: number;
  audienceLabel: string | null;
  dueDate: Date | null;
  status: "DRAFT" | "ASSIGNED" | "CLOSED" | "ARCHIVED";
  assignmentType: "LESSON" | "DIAGNOSTIC_WRITING" | "CUSTOM";
  recipients: Array<{
    id: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED";
    studentProfile: { user: { name: string | null; email: string | null } };
    gradeRecord: {
      status: "UNGRADED" | "PROVISIONAL" | "FINALIZED" | "NON_SCORABLE";
      pointsEarned: Prisma.Decimal | number | string | null;
      pointsPossible: Prisma.Decimal | number | string | null;
    } | null;
  }>;
};

export function buildTeacherAssignmentDto(row: TeacherAssignmentRow) {
  const finalizedRecords = row.recipients
    .map((recipient) => recipient.gradeRecord)
    .filter((record) => record?.status === "FINALIZED")
    .map((record) => ({
      pointsEarned: decimalToNumber(record?.pointsEarned),
      pointsPossible: decimalToNumber(record?.pointsPossible),
    }))
    .filter((record) => record.pointsEarned != null && record.pointsPossible != null && record.pointsPossible > 0);
  const pointsEarned = finalizedRecords.reduce((sum, record) => sum + (record.pointsEarned ?? 0), 0);
  const pointsPossible = finalizedRecords.reduce((sum, record) => sum + (record.pointsPossible ?? 0), 0);
  const averagePercent = pointsPossible > 0 ? Math.round((100 * pointsEarned) / pointsPossible) : null;

  return {
    id: row.id,
    title: row.title,
    gradeLevel: row.gradeLevel,
    audienceLabel: row.audienceLabel,
    dueDate: row.dueDate,
    status: row.status,
    assignmentType: row.assignmentType,
    recipientTotal: row.recipients.length,
    completedCount: row.recipients.filter((recipient) => recipient.status === "COMPLETED").length,
    averagePercent,
    students: row.recipients.map((recipient) => {
      const finalized = recipient.gradeRecord?.status === "FINALIZED";
      const earned = finalized ? decimalToNumber(recipient.gradeRecord?.pointsEarned) : null;
      const possible = finalized ? decimalToNumber(recipient.gradeRecord?.pointsPossible) : null;
      return {
        studentName: recipient.studentProfile.user.name || recipient.studentProfile.user.email || "Student",
        recipientStatus: recipient.status,
        finalized: finalized && earned != null && possible != null && possible > 0
          ? { pointsEarned: earned, pointsPossible: possible, percent: Math.round((100 * earned) / possible) }
          : null,
      };
    }),
  };
}

export function assertNoBannedTeacherAssignmentKeys(value: unknown) {
  const seen = new Set<unknown>();
  const visit = (node: unknown, path: string) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if ((TEACHER_ASSIGNMENT_BANNED_KEYS as readonly string[]).includes(key)) {
        throw new Error(`banned key ${key} at ${path}`);
      }
      visit(child, `${path}.${key}`);
    }
  };
  visit(value, "$");
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}
