import assert from "node:assert/strict";
import fs from "node:fs";
import { Prisma } from "@prisma/client";

import {
  buildLessonCompletionKey,
  finalizeLessonAttempt,
  stableStringify,
} from "../../lib/assignments/finalizeLessonAttempt";
import {
  assertNoBannedStudentAssignmentKeys,
  mergeCanonicalAndLegacyLessonAssignments,
} from "../../lib/assignments/studentAssignmentDto";

const now = new Date("2026-09-01T12:00:00.000Z");

assert.equal(
  stableStringify({ b: 2, a: { d: 4, c: 3 } }),
  stableStringify({ a: { c: 3, d: 4 }, b: 2 }),
  "stable serializer must sort object keys deeply",
);
assert.equal(
  buildLessonCompletionKey("recipient-1", { answers: { "1": "B", "0": "A" } }),
  buildLessonCompletionKey("recipient-1", { answers: { "0": "A", "1": "B" } }),
  "completionKey must be stable for reordered answer keys",
);
assert.notEqual(
  buildLessonCompletionKey("recipient-1", { answers: { "0": "A" } }),
  buildLessonCompletionKey("recipient-1", { answers: { "0": "B" } }),
  "changed answer payload must produce a new completionKey",
);

void awaitMain().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function awaitMain() {
{
  const tx = fakeTx({ assignmentStatus: "ASSIGNED", remainingRecipients: 0 });
  const result = await finalizeLessonAttempt(tx as any, finalizeInput({
    scoreResult: {
      score: 80,
      answers: Array.from({ length: 10 }, (_, index) => ({ correct: index < 8 })),
    },
  }));
  assert.equal(result.finalized, true);
  assert.equal(result.finalized && result.idempotent, false);
  assert.equal(tx.createdAttempts.length, 1, "GradeAttempt must be inserted once");
  assert.equal(tx.createdAttempts[0].pointsEarned.toFixed(2), "8.00");
  assert.equal(tx.createdAttempts[0].pointsPossible.toFixed(2), "10.00");
  assert.equal(tx.createdAttempts[0].scoringSnapshotJson.scorePercent, 80, "percent stays in scoring snapshot");
  assert.deepEqual(tx.gradeRecordUpdates[0], {
    status: "FINALIZED",
    scoreSource: "AUTO",
    pointsEarned: tx.createdAttempts[0].pointsEarned,
    pointsPossible: tx.createdAttempts[0].pointsPossible,
    selectedAttemptId: "attempt-1",
    finalizedAt: now,
  });
  assert.equal(tx.recipientUpdates[0].openLessonStudentKey, null);
  assert.equal(tx.assignmentUpdates.length, 1, "ASSIGNED assignment auto-closes when all recipients complete");
}

{
  const existingAttempt = gradeAttempt({ id: "attempt-existing", completionKey: buildLessonCompletionKey("recipient-1", { "0": "A" }) });
  const tx = fakeTx({ existingAttempt });
  const result = await finalizeLessonAttempt(tx as any, finalizeInput({ responsePayload: { "0": "A" } }));
  assert.equal(result.finalized, true);
  assert.equal(result.finalized && result.idempotent, true);
  assert.equal(tx.createdAttempts.length, 0, "identical resubmit must not insert attempt #2");
  assert.equal(tx.gradeRecordUpdates.length, 0, "idempotent resubmit must not rewrite grade record");
}

{
  const tx = fakeTx();
  const result = await finalizeLessonAttempt(tx as any, finalizeInput({ scoreResult: { score: 0, answers: [] } }));
  assert.deepEqual(result, { finalized: false, reason: "empty_score" });
  assert.equal(tx.createdAttempts.length, 0, "empty score fail-closed must not insert 0/0 attempt");
}

{
  const tx = fakeTx({ createdAttemptGradeRecordId: "grade-record-other" });
  await assert.rejects(
    () => finalizeLessonAttempt(tx as any, finalizeInput()),
    /grade_attempt_record_mismatch/,
    "selected-attempt integrity must reject a cross-record attempt",
  );
  assert.equal(tx.gradeRecordUpdates.length, 0, "cross-record attempt must fail before finalizing grade record");
}

{
  const tx = fakeTx({ assignmentStatus: "ARCHIVED", remainingRecipients: 0 });
  await finalizeLessonAttempt(tx as any, finalizeInput());
  assert.equal(tx.assignmentUpdates.length, 0, "ARCHIVED assignment must never auto-close");
}

const canonicalFinalized = canonicalRecipient({ id: "recipient-a", lessonId: "lesson-1", pointsEarned: new Prisma.Decimal("8.00"), pointsPossible: new Prisma.Decimal("10.00") });
const canonicalProvisional = canonicalRecipient({ id: "recipient-b", lessonId: "lesson-2", status: "IN_PROGRESS", gradeStatus: "PROVISIONAL", pointsEarned: new Prisma.Decimal("5.00"), pointsPossible: new Prisma.Decimal("10.00") });
const canonicalReassign = canonicalRecipient({ id: "recipient-c", assignmentId: "assignment-c", lessonId: "lesson-1", pointsEarned: new Prisma.Decimal("7.00"), pointsPossible: new Prisma.Decimal("10.00") });
const merged = mergeCanonicalAndLegacyLessonAssignments(
  [canonicalFinalized, canonicalProvisional, canonicalReassign],
  [
    legacyProgress({ id: "progress-1", lessonId: "lesson-1" }),
    legacyProgress({ id: "progress-2", lessonId: "lesson-3" }),
  ],
);
assert.equal(merged.length, 4, "legacy SLP is suppressed only when a canonical recipient covers the same lesson");
assert.equal(merged.filter((row) => row.lessonId === "lesson-1").length, 2, "separate canonical reassignment cycles must both remain");
assert.equal(merged.find((row) => row.assignmentId === "recipient-a")?.earnedPoints, 8, "finalized grade record shows points");
assert.equal(merged.find((row) => row.assignmentId === "recipient-b")?.earnedPoints, null, "non-finalized grade record hides points");
assert.doesNotThrow(() => assertNoBannedStudentAssignmentKeys({ assignments: merged }));
assert.throws(() => assertNoBannedStudentAssignmentKeys({ responseSnapshotJson: {} }), /banned key responseSnapshotJson/);

const lessonProgressRoute = fs.readFileSync("app/api/student/lesson-progress/route.ts", "utf8");
assert.match(lessonProgressRoute, /db\.\$transaction/, "lesson-progress completion path must be transactional");
assert.match(lessonProgressRoute, /syncRecipientFromProgress/, "lesson-progress must sync recipient lifecycle");
assert.match(lessonProgressRoute, /finalizeLessonAttempt/, "lesson-progress must finalize canonical attempts");

const questAttemptRoute = fs.readFileSync("app/api/student/quest-attempt/route.ts", "utf8");
assert.match(questAttemptRoute, /syncRecipientFromProgress/, "quest-attempt must sync in-progress lifecycle");
assert.doesNotMatch(questAttemptRoute, /finalizeLessonAttempt/, "quest-attempt must not own completion funnel");

const teacherLessonsRoute = fs.readFileSync("app/api/teacher/learning-lessons/route.ts", "utf8");
assert.doesNotMatch(teacherLessonsRoute, /syncRecipientFromProgress|finalizeLessonAttempt/, "PR2B must not wire the PR1 teacher route");

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
assert.doesNotMatch(schema, /masteryResponses/, "PR2B must not add schema columns for mastery response snapshots");

const pr2aService = fs.readFileSync("lib/assignments/learningAssignmentService.ts", "utf8");
assert.doesNotMatch(pr2aService, /gradeAttempt\.create|gradeAttempt\.update|gradeAttempt\.delete|finalizeLessonAttempt/, "PR2A create path must remain attempt-free");

console.log("Learning assignment PR2B checks passed");
}

function finalizeInput(overrides: Partial<Parameters<typeof finalizeLessonAttempt>[1]> = {}): Parameters<typeof finalizeLessonAttempt>[1] {
  return {
    recipient: {
      id: "recipient-1",
      assignmentId: "assignment-1",
      studentProfileId: "student-profile-1",
      status: "COMPLETED",
      openLessonStudentKey: "lesson-1:student-profile-1",
      startedAt: null,
      submittedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      assignment: learningAssignment({ id: "assignment-1" }),
    },
    gradeRecord: gradeRecord({ id: "grade-record-1", recipientId: "recipient-1" }),
    progress: { id: "progress-1", completedAt: now, masteredAt: null },
    scoreResult: { score: 100, answers: [{ correct: true }] },
    masteryStatus: "MASTERED",
    responsePayload: { "0": "A" },
    now,
    ...overrides,
  } as Parameters<typeof finalizeLessonAttempt>[1];
}

function fakeTx(options: {
  existingAttempt?: ReturnType<typeof gradeAttempt> | null;
  createdAttemptGradeRecordId?: string;
  assignmentStatus?: "DRAFT" | "ASSIGNED" | "CLOSED" | "ARCHIVED";
  remainingRecipients?: number;
} = {}) {
  const state = {
    createdAttempts: [] as any[],
    gradeRecordUpdates: [] as any[],
    recipientUpdates: [] as any[],
    assignmentUpdates: [] as any[],
  };
  return {
    ...state,
    gradeAttempt: {
      findUnique: async () => options.existingAttempt ?? null,
      findFirst: async () => null,
      create: async ({ data }: any) => {
        const attempt = gradeAttempt({
          ...data,
          id: "attempt-1",
          gradeRecordId: options.createdAttemptGradeRecordId ?? data.gradeRecordId,
        });
        state.createdAttempts.push(attempt);
        return attempt;
      },
    },
    gradeRecord: {
      update: async ({ data }: any) => {
        state.gradeRecordUpdates.push(data);
        return data;
      },
    },
    learningAssignment: {
      findUnique: async () => ({ status: options.assignmentStatus ?? "ASSIGNED" }),
      update: async ({ data }: any) => {
        state.assignmentUpdates.push(data);
        return data;
      },
    },
    assignmentRecipient: {
      update: async ({ data }: any) => {
        state.recipientUpdates.push(data);
        return data;
      },
      count: async () => options.remainingRecipients ?? 1,
    },
  };
}

function canonicalRecipient(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? "recipient-a",
    status: overrides.status ?? "COMPLETED" as const,
    createdAt: now,
    startedAt: now,
    submittedAt: now,
    completedAt: now,
    assignment: {
      id: overrides.assignmentId ?? "assignment-a",
      title: "Inference Lesson",
      assignmentType: "LESSON" as const,
      gradeLevel: 3,
      dueDate: null,
      lessonId: overrides.lessonId ?? "lesson-1",
      createdAt: now,
    },
    gradeRecord: {
      status: overrides.gradeStatus ?? "FINALIZED" as const,
      pointsEarned: overrides.pointsEarned ?? new Prisma.Decimal("1.00"),
      pointsPossible: overrides.pointsPossible ?? new Prisma.Decimal("1.00"),
      finalizedAt: now,
    },
  } as any;
}

function legacyProgress(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? "progress-1",
    lessonId: overrides.lessonId ?? "lesson-1",
    status: "COMPLETED",
    dueDate: null,
    createdAt: now,
    completedAt: now,
    masteredAt: null,
    masteryScore: 90,
    lesson: {
      id: overrides.lessonId ?? "lesson-1",
      title: "Legacy Lesson",
      gradeLevel: 3,
    },
  } as any;
}

function learningAssignment(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? "assignment-1",
    title: "Lesson",
    assignmentType: "LESSON",
    origin: "MANUAL",
    status: "ASSIGNED",
    classRoomId: "class-1",
    assignedByUserId: "teacher-1",
    gradeLevel: 3,
    standards: [],
    rubricId: null,
    lessonId: "lesson-1",
    pssaFormId: null,
    dueDate: null,
    audienceLabel: null,
    originContextJson: null,
    reportFormId: null,
    reportGroupId: null,
    idempotencyKey: "idem",
    requestFingerprint: "fp",
    originKey: null,
    createdAt: now,
    ...overrides,
  };
}

function gradeRecord(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? "grade-record-1",
    recipientId: overrides.recipientId ?? "recipient-1",
    status: "UNGRADED",
    pointsEarned: null,
    pointsPossible: null,
    rubricId: null,
    scoreSource: null,
    gradeLevelAtAssignment: 3,
    selectedAttemptId: null,
    finalizedAt: null,
    finalizedByUserId: null,
    updatedAt: now,
    ...overrides,
  };
}

function gradeAttempt(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? "attempt-1",
    gradeRecordId: overrides.gradeRecordId ?? "grade-record-1",
    attemptNumber: overrides.attemptNumber ?? 1,
    completionKey: overrides.completionKey ?? "completion-key",
    snapshotVersion: overrides.snapshotVersion ?? "lesson-mastery-v1",
    submittedAt: overrides.submittedAt ?? now,
    completionState: overrides.completionState ?? "COMPLETED",
    pointsEarned: overrides.pointsEarned ?? new Prisma.Decimal("1.00"),
    pointsPossible: overrides.pointsPossible ?? new Prisma.Decimal("1.00"),
    rubricId: null,
    rubricVersion: null,
    scoringStatus: overrides.scoringStatus ?? "FINALIZED",
    responseSnapshotJson: overrides.responseSnapshotJson ?? null,
    scoringSnapshotJson: overrides.scoringSnapshotJson ?? null,
    sourceProgressId: overrides.sourceProgressId ?? null,
    pssaFormResponseId: null,
    createdAt: overrides.createdAt ?? now,
  };
}
