import type { Prisma } from "@prisma/client";

export const STUDENT_ASSIGNMENT_BANNED_KEYS = [
  "responseSnapshotJson",
  "scoringSnapshotJson",
  "completionKey",
  "sourceProgressId",
  "pssaFormResponseId",
  "requestFingerprint",
  "idempotencyKey",
  "originContextJson",
  "openLessonStudentKey",
  "selectedAttemptId",
  "gradeRecordId",
] as const;

export type CanonicalStudentAssignmentRow = {
  id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED";
  createdAt: Date;
  startedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  assignment: {
    id: string;
    title: string;
    assignmentType: "LESSON" | "DIAGNOSTIC_WRITING" | "CUSTOM";
    gradeLevel: number;
    dueDate: Date | null;
    lessonId: string | null;
    createdAt: Date;
  };
  gradeRecord: {
    status: "UNGRADED" | "PROVISIONAL" | "FINALIZED" | "NON_SCORABLE";
    pointsEarned: Prisma.Decimal | number | string | null;
    pointsPossible: Prisma.Decimal | number | string | null;
    finalizedAt: Date | null;
  } | null;
};

export type LegacyLessonProgressRow = {
  id: string;
  lessonId: string;
  status: string;
  dueDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  masteredAt: Date | null;
  masteryScore: number | null;
  lesson: {
    id: string;
    title: string;
    gradeLevel: number;
  };
};

export function canonicalAssignmentDto(row: CanonicalStudentAssignmentRow) {
  const finalized = row.gradeRecord?.status === "FINALIZED";
  return {
    assignmentId: row.id,
    canonicalAssignmentId: row.assignment.id,
    lessonId: row.assignment.lessonId,
    title: row.assignment.title,
    assignmentType: row.assignment.assignmentType,
    gradeLevel: row.assignment.gradeLevel,
    isCurrentGrade: true,
    statusLabel: statusLabel(row.status),
    assignedAt: row.assignment.createdAt,
    dueDate: row.assignment.dueDate,
    submittedAt: row.submittedAt ?? row.completedAt,
    completedAt: row.completedAt,
    scorePercent: null,
    earnedPoints: finalized ? decimalToNumber(row.gradeRecord?.pointsEarned) : null,
    totalPoints: finalized ? decimalToNumber(row.gradeRecord?.pointsPossible) : null,
    finalizedAt: finalized ? row.gradeRecord?.finalizedAt ?? null : null,
    sourceType: "Teacher Lesson",
  };
}

export function legacyLessonAssignmentDto(row: LegacyLessonProgressRow) {
  const completed = row.status === "COMPLETED" || row.status === "MASTERED";
  return {
    assignmentId: `legacy-lesson-${row.id}`,
    lessonId: row.lessonId,
    title: row.lesson.title,
    assignmentType: "LESSON",
    gradeLevel: row.lesson.gradeLevel,
    isCurrentGrade: true,
    statusLabel: completed ? "Completed" : row.status === "IN_PROGRESS" ? "In Progress" : "Not Started",
    assignedAt: row.createdAt,
    dueDate: row.dueDate,
    submittedAt: row.completedAt ?? row.masteredAt,
    completedAt: row.completedAt ?? row.masteredAt,
    scorePercent: completed ? row.masteryScore : null,
    earnedPoints: null,
    totalPoints: null,
    finalizedAt: null,
    sourceType: "Teacher Lesson",
  };
}

export function mergeCanonicalAndLegacyLessonAssignments(
  canonicalRows: CanonicalStudentAssignmentRow[],
  legacyRows: LegacyLessonProgressRow[],
) {
  const canonicalLessonIds = new Set(canonicalRows.map((row) => row.assignment.lessonId).filter(Boolean));
  return [
    ...canonicalRows.map(canonicalAssignmentDto),
    ...legacyRows
      .filter((row) => !canonicalLessonIds.has(row.lessonId))
      .map(legacyLessonAssignmentDto),
  ];
}

export function assertNoBannedStudentAssignmentKeys(value: unknown) {
  const seen = new Set<unknown>();
  const visit = (node: unknown, path: string) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if ((STUDENT_ASSIGNMENT_BANNED_KEYS as readonly string[]).includes(key)) {
        throw new Error(`banned key ${key} at ${path}`);
      }
      visit(child, `${path}.${key}`);
    }
  };
  visit(value, "$");
}

function statusLabel(status: CanonicalStudentAssignmentRow["status"]) {
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS" || status === "SUBMITTED") return "In Progress";
  return "Not Started";
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}
