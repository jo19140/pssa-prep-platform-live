import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { PSSA_STUDENT_DTO_BANNED_KEYS, assertNoBannedKeys } from "@/lib/content/pssaStudentDto";
import {
  answerPssaSessionItem,
  getPssaSessionItem,
  getPssaSessionState,
  launchPssaFormSession,
  pssaRouteJson,
  requirePssaPostGuards,
  submitPssaSession,
  validateAnswerBody,
  type PssaRouteUser,
} from "@/lib/content/pssaFormSession";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

const student: PssaRouteUser = { id: "student_1", role: "STUDENT" };
const otherStudent: PssaRouteUser = { id: "student_2", role: "STUDENT" };
const admin: PssaRouteUser = { id: "admin_1", role: "ADMIN" };
const teacher: PssaRouteUser = { id: "teacher_1", role: "TEACHER" };
const outsiderTeacher: PssaRouteUser = { id: "teacher_2", role: "TEACHER" };

function readyPassage(id: string) {
  return {
    id,
    contentHash: `hash_${id}`,
    approvedContentHash: `hash_${id}`,
    latestAuditContentHash: `hash_${id}`,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    retiredAt: null,
  };
}

function readyItem(id: string, interactionType: string, responseSpecJson: any, correctResponseJson: any, scoringJson: any, pointValue: number, passage = readyPassage("passage_1")) {
  const contentHash = `hash_${id}`;
  return {
    id,
    itemId: id,
    gradeLevel: 3,
    subject: "ELA",
    interactionType,
    interactionSubtype: "fixture",
    pointValue,
    responseSpecJson,
    correctResponseJson,
    scoringJson,
    contentHash,
    approvedContentHash: contentHash,
    latestAuditContentHash: contentHash,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvalEligible: true,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    batchId: `batch_${interactionType}`,
    batch: {
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: "corpus",
      batchAuditResult: "PASS",
    },
    passages: [{ passage, sortOrder: 0 }],
  };
}

const passage = readyPassage("passage_1");
const itemFixtures = [
  readyItem("mcq_1", "MCQ", { prompt: "Pick A.", choices: [{ text: "A" }, { text: "B" }] }, { correctIndex: 0 }, { totalPoints: 1 }, 1, passage),
  readyItem("ebsr_1", "EBSR", { partA: { prompt: "A?", choices: [{ text: "A" }, { text: "B" }] }, partB: { instruction: "B?", choices: [{ text: "E1" }, { text: "E2" }] } }, { partA: { correctIndex: 0 }, partB: { correctIndices: [0] } }, { totalPoints: 2, partAPoints: 1, partBPoints: 1, requirePartACorrectForFullCredit: true }, 2, passage),
  readyItem("multi_1", "MULTI_SELECT", { stem: "Select.", instructionText: "Choose.", choices: [{ text: "A" }, { text: "B" }, { text: "C" }] }, { correctIndices: [0, 1] }, { totalPoints: 2 }, 2, passage),
  readyItem("hot_1", "HOT_TEXT", { prompt: "Select.", instructionText: "Tap.", selectableSpans: [{ spanId: "s1", text: "one" }, { spanId: "s2", text: "two" }] }, { correctSpanIds: ["s1"] }, { totalPoints: 1 }, 1, passage),
  readyItem("grid_1", "MATCHING_GRID", { stem: "Match.", instructionText: "Pick.", selectionRule: "one_per_row", rows: [{ rowId: "r1", label: "Row" }], columns: [{ columnId: "c1", label: "Col" }, { columnId: "c2", label: "No" }] }, { correctCells: [{ rowId: "r1", columnId: "c1" }] }, { totalPoints: 1 }, 1, passage),
  readyItem("drag_1", "DRAG_DROP", { prompt: "Drag.", instructionText: "Move.", tokens: [{ tokenId: "t1", text: "Token" }], targets: [{ targetId: "target_1", label: "Target" }], useAllTokens: true }, { correctAssignments: [{ tokenId: "t1", targetId: "target_1" }] }, { totalPoints: 1 }, 1, passage),
  readyItem("drop_1", "INLINE_DROPDOWN", { stem: "Fill.", instructionText: "Choose.", baseTextWithBlanks: "A ___", blanks: [{ blankId: "b1", position: 1, options: [{ text: "cat" }, { text: "dog" }] }] }, { blanks: [{ blankId: "b1", correctIndex: 0 }] }, { totalPoints: 1 }, 1, passage),
  readyItem("sa_1", "SHORT_ANSWER", { stem: "Explain.", instructionText: "Use text.", requiredSupportCount: 1, requiresTextSupport: true }, {}, { totalPoints: 3 }, 3, passage),
];

function makeForm(items = itemFixtures) {
  return {
    id: "form_1",
    formStatus: "assembled",
    contentHash: "form_hash",
    gradeLevel: 3,
    subject: "ELA",
    items: items.map((item, index) => ({
      id: `form_item_${index + 1}`,
      formId: "form_1",
      itemId: item.id,
      position: index + 1,
      pointValue: item.pointValue,
      approvedContentHashSnapshot: item.approvedContentHash,
      passageIdSnapshot: "passage_1",
      item,
    })),
    passages: [{
      id: "form_passage_1",
      passageId: "passage_1",
      position: 1,
      approvedPassageContentHashSnapshot: passage.approvedContentHash,
      passage,
    }],
  };
}

class FixtureDb {
  form = makeForm();
  sessions = new Map<string, any>();
  responses = new Map<string, any>();
  nextSession = 1;
  nextResponse = 1;
  teacherAllowed = true;
  uniqueRace = false;

  teacherProfile = {
    findUnique: async ({ where }: any) => where.userId === teacher.id ? { id: "teacher_profile_1" } : where.userId === outsiderTeacher.id ? { id: "teacher_profile_2" } : null,
  };
  studentProfile = {
    findUnique: async ({ where }: any) => where.userId === student.id ? { id: "student_profile_1", teacherId: this.teacherAllowed ? "teacher_profile_1" : null } : null,
  };
  enrollment = {
    findFirst: async () => null,
  };
  pssaForm = {
    findUnique: async ({ where }: any) => where.id === this.form.id ? this.form : null,
  };
  pssaItem = {
    findMany: async () => this.form.items.map((row: any) => row.item),
  };
  pssaFormSession = {
    findFirst: async ({ where }: any) => [...this.sessions.values()].find((session) => session.userId === where.userId && session.formId === where.formId && session.status === where.status) ?? null,
    findUnique: async ({ where }: any) => this.hydrateSession(this.sessions.get(where.id) ?? null),
    create: async ({ data }: any) => {
      if (this.uniqueRace) {
        this.sessions.set("session_race", { id: "session_race", startedAt: new Date("2026-01-01T00:00:00Z"), submittedAt: null, totalPoints: null, earnedPoints: null, pendingHumanPoints: null, invalidatedReason: null, ...data });
        const error: any = new Error("unique");
        error.code = "P2002";
        throw error;
      }
      const session = { id: `session_${this.nextSession++}`, startedAt: new Date("2026-01-01T00:00:00Z"), submittedAt: null, totalPoints: null, earnedPoints: null, pendingHumanPoints: null, invalidatedReason: null, ...data };
      this.sessions.set(session.id, session);
      return session;
    },
    update: async ({ where, data }: any) => {
      const session = this.sessions.get(where.id);
      Object.assign(session, data);
      this.sessions.set(where.id, session);
      return session;
    },
  };
  pssaFormResponse = {
    create: async ({ data }: any) => {
      const response = { id: `response_${this.nextResponse++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
      this.responses.set(response.id, response);
      return response;
    },
    update: async ({ where, data }: any) => {
      const response = this.responses.get(where.id);
      Object.assign(response, data, { updatedAt: new Date() });
      this.responses.set(where.id, response);
      return response;
    },
  };

  hydrateSession(session: any) {
    if (!session) return null;
    return {
      ...session,
      form: this.form,
      responses: [...this.responses.values()].filter((response) => response.sessionId === session.id).sort((a, b) => a.positionSnapshot - b.positionSnapshot),
    };
  }
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) value.forEach((child) => collectKeys(child, keys));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function assertLeakFree(value: unknown) {
  assertNoBannedKeys(value);
  for (const key of collectKeys(value)) {
    assert.equal(PSSA_STUDENT_DTO_BANNED_KEYS.includes(key as any), false, `banned key ${key}`);
    assert.equal(/correct/i.test(key), false, `correct-like key ${key}`);
  }
}

async function testLeakAndProjection() {
  const db = new FixtureDb();
  await launchPssaFormSession(db, { auth: admin, userId: student.id, formId: "form_1" });
  const sessionId = "session_1";
  for (let position = 1; position <= itemFixtures.length; position++) {
    const item = await getPssaSessionItem(db, { auth: student, sessionId, position });
    assertLeakFree(item);
  }
  const planted = structuredClone(itemFixtures[4]);
  planted.responseSpecJson.rows[0].correctColumnId = "secret";
  db.form = makeForm([planted]);
  const projected = await getPssaSessionItem(db, { auth: student, sessionId, position: 1 });
  assertLeakFree(projected);
}

async function testAuthzMatrix() {
  const db = new FixtureDb();
  await assert.rejects(() => launchPssaFormSession(db, { auth: student, userId: student.id, formId: "form_1" }), /student_launch_forbidden/);
  const adminLaunch = await launchPssaFormSession(db, { auth: admin, userId: student.id, formId: "form_1" });
  assert.equal(adminLaunch.sessionId, "session_1");
  await assert.rejects(() => getPssaSessionState(db, { auth: otherStudent, sessionId: "session_1" }), /session_owner_forbidden/);
  await assert.rejects(() => getPssaSessionState(db, { auth: admin, sessionId: "session_1" }), /session_owner_forbidden/);
  await assert.rejects(() => launchPssaFormSession(db, { auth: admin, userId: student.id, formId: "form_1" }), /active_session_exists/);

  const teacherDb = new FixtureDb();
  const teacherLaunch = await launchPssaFormSession(teacherDb, { auth: teacher, userId: student.id, formId: "form_1" });
  assert.equal(teacherLaunch.sessionId, "session_1");
  const blockedDb = new FixtureDb();
  blockedDb.teacherAllowed = false;
  await assert.rejects(() => launchPssaFormSession(blockedDb, { auth: teacher, userId: student.id, formId: "form_1" }), /teacher_student_launch_forbidden/);

  const raceDb = new FixtureDb();
  raceDb.uniqueRace = true;
  await assert.rejects(() => launchPssaFormSession(raceDb, { auth: admin, userId: student.id, formId: "form_1" }), /active_session_exists/);
}

async function testValidityMatrix() {
  const db = new FixtureDb();
  await launchPssaFormSession(db, { auth: admin, userId: student.id, formId: "form_1" });
  db.form.contentHash = "drift";
  await assert.rejects(() => getPssaSessionItem(db, { auth: student, sessionId: "session_1", position: 1 }), /session_invalidated/);
  assert.equal(db.sessions.get("session_1").status, "invalidated_midflight");

  const submittedDb = new FixtureDb();
  await launchPssaFormSession(submittedDb, { auth: admin, userId: student.id, formId: "form_1" });
  await answerPssaSessionItem(submittedDb, { auth: student, sessionId: "session_1", position: 1, responsePayload: { selectedIndex: 0 } });
  await submitPssaSession(submittedDb, { auth: student, sessionId: "session_1", allowIncomplete: true });
  submittedDb.form.contentHash = "post_submit_drift";
  const state = await getPssaSessionState(submittedDb, { auth: student, sessionId: "session_1" });
  assert.equal(state.status, "submitted");
  assert.equal(submittedDb.sessions.get("session_1").status, "submitted");
}

async function testAnswerLifecycleAndSubmitMath() {
  const db = new FixtureDb();
  db.form = makeForm([itemFixtures[0], itemFixtures[7]]);
  await launchPssaFormSession(db, { auth: admin, userId: student.id, formId: "form_1" });
  const first = await answerPssaSessionItem(db, { auth: student, sessionId: "session_1", position: 1, responsePayload: { selectedIndex: 1 } });
  assert.deepEqual(first, { position: 1, scoreStatus: "scored", isComplete: false });
  assert.equal([...db.responses.values()][0].pointsEarned, 0);
  const changed = await answerPssaSessionItem(db, { auth: student, sessionId: "session_1", position: 1, responsePayload: { selectedIndex: 0 } });
  assert.equal(changed.scoreStatus, "scored");
  assert.equal(db.responses.size, 1);
  assert.equal([...db.responses.values()][0].pointsEarned, 1);
  await answerPssaSessionItem(db, { auth: student, sessionId: "session_1", position: 2, responsePayload: { shortResponse: "Because the text says so." } });
  const submitted = await submitPssaSession(db, { auth: student, sessionId: "session_1" });
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.totalPoints, 4);
  assert.equal(submitted.earnedPoints, 1);
  assert.equal(submitted.pendingHumanPoints, 3);
  await assert.rejects(() => answerPssaSessionItem(db, { auth: student, sessionId: "session_1", position: 1, responsePayload: { selectedIndex: 0 } }), /session_submitted/);

  const invalidDb = new FixtureDb();
  invalidDb.form = makeForm([itemFixtures[0]]);
  await launchPssaFormSession(invalidDb, { auth: admin, userId: student.id, formId: "form_1" });
  const invalid = await answerPssaSessionItem(invalidDb, { auth: student, sessionId: "session_1", position: 1, responsePayload: { selectedIndex: 9 } });
  assert.equal(invalid.scoreStatus, "invalid_response");
  assert.equal([...invalidDb.responses.values()][0].pointsEarned, 0);

  const incompleteDb = new FixtureDb();
  incompleteDb.form = makeForm([itemFixtures[0], itemFixtures[7]]);
  await launchPssaFormSession(incompleteDb, { auth: admin, userId: student.id, formId: "form_1" });
  await answerPssaSessionItem(incompleteDb, { auth: student, sessionId: "session_1", position: 1, responsePayload: { selectedIndex: 0 } });
  const incomplete = await submitPssaSession(incompleteDb, { auth: student, sessionId: "session_1", allowIncomplete: true });
  assert.equal(incomplete.totalPoints, 4);
  assert.equal(incomplete.earnedPoints, 1);
  assert.equal(incomplete.pendingHumanPoints, 0);
  assert.equal(incomplete.positions.find((row: any) => row.position === 2)?.scoreStatus, "unanswered");
}

function testPostAndCacheGuards() {
  const nonJson = requirePssaPostGuards(new Request("https://example.test/api/pssa/session/answer", { method: "POST", headers: { origin: "https://example.test", "content-type": "text/plain" } }));
  assert.equal(nonJson.ok, false);
  assert.equal((nonJson as any).response.headers.get("Cache-Control"), "no-store, private");
  const cross = requirePssaPostGuards(new Request("https://example.test/api/pssa/session/answer", { method: "POST", headers: { origin: "https://evil.test", "content-type": "application/json" } }));
  assert.equal(cross.ok, false);
  const ok = requirePssaPostGuards(new Request("https://example.test/api/pssa/session/answer", { method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" } }));
  assert.equal(ok.ok, true);
  const response = pssaRouteJson({ ok: true });
  assert.equal(response.headers.get("Cache-Control"), "no-store, private");
  assert.throws(() => validateAnswerBody({ sessionId: "s", position: 1, responsePayload: {}, itemId: "leak" }), /unexpected_field/);
}

function testScopeProof() {
  const forbidden = [
    "app/api/student/session/route.ts",
    "app/api/test/start/route.ts",
    "app/api/test/answer/route.ts",
    "app/api/test/submit/route.ts",
    "lib/serverScoring.ts",
    "app/student/StudentTest.tsx",
    "prisma/schema.prisma",
  ];
  const changed = new Set(require("node:child_process").execSync("git diff --name-only", { encoding: "utf8" }).trim().split(/\n/).filter(Boolean));
  for (const file of forbidden) assert.equal(changed.has(file), false, `${file} must be untouched`);
  const newSources = [
    "lib/content/pssaFormSession.ts",
    "app/api/pssa/session/launch/route.ts",
    "app/api/pssa/session/state/route.ts",
    "app/api/pssa/session/item/route.ts",
    "app/api/pssa/session/answer/route.ts",
    "app/api/pssa/session/submit/route.ts",
  ].map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
  assert.equal(newSources.includes("serverScoring"), false);
  for (const route of ["launch", "answer", "submit"]) {
    const source = fs.readFileSync(path.join(process.cwd(), `app/api/pssa/session/${route}/route.ts`), "utf8");
    assert(source.includes("requirePssaPostGuards"));
    assert(source.includes("consumePssaRouteRateLimit"));
  }
  for (const route of ["state", "item"]) {
    const source = fs.readFileSync(path.join(process.cwd(), `app/api/pssa/session/${route}/route.ts`), "utf8");
    assert(source.includes("consumePssaRouteRateLimit"));
  }
  const serviceSource = fs.readFileSync(path.join(process.cwd(), "lib/content/pssaFormSession.ts"), "utf8");
  assert(serviceSource.includes("consumeRateLimit"));
  assert(serviceSource.includes("getClientIp"));
}

async function main() {
  await testLeakAndProjection();
  await testAuthzMatrix();
  await testValidityMatrix();
  await testAnswerLifecycleAndSubmitMath();
  testPostAndCacheGuards();
  testScopeProof();
  console.log("PSSA PR D-impl-2 delivery route tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
