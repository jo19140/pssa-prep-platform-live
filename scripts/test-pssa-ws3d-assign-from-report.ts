import assert from "node:assert/strict";
import fs from "node:fs";

import {
  assembleBridgeLessons,
  assertUniqueStudentProfileIds,
  isApprovedLearningLessonReviewStatus,
  parseSchoolDateUtcNoon,
  planAssignmentOutcomes,
  type BridgeLearningLessonRow,
  type BridgeLessonSeed,
} from "../lib/content/pssaAssignRecommendedLesson";

const seeds: BridgeLessonSeed[] = [
  {
    gradeLevel: 3,
    skill: "Inference",
    standardCode: "CC.1.2.3.B",
    standardCodes: ["CC.1.2.3.B", "CC.1.3.3.B"],
    pssaBridgeTags: ["key_ideas_evidence", "inference", "text_evidence"],
  },
  {
    gradeLevel: 3,
    skill: "Text Evidence",
    standardCode: "CC.1.2.3.B",
    standardCodes: ["CC.1.2.3.B"],
    pssaBridgeTags: ["key_ideas_evidence", "text_evidence"],
  },
  {
    gradeLevel: 4,
    skill: "Inference",
    standardCode: "CC.1.2.4.B",
  },
];

const dbLessons: BridgeLearningLessonRow[] = [
  { id: "lesson-inference", title: "Grade 3 Inference Lesson", skill: "Inference", gradeLevel: 3, standardCode: "CC.1.2.3.B", reviewStatus: "APPROVED" },
  { id: "lesson-evidence", title: "Grade 3 Text Evidence Lesson", skill: "Text Evidence", gradeLevel: 3, standardCode: "CC.1.2.3.B", reviewStatus: "APPROVED" },
  { id: "lesson-unmatched", title: "Grade 3 Unmatched Lesson", skill: "No Seed", gradeLevel: 3, standardCode: "CC.X", reviewStatus: "APPROVED" },
];

function testAssembleBridgeLessons() {
  const bridgeLessons = assembleBridgeLessons(dbLessons, seeds);
  assert.deepEqual(bridgeLessons.map((lesson) => lesson.lessonId), ["lesson-inference", "lesson-evidence"]);
  assert.deepEqual(bridgeLessons[0], {
    lessonId: "lesson-inference",
    title: "Grade 3 Inference Lesson",
    skill: "Inference",
    gradeLevel: 3,
    standardCode: "CC.1.2.3.B",
    standardCodes: ["CC.1.2.3.B", "CC.1.3.3.B"],
    pssaBridgeTags: ["key_ideas_evidence", "inference", "text_evidence"],
    reviewStatus: "APPROVED",
  });
  assert.throws(
    () => assembleBridgeLessons(dbLessons, [...seeds, { ...seeds[0] }]),
    /ambiguous_bridge_seed_grade_skill:3:Inference/,
  );
  assert.throws(
    () => assembleBridgeLessons([...dbLessons, { ...dbLessons[0], id: "duplicate" }], seeds),
    /ambiguous_bridge_dbLesson_grade_skill:3:Inference/,
  );
}

function testDateAndStudentPlanning() {
  const dueDate = parseSchoolDateUtcNoon("2026-10-10");
  assert.equal(dueDate?.toISOString(), "2026-10-10T12:00:00.000Z");
  assert.equal(parseSchoolDateUtcNoon("2026-02-31"), null);
  assert.equal(parseSchoolDateUtcNoon("10/10/2026"), null);
  assert.equal(assertUniqueStudentProfileIds(["sp1", "sp2"]), true);
  assert.equal(assertUniqueStudentProfileIds(["sp1", "sp1"]), false);

  const outcomes = planAssignmentOutcomes({
    requestedStudentProfileIds: ["sp1", "sp2"],
    profileToUserId: new Map([["sp1", "u1"], ["sp2", "u2"]]),
    existingProgressByUserId: new Map([["u2", {
      userId: "u2",
      status: "MASTERED",
      guidedResponses: { keep: true },
      independentResponses: { keep: true },
      exitTicketResponses: { keep: true },
      masteryScore: 100,
      masteryStatus: "MASTERED",
      completedAt: new Date("2026-01-01T00:00:00.000Z"),
      masteredAt: new Date("2026-01-02T00:00:00.000Z"),
    }]]),
  });
  assert.deepEqual(outcomes, [
    { studentProfileId: "sp1", userId: "u1", outcome: "created" },
    { studentProfileId: "sp2", userId: "u2", outcome: "updated" },
  ]);
  assert.throws(
    () => planAssignmentOutcomes({
      requestedStudentProfileIds: ["sp3"],
      profileToUserId: new Map(),
      existingProgressByUserId: new Map(),
    }),
    /missing_user_for_student_profile:sp3/,
  );
}

function testApprovalSemanticsAndSourceGuards() {
  assert.equal(isApprovedLearningLessonReviewStatus("APPROVED"), true);
  assert.equal(isApprovedLearningLessonReviewStatus("approved"), false);
  assert.equal(isApprovedLearningLessonReviewStatus("PENDING_REVIEW"), false);

  const routeSource = fs.readFileSync("app/api/teacher/pssa/assign-recommended-lesson/route.ts", "utf8");
  assert.equal(/class-report\/route/.test(routeSource), false, "assign route must not import class-report route handler");
  assert.match(routeSource, /loadPssaClassReportForTeacher/, "assign route must use shared report loader");
  assert.match(routeSource, /studentProfileIds must be enrolled in class and in the suggested group/, "membership gate must be explicit");
  assert.match(routeSource, /stale_or_invalid_lesson_candidate/, "lesson gate must be explicit");
  assert.match(routeSource, /createLessonAssignment/, "assign route must delegate writes to the canonical assignment service");
  assert.match(routeSource, /origin: "REPORT_RECOMMENDATION"/, "assign route must stamp report recommendation origin");
  assert.match(routeSource, /buildLessonAssignmentRequestFingerprint/, "assign route must compute request fingerprint");
  assert.match(routeSource, /buildReportRecommendationIdempotencyKey/, "assign route must compute idempotency key");
  assert.doesNotMatch(routeSource, /studentLessonProgress\.upsert|db\.\$transaction/, "assign route must not own assignment writes after PR2A");

  const loaderRoute = fs.readFileSync("app/api/teacher/pssa/class-report/route.ts", "utf8");
  assert.match(loaderRoute, /loadPssaClassReportForTeacher/, "class-report route must use shared loader");

  const migration = fs.readFileSync("prisma/migrations/20260617120000_add_student_lesson_progress_due_date/migration.sql", "utf8").trim();
  assert.equal(migration, 'ALTER TABLE "StudentLessonProgress" ADD COLUMN "dueDate" TIMESTAMP(3);');
}

testAssembleBridgeLessons();
testDateAndStudentPlanning();
testApprovalSemanticsAndSourceGuards();

console.log("PSSA WS3-D assign-from-report tests passed: bridge join, ambiguity stop, UTC-noon date, duplicate/profile planning, approval semantics, route/migration guards.");
