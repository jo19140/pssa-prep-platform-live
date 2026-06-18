import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { handleTeacherDashboardRequest } from "../../lib/teacherDashboardRouteHandler";

const root = process.cwd();
const teacherSession = { user: { id: "teacher-user-1", role: "TEACHER" } };

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await testUnauthenticated();
  await testWrongRole();
  await testMissingTeacherProfile();
  await testStructuredFailure();
  await testNullableRelations();
  testClientDegradedState();

  console.log("teacher dashboard 500 hardening checks passed");
}

async function testUnauthenticated() {
  const response = await call({ getSession: async () => null });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
}

async function testWrongRole() {
  const response = await call({ getSession: async () => ({ user: { id: "student-1", role: "STUDENT" } }) });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
}

async function testMissingTeacherProfile() {
  const response = await call({
    database: dbWith({ teacherProfile: { findUnique: async () => null } }),
  });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Teacher profile not found" });
}

async function testStructuredFailure() {
  const logs: Array<{ message: string; meta: Record<string, unknown> }> = [];
  const response = await call({
    requestIdFactory: () => "req-fixed-1",
    logger: (message, meta) => logs.push({ message, meta }),
    database: dbWith({
      teacherProfile: { findUnique: async () => teacherFixture() },
      testSession: { findMany: async () => { throw new Error("database exploded"); } },
    }),
  });
  assert.equal(response.status, 500);
  assert.match(response.headers.get("Cache-Control") || "", /no-store/);
  assert.deepEqual(await response.json(), { error: "teacher_dashboard_build_failed", requestId: "req-fixed-1" });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].message, "teacher_dashboard_build_failed");
  assert.equal(logs[0].meta.requestId, "req-fixed-1");
  assert.equal(logs[0].meta.userId, "teacher-user-1");
  assert.equal(logs[0].meta.classId, null);
  assert.equal(logs[0].meta.stage, "sessions");
  assert.equal(logs[0].meta.message, "database exploded");
  assert.match(String(logs[0].meta.stack), /database exploded/);
}

async function testNullableRelations() {
  const response = await call({
    database: dbWith({
      teacherProfile: { findUnique: async () => teacherFixture() },
      testSession: { findMany: async () => [] },
      assignment: { findMany: async () => [] },
      studentLessonProgress: {
        findMany: async () => [
          {
            userId: "student-user-1",
            user: null,
            lesson: null,
            startedAt: null,
            updatedAt: new Date("2026-06-18T12:00:00.000Z"),
            masteryScore: null,
          },
        ],
      },
    }),
  });
  assert.equal(response.status, 200);
  const json = await response.json();
  const stuck = json.actionInsights.stuck.students[0];
  assert.equal(stuck.studentName, "Student");
  assert.equal(stuck.activityTitle, "Lesson");
  assert.equal(json.overview.studentCount, 1);
}

function testClientDegradedState() {
  const page = read("components/TeacherDashboardPage.tsx");
  assert.match(page, /Some dashboard data could not be loaded\. Please try again\./);
  assert.match(page, />\s*Retry\s*</);
  assert.match(page, /href="\/teacher\?tab=reports"/);
  assert.doesNotMatch(page, /0 students|0 results/i);
}

async function call(options: Parameters<typeof handleTeacherDashboardRequest>[1] = {}) {
  return handleTeacherDashboardRequest(new Request("http://localhost/api/teacher/dashboard"), {
    getSession: async () => teacherSession,
    requestIdFactory: () => "req-default",
    logger: () => undefined,
    database: dbWith(),
    ...options,
  });
}

function dbWith(overrides: Record<string, unknown> = {}) {
  return {
    teacherProfile: { findUnique: async () => teacherFixture() },
    testSession: { findMany: async () => [] },
    assignment: { findMany: async () => [] },
    studentLessonProgress: { findMany: async () => [] },
    ...overrides,
  };
}

function teacherFixture() {
  return {
    id: "teacher-profile-1",
    userId: "teacher-user-1",
    schoolId: null,
    schoolName: "Demo School",
    gradeBand: "3-8",
    school: null,
    classes: [
      {
        id: "class-1",
        name: "Intervention Group",
        grade: 5,
        schoolId: null,
        school: null,
        enrollments: [
          {
            studentProfile: {
              id: "student-profile-1",
              userId: "student-user-1",
              grade: 5,
              user: { id: "student-user-1", name: "Ava Carter" },
            },
          },
        ],
      },
    ],
  };
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
