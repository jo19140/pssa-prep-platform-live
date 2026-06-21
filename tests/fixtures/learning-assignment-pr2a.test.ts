import assert from "node:assert/strict";
import fs from "node:fs";

import {
  assertApprovedLesson,
  assertIdempotencyReuse,
  assertNoLegacyProgressConflicts,
  buildLessonAssignmentRequestFingerprint,
  buildReportRecommendationIdempotencyKey,
  isPristineStudentLessonProgress,
  LearningAssignmentServiceError,
  openLessonStudentKey,
  planOpenCycle,
} from "../../lib/assignments/learningAssignmentServiceCore";

assert.doesNotThrow(() => assertApprovedLesson("APPROVED"));
assert.throws(() => assertApprovedLesson("PENDING_REVIEW"), errorWithCode("lesson_not_approved"));

assert.equal(assertIdempotencyReuse(null, "fp-a"), "create");
assert.equal(assertIdempotencyReuse({ id: "assignment-1", requestFingerprint: "fp-a" }, "fp-a"), "reuse");
assert.throws(
  () => assertIdempotencyReuse({ id: "assignment-1", requestFingerprint: "fp-a" }, "fp-b"),
  errorWithCode("idempotency_key_reuse"),
);

assert.equal(isPristineStudentLessonProgress({
  userId: "u1",
  status: "NOT_STARTED",
  guidedResponses: null,
  independentResponses: null,
  exitTicketResponses: null,
  masteryScore: null,
}), true);
assert.equal(isPristineStudentLessonProgress({
  userId: "u1",
  status: "IN_PROGRESS",
  guidedResponses: null,
  independentResponses: null,
  exitTicketResponses: null,
  masteryScore: null,
}), false);
assert.equal(isPristineStudentLessonProgress({
  userId: "u1",
  status: "NOT_STARTED",
  guidedResponses: { answer: "A" },
  independentResponses: null,
  exitTicketResponses: null,
  masteryScore: null,
}), false);
assert.equal(isPristineStudentLessonProgress({
  userId: "u1",
  status: "NOT_STARTED",
  guidedResponses: null,
  independentResponses: null,
  exitTicketResponses: null,
  masteryScore: 100,
}), false);

const profileToUserId = new Map([["sp1", "u1"], ["sp2", "u2"]]);
assert.doesNotThrow(() => assertNoLegacyProgressConflicts({
  studentProfileIds: ["sp1"],
  profileToUserId,
  existingProgressByUserId: new Map([["u1", {
    userId: "u1",
    status: "NOT_STARTED",
    guidedResponses: null,
    independentResponses: null,
    exitTicketResponses: null,
    masteryScore: null,
  }]]),
  canonicalRecipientProfileIds: new Set(),
}));
assert.throws(() => assertNoLegacyProgressConflicts({
  studentProfileIds: ["sp1"],
  profileToUserId,
  existingProgressByUserId: new Map([["u1", {
    userId: "u1",
    status: "COMPLETED",
    guidedResponses: { done: true },
    independentResponses: null,
    exitTicketResponses: null,
    masteryScore: 85,
  }]]),
  canonicalRecipientProfileIds: new Set(),
}), errorWithCode("legacy_progress_conflict"));
assert.doesNotThrow(() => assertNoLegacyProgressConflicts({
  studentProfileIds: ["sp1"],
  profileToUserId,
  existingProgressByUserId: new Map([["u1", {
    userId: "u1",
    status: "COMPLETED",
    guidedResponses: { done: true },
    independentResponses: null,
    exitTicketResponses: null,
    masteryScore: 85,
  }]]),
  canonicalRecipientProfileIds: new Set(["sp1"]),
}));

assert.deepEqual(planOpenCycle({ studentProfileIds: ["sp1", "sp2"], openRecipients: [] }), { action: "create" });
assert.deepEqual(planOpenCycle({
  studentProfileIds: ["sp1", "sp2"],
  openRecipients: [
    { assignmentId: "a1", studentProfileId: "sp1" },
    { assignmentId: "a1", studentProfileId: "sp2" },
  ],
}), { action: "reuse", assignmentId: "a1" });
assert.throws(() => planOpenCycle({
  studentProfileIds: ["sp1", "sp2"],
  openRecipients: [{ assignmentId: "a1", studentProfileId: "sp1" }],
}), errorWithCode("cycle_conflict"));
assert.throws(() => planOpenCycle({
  studentProfileIds: ["sp1", "sp2"],
  openRecipients: [
    { assignmentId: "a1", studentProfileId: "sp1" },
    { assignmentId: "a2", studentProfileId: "sp2" },
  ],
}), errorWithCode("cycle_conflict"));

assert.equal(openLessonStudentKey("lesson-1", "sp1"), "lesson-1:sp1");
assert.equal(
  buildLessonAssignmentRequestFingerprint({
    lessonId: "lesson-1",
    studentProfileIds: ["sp2", "sp1"],
    dueDate: new Date("2026-09-01T12:00:00.000Z"),
  }),
  buildLessonAssignmentRequestFingerprint({
    lessonId: "lesson-1",
    studentProfileIds: ["sp1", "sp2"],
    dueDate: new Date("2026-09-01T12:00:00.000Z"),
  }),
  "request fingerprint should sort student profile ids",
);
assert.notEqual(
  buildReportRecommendationIdempotencyKey({
    classRoomId: "class-1",
    formId: "form-1",
    groupId: "group-1",
    lessonId: "lesson-1",
    studentProfileIds: ["sp1"],
    dueDate: new Date("2026-09-01T12:00:00.000Z"),
  }),
  buildReportRecommendationIdempotencyKey({
    classRoomId: "class-1",
    formId: "form-1",
    groupId: "group-1",
    lessonId: "lesson-1",
    studentProfileIds: ["sp1"],
    dueDate: new Date("2026-09-08T12:00:00.000Z"),
  }),
  "new button/API actions with different due dates should get different idempotency keys",
);

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
assert.match(schema, /model LearningAssignment[\s\S]*@@unique\(\[assignedByUserId, idempotencyKey\]\)/, "LearningAssignment must use idempotency uniqueness only");
assert.match(schema, /@@index\(\[origin, originKey\]\)/, "originKey must be indexed provenance");
assert.doesNotMatch(schema, /@@unique\(\[origin, originKey\]\)/, "originKey must not be unique");
assert.match(schema, /openLessonStudentKey String\?\s+@unique/, "open lesson cycle key must be unique while open");
assert.match(schema, /model GradeAttempt[\s\S]*completionKey\s+String\s+@unique/, "GradeAttempt completion key must exist for PR2B");
assert.match(schema, /model Assignment \{[\s\S]*assignmentType String[\s\S]*\}/, "legacy Assignment model must remain present");
assert.doesNotMatch(extractModel(schema, "StudentLessonProgress"), /assignmentId|recipientId|gradeRecordId/, "StudentLessonProgress must not gain canonical gradebook columns");

const migration = fs.readFileSync("prisma/migrations/20260621141000_add_learning_assignment_gradebook/migration.sql", "utf8");
assert.doesNotMatch(migration, /ALTER TABLE "StudentLessonProgress"/, "migration must not alter StudentLessonProgress");
assert.doesNotMatch(migration, /ALTER TABLE "Assignment"/, "migration must not alter legacy Assignment");
assert.match(migration, /ON DELETE RESTRICT/g, "gradebook history relations must use Restrict");
assert.match(migration, /ON DELETE SET NULL/, "lesson relation may SetNull when a lesson is removed");

const service = fs.readFileSync("lib/assignments/learningAssignmentService.ts", "utf8");
assert.match(service, /TransactionIsolationLevel\.Serializable/, "service writes must use serializable transactions");
assert.match(service, /P2034/, "service must retry serialization failures");
assert.match(service, /P2002/, "service must retry unique conflicts from concurrent creates");
assert.match(service, /gradeRecord:\s*\{[\s\S]*create:/, "service must create one GradeRecord per recipient");
assert.match(service, /studentLessonProgress\.upsert/, "service must preserve legacy StudentLessonProgress create/update path");
assert.doesNotMatch(service, /gradeAttempt\.create|gradeAttempt\.upsert|GradeAttempt/, "PR2A service must not create GradeAttempt records");

const route = fs.readFileSync("app/api/teacher/pssa/assign-recommended-lesson/route.ts", "utf8");
assert.match(route, /createLessonAssignment/, "Reports assign route must delegate writes to canonical service");
assert.match(route, /origin: "REPORT_RECOMMENDATION"/, "Reports assign route must stamp report origin");
assert.match(route, /buildLessonAssignmentRequestFingerprint/, "Reports assign route must compute request fingerprint");
assert.match(route, /buildReportRecommendationIdempotencyKey/, "Reports assign route must compute idempotency key");
assert.match(route, /studentProfileIds must be enrolled in class and in the suggested group/, "membership gate must remain explicit");
assert.match(route, /stale_or_invalid_lesson_candidate/, "lesson gate must remain explicit");
assert.doesNotMatch(route, /studentLessonProgress\.upsert|db\.\$transaction/, "Reports route must not own assignment writes after PR2A");

console.log("Learning assignment PR2A checks passed");

function errorWithCode(code: string) {
  return (error: unknown) => error instanceof LearningAssignmentServiceError && error.code === code;
}

function extractModel(schemaSource: string, modelName: string) {
  const match = schemaSource.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${modelName} should exist`);
  return match[0];
}
