import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import {
  assertNoBannedTeacherAssignmentKeys,
  buildTeacherAssignmentDto,
} from "../../lib/teacher/teacherAssignmentsLoaderCore";

const root = process.cwd();
const dto = buildTeacherAssignmentDto({
  id: "assignment-1",
  title: "Inference Lesson",
  gradeLevel: 3,
  audienceLabel: "Grade 3 · 2 students",
  dueDate: new Date("2026-09-01T12:00:00.000Z"),
  status: "ASSIGNED",
  assignmentType: "LESSON",
  recipients: [
    {
      id: "recipient-1",
      status: "COMPLETED",
      studentProfile: { user: { name: "Ava Carter", email: "ava@example.com" } },
      gradeRecord: { status: "FINALIZED", pointsEarned: new Prisma.Decimal("8.00"), pointsPossible: new Prisma.Decimal("10.00") },
    },
    {
      id: "recipient-2",
      status: "SUBMITTED",
      studentProfile: { user: { name: "Marcus Rivera", email: "marcus@example.com" } },
      gradeRecord: { status: "PROVISIONAL", pointsEarned: new Prisma.Decimal("5.00"), pointsPossible: new Prisma.Decimal("10.00") },
    },
    {
      id: "recipient-3",
      status: "COMPLETED",
      studentProfile: { user: { name: null, email: "student@example.com" } },
      gradeRecord: { status: "FINALIZED", pointsEarned: new Prisma.Decimal("0.00"), pointsPossible: new Prisma.Decimal("0.00") },
    },
  ],
});
assert.deepEqual(Object.keys(dto).sort(), [
  "assignmentType",
  "audienceLabel",
  "averagePercent",
  "completedCount",
  "dueDate",
  "gradeLevel",
  "id",
  "recipientTotal",
  "status",
  "students",
  "title",
].sort(), "teacher assignment DTO must stay allow-listed");
assert.equal(dto.recipientTotal, 3);
assert.equal(dto.completedCount, 2);
assert.equal(dto.averagePercent, 80, "averagePercent excludes provisional and zero-possible records");
assert.equal(dto.students[0]?.finalized?.percent, 80);
assert.equal(dto.students[1]?.finalized, null, "non-finalized records must hide scores");
assert.equal(dto.students[2]?.finalized, null, "zero-pointsPossible records must hide scores");
assert.doesNotThrow(() => assertNoBannedTeacherAssignmentKeys({ assignments: [dto] }));
assert.throws(() => assertNoBannedTeacherAssignmentKeys({ completionKey: "secret" }), /banned key completionKey/);

const page = read("app/teacher/page.tsx");
assert.match(page, /activeTab === "assignments"[\s\S]*<TeacherAssignmentsTab \/>/, "Assignments tab must render TeacherAssignmentsTab");
assert.match(page, /activeTab === "reports"[\s\S]*<TeacherPssaInsightsClient \/>/, "Reports tab must stay intact");
assert.match(page, /activeTab === "lessons"[\s\S]*<TeacherLessonsTab \/>/, "Lessons tab must stay intact");

const canonicalRoute = read("app/api/teacher/assignments/canonical/route.ts");
assert.match(canonicalRoute, /requireUser\(\["TEACHER"\]\)/, "canonical read must be teacher-only");
assert.match(canonicalRoute, /loadTeacherAssignmentsForUser\(auth\.user\.id\)/, "canonical read must derive teacher from session");
assert.match(canonicalRoute, /Cache-Control": "no-store"/, "canonical read must be no-store");

const manualRoute = read("app/api/teacher/assignments/manual/route.ts");
assert.match(manualRoute, /requireUser\(\["TEACHER"\]\)/, "manual assign must be teacher-only");
assert.match(manualRoute, /where:\s*\{\s*id: body\.classRoomId,\s*teacherId: teacher\.id\s*\}/, "manual assign must verify class ownership");
assert.match(manualRoute, /recipientMode === "class"[\s\S]*rosterIds/, "class mode must use server roster");
assert.match(manualRoute, /studentProfileIds must be enrolled in class/, "selected mode must reject non-enrolled recipients");
assert.match(manualRoute, /buildLessonAssignmentRequestFingerprint/, "manual assign must compute deterministic request fingerprint");
assert.match(manualRoute, /idempotencyKey: body\.idempotencyKey/, "manual assign must use client UUID idempotency key");
assert.match(manualRoute, /origin: "MANUAL"/, "manual assign must stamp MANUAL origin");
assert.match(manualRoute, /deriveLessonVisibility/, "manual assign must reuse PR1 visibility gate");
assert.match(manualRoute, /visibility\.visible && visibility\.placement === "state_track"/, "manual assign must require State Track visible lessons");
assert.match(manualRoute, /idempotency_key_reuse[\s\S]*400/, "idempotency reuse mismatch must map to 400");
assert.match(manualRoute, /LearningAssignmentServiceError[\s\S]*409/, "service conflicts must map to 409");

const archiveRoute = read("app/api/teacher/assignments/canonical/[assignmentId]/archive/route.ts");
assert.match(archiveRoute, /status !== "CLOSED"[\s\S]*assignment_active[\s\S]*409/, "archive must reject active assignments");
assert.match(archiveRoute, /status === "ARCHIVED"[\s\S]*ok: true/, "archive must be idempotent for archived assignments");
assert.doesNotMatch(archiveRoute, /export async function DELETE/, "canonical assignment history must not expose delete");

const classesRoute = read("app/api/teacher/classes/route.ts");
assert.match(classesRoute, /export async function DELETE/, "class route keeps delete endpoint with history guard");
assert.match(classesRoute, /learningAssignment\.count/, "class delete must precheck canonical grade history");
assert.match(classesRoute, /class_has_grade_history[\s\S]*409/, "class delete must return class_has_grade_history");
assert.match(classesRoute, /P2003[\s\S]*class_has_grade_history/, "class delete must translate racing FK failures");

const legacyRoute = read("app/api/teacher/assignments/route.ts");
assert.match(legacyRoute, /tx\.assessment\.create/, "legacy assignment route must remain legacy Assessment create path");
assert.doesNotMatch(legacyRoute, /LearningAssignment|createLessonAssignment|teacherAssignmentsLoader/, "PR2C must not overwrite legacy assignment route");

const lessonsTab = read("components/teacher/TeacherLessonsTab.tsx");
assert.match(lessonsTab, /Assign lesson/, "Lessons tab must expose Assign lesson");
assert.match(lessonsTab, /crypto\.randomUUID\(\)/, "client must generate idempotency UUID");
assert.match(lessonsTab, /fetch\("\/api\/teacher\/assignments\/manual"[\s\S]*method:\s*"POST"/, "Lessons tab must post only to manual canonical assign route");
assert.match(lessonsTab, /\/api\/teacher\/assignments\/manual/, "Lessons tab must load server-derived class roster");

const schema = read("prisma/schema.prisma");
assert.doesNotMatch(schema, /teacher_assignments_tab_v2/, "PR2C must not change schema");

const pr2aService = read("lib/assignments/learningAssignmentService.ts");
assert.doesNotMatch(pr2aService, /teacherAssignmentsLoader|manual\/route|archive\/route/, "PR2A create path must remain untouched");

const pr2bFunnel = [
  "lib/assignments/finalizeLessonAttempt.ts",
  "lib/assignments/recipientSync.ts",
  "lib/assignments/studentAssignmentDto.ts",
].map(read).join("\n");
assert.doesNotMatch(pr2bFunnel, /TeacherAssignmentsTab|manual\/route|canonical\/route/, "PR2B funnel must remain untouched");

console.log("teacher Assignments PR2C checks passed");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
