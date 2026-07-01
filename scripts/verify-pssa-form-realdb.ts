import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assembleClassReport } from "@/lib/content/pssaClassReportLoader";
import {
  answerPssaSessionItem,
  endPssaSessionSection,
  getPssaSessionItem,
  launchPssaFormSession,
  submitPssaSession,
  type PssaRouteUser,
} from "@/lib/content/pssaFormSession";
import { PSSA_STUDENT_DTO_BANNED_KEYS, assertNoBannedKeys } from "@/lib/content/pssaStudentDto";
import { upsertDemoRoster } from "@/scripts/seed-pssa-roster-demo";

type Args = {
  env: string | null;
  formId: string | null;
  expectDelivered: number | null;
  expectOperationalTotal: number | null;
  expectEarnedAutoscored: number | null;
  expectPendingHuman: number | null;
  expectShortAnswers: number | null;
  expectAnalytics: "none" | { items: number; points: number } | null;
  allowProduction: boolean;
};

type LoadedForm = Awaited<ReturnType<typeof loadVerificationForm>>;
type LoadedFormItem = LoadedForm["items"][number];

const STUDENT_SERIALIZED_LEAK_RE = /scoringBucket|analytics_only|operational|rationale|dokLevel|answerKey|correctResponseJson/i;

function parseArgs(argv: string[]): Args {
  const args: Args = {
    env: null,
    formId: null,
    expectDelivered: null,
    expectOperationalTotal: null,
    expectEarnedAutoscored: null,
    expectPendingHuman: null,
    expectShortAnswers: null,
    expectAnalytics: null,
    allowProduction: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}.`);
      i += 1;
      return value;
    };
    if (arg === "--env") args.env = next();
    else if (arg.startsWith("--env=")) args.env = arg.slice("--env=".length);
    else if (arg === "--formId") args.formId = next();
    else if (arg.startsWith("--formId=")) args.formId = arg.slice("--formId=".length);
    else if (arg === "--expect-delivered") args.expectDelivered = positiveInt(next(), arg);
    else if (arg.startsWith("--expect-delivered=")) args.expectDelivered = positiveInt(arg.slice("--expect-delivered=".length), "--expect-delivered");
    else if (arg === "--expect-operational-total") args.expectOperationalTotal = nonnegativeInt(next(), arg);
    else if (arg.startsWith("--expect-operational-total=")) args.expectOperationalTotal = nonnegativeInt(arg.slice("--expect-operational-total=".length), "--expect-operational-total");
    else if (arg === "--expect-earned-autoscored") args.expectEarnedAutoscored = nonnegativeInt(next(), arg);
    else if (arg.startsWith("--expect-earned-autoscored=")) args.expectEarnedAutoscored = nonnegativeInt(arg.slice("--expect-earned-autoscored=".length), "--expect-earned-autoscored");
    else if (arg === "--expect-pending-human") args.expectPendingHuman = nonnegativeInt(next(), arg);
    else if (arg.startsWith("--expect-pending-human=")) args.expectPendingHuman = nonnegativeInt(arg.slice("--expect-pending-human=".length), "--expect-pending-human");
    else if (arg === "--expect-short-answers") args.expectShortAnswers = nonnegativeInt(next(), arg);
    else if (arg.startsWith("--expect-short-answers=")) args.expectShortAnswers = nonnegativeInt(arg.slice("--expect-short-answers=".length), "--expect-short-answers");
    else if (arg === "--expect-analytics") args.expectAnalytics = parseAnalytics(next());
    else if (arg.startsWith("--expect-analytics=")) args.expectAnalytics = parseAnalytics(arg.slice("--expect-analytics=".length));
    else if (arg === "--allow-production") args.allowProduction = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  for (const [key, value] of Object.entries(args)) {
    if (key === "allowProduction") continue;
    if (value == null) throw new Error(`Missing required flag --${kebab(key)}.`);
  }
  return args;
}

function assertDevAllowed(args: Args) {
  if (args.env !== "dev") throw new Error("--env dev is required.");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  if (looksProductionLike(url) && !args.allowProduction) throw new Error("Refusing production-like DATABASE_URL without --allow-production.");
}

function looksProductionLike(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  return lower.includes("prod") || lower.includes("production") || lower.includes("neon.tech") || lower.includes("sslmode=require");
}

async function assertPrismaLedger(db: PrismaClient) {
  const migrationDir = path.join(process.cwd(), "prisma", "migrations");
  const migrationDirs = fs.readdirSync(migrationDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length;
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint AS count FROM _prisma_migrations`;
  const ledgerRows = Number(rows[0]?.count ?? -1);
  if (migrationDirs !== ledgerRows) throw new Error(`prisma_ledger_mismatch: filesystem=${migrationDirs}; database=${ledgerRows}`);
  return { migrationDirs, ledgerRows };
}

async function loadVerificationForm(db: PrismaClient, formId: string) {
  const form = await db.pssaForm.findUnique({
    where: { id: formId },
    include: {
      sections: { orderBy: { sectionIndex: "asc" } },
      items: {
        orderBy: { position: "asc" },
        include: {
          item: {
            include: {
              passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } },
              passageGroup: { include: { members: { include: { passage: true }, orderBy: { position: "asc" } } } },
            },
          },
        },
      },
      passages: { include: { passage: true }, orderBy: { position: "asc" } },
    },
  });
  if (!form) throw new Error(`form_not_found:${formId}`);
  return form;
}

function assertFormShape(form: LoadedForm, args: Args) {
  assert.equal(form.formStatus, "assembled", "form must be assembled");
  assert.equal(form.items.length, args.expectDelivered, "delivered item count");
  const operational = form.items.filter((row) => row.scoringBucket !== "analytics_only");
  const analytics = form.items.filter((row) => row.scoringBucket === "analytics_only");
  assert.equal(sumPoints(operational), args.expectOperationalTotal, "operational point total");
  if (args.expectAnalytics === "none") {
    assert.equal(analytics.length, 0, "analytics item count");
    assert.equal(sumPoints(analytics), 0, "analytics point total");
  } else {
    assert.equal(analytics.length, args.expectAnalytics?.items, "analytics item count");
    assert.equal(sumPoints(analytics), args.expectAnalytics?.points, "analytics point total");
  }
  assert.equal(form.items.filter((row) => row.item.interactionType === "SHORT_ANSWER").length, args.expectShortAnswers, "short-answer count");
}

async function createRoster(db: PrismaClient, formId: string, label: string) {
  const suffix = `${label}.${formId}.${Date.now()}`.replace(/[^a-zA-Z0-9.]+/g, ".").toLowerCase();
  return upsertDemoRoster(db, {
    formId,
    teacherEmail: `pssa.${suffix}.teacher@example.test`,
    studentEmail: `pssa.${suffix}.student@example.test`,
    teacherName: `PSSA ${label} Verification Teacher`,
    studentName: `PSSA ${label} Verification Student`,
    classRoomId: `pssa-${suffix}-classroom`.slice(0, 120),
  });
}

async function verifySession(db: PrismaClient, form: LoadedForm, args: Args) {
  const roster = await createRoster(db, form.id, "realdb");
  const student: PssaRouteUser = { id: roster.studentId, role: "STUDENT" };
  const teacher: PssaRouteUser = { id: roster.teacherId, role: "TEACHER" };

  await assert.rejects(
    () => launchPssaFormSession(db, { auth: student, userId: roster.studentId, formId: form.id }),
    /student_launch_forbidden/,
    "student launch must be forbidden",
  );

  const launch = await launchPssaFormSession(db, { auth: teacher, userId: roster.studentId, formId: form.id });
  const leakChecks = { studentItemsFetched: 0 };
  for (const section of sectionsFor(form)) {
    const rows = form.items.filter((row) => sectionIndexFor(row) === section.sectionIndex).sort((a, b) => a.position - b.position);
    for (const row of rows) {
      const dto = await getPssaSessionItem(db, { auth: student, sessionId: launch.sessionId, position: row.position });
      leakChecks.studentItemsFetched += 1;
      assert.equal(dto.position, row.position, "student DTO position");
      assertLeakFreeStudentPayload(dto);
      const answerResult = await answerPssaSessionItem(db, {
        auth: student,
        sessionId: launch.sessionId,
        position: row.position,
        responsePayload: correctPayload(row.item),
      });
      assert.deepEqual(Object.keys(answerResult).sort(), ["isComplete", "position", "scoreStatus"].sort(), "answer result must not expose key/score details");
      assert.equal(answerResult.position, row.position, "answer result position");
      assert(["scored", "pending_human_scoring"].includes(answerResult.scoreStatus), `unexpected score status ${answerResult.scoreStatus}`);
    }
    await endPssaSessionSection(db, { auth: student, sessionId: launch.sessionId, sectionIndex: section.sectionIndex });
  }
  assert.equal(leakChecks.studentItemsFetched, args.expectDelivered, "student DTOs fetched");

  const submitted = await submitPssaSession(db, { auth: student, sessionId: launch.sessionId });
  assert.equal(submitted.status, "submitted", "session status");
  assert.equal(submitted.totalPoints, args.expectOperationalTotal, "submitted operational total");
  assert.equal(submitted.earnedPoints, args.expectEarnedAutoscored, "submitted earned auto-scored points");
  assert.equal(submitted.pendingHumanPoints, args.expectPendingHuman, "submitted pending human points");
  assert.equal(Number(submitted.earnedPoints ?? 0) + Number(submitted.pendingHumanPoints ?? 0), submitted.totalPoints, "earned + pending must equal total");
  if (args.expectAnalytics === "none") {
    assert.equal(submitted.analyticsTotalPoints, 0, "submitted analytics total");
    assert.equal(submitted.analyticsEarnedPoints, 0, "submitted analytics earned");
    assert.equal(submitted.analyticsPendingHumanPoints, 0, "submitted analytics pending");
  } else {
    assert.equal(submitted.analyticsTotalPoints, args.expectAnalytics?.points, "submitted analytics total");
    assert.equal(submitted.analyticsEarnedPoints, args.expectAnalytics?.points, "submitted analytics earned");
    assert.equal(submitted.analyticsPendingHumanPoints, 0, "submitted analytics pending");
  }

  const responses = await db.pssaFormResponse.findMany({
    where: { sessionId: launch.sessionId },
    orderBy: { positionSnapshot: "asc" },
    include: { formItem: { select: { itemId: true, scoringBucket: true } } },
  });
  assert.equal(responses.filter((row) => row.scoreStatus === "pending_human_scoring").length, args.expectShortAnswers, "pending short-answer response count");

  await verifyTeacherReport(db, {
    form,
    classRoomId: roster.classRoomId,
    teacherProfileId: roster.teacherProfileId,
    mainSessionId: launch.sessionId,
  });

  return {
    roster,
    sessionId: launch.sessionId,
    submitted,
    pendingHumanItemIds: responses.filter((row) => row.scoreStatus === "pending_human_scoring").map((row) => row.itemId).sort(),
    scoreStatusCounts: countBy(responses.map((row) => row.scoreStatus)),
  };
}

async function verifyTeacherReport(db: PrismaClient, input: { form: LoadedForm; classRoomId: string; teacherProfileId: string; mainSessionId: string }) {
  const probe = await createRoster(db, input.form.id, "teacher.probe");
  await db.enrollment.upsert({
    where: { classRoomId_studentProfileId: { classRoomId: input.classRoomId, studentProfileId: probe.studentProfileId } },
    update: {},
    create: { classRoomId: input.classRoomId, studentProfileId: probe.studentProfileId },
  });
  const probeSessionId = await submitProbeWithOneRoleError(db, input.form, { id: probe.teacherId, role: "TEACHER" }, { id: probe.studentId, role: "STUDENT" });

  const sessions = await db.pssaFormSession.findMany({
    where: { id: { in: [input.mainSessionId, probeSessionId] } },
    include: { responses: { include: { formItem: { select: { scoringBucket: true } } }, orderBy: { positionSnapshot: "asc" } } },
  });
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const report = assembleClassReport([
    { studentId: "main", session: toReportSession(sessionById.get(input.mainSessionId)) },
    { studentId: "teacher_probe", session: toReportSession(sessionById.get(probeSessionId)) },
  ], {
    form: reportFormFromLoadedForm(input.form),
    benchmarkSeason: benchmarkSeasonFor(input.form.blueprintVersion),
    formId: input.form.id,
    formVersion: input.form.contentHash,
  });
  assert(report.completedStudents >= 2, "class report must include main + teacher-sensitive probe sessions");
  assert(Array.isArray(report.byDok) && report.byDok.some((row) => row.operationalPoints > 0), "class report byDok must be populated");
  assert(Array.isArray(report.byDokCategory) && report.byDokCategory.some((row) => row.operationalPoints > 0), "class report byDokCategory must be populated");
  assert(report.misconceptionMap.length > 0, "teacher report misconception map must be non-vacuous");
  assert(report.misconceptionMap.some((row) => row.roleFamily && row.totalResponses > 0), "teacher report must carry misconception role-family evidence");
  assert(teacherSourceHasDistractorRole(input.form), "teacher-only form source must carry distractorRole evidence");
}

async function submitProbeWithOneRoleError(db: PrismaClient, form: LoadedForm, teacher: PssaRouteUser, student: PssaRouteUser) {
  const roleItem = form.items.find((row) => wrongMcqPayload(row.item));
  if (!roleItem) throw new Error("teacher_probe_no_role_bearing_mcq");
  await assert.rejects(() => launchPssaFormSession(db, { auth: student, userId: student.id, formId: form.id }), /student_launch_forbidden/);
  const launch = await launchPssaFormSession(db, { auth: teacher, userId: student.id, formId: form.id });
  for (const section of sectionsFor(form)) {
    const rows = form.items.filter((row) => sectionIndexFor(row) === section.sectionIndex).sort((a, b) => a.position - b.position);
    for (const row of rows) {
      const payload = row.id === roleItem.id ? wrongMcqPayload(row.item)! : correctPayload(row.item);
      await getPssaSessionItem(db, { auth: student, sessionId: launch.sessionId, position: row.position });
      await answerPssaSessionItem(db, { auth: student, sessionId: launch.sessionId, position: row.position, responsePayload: payload });
    }
    await endPssaSessionSection(db, { auth: student, sessionId: launch.sessionId, sectionIndex: section.sectionIndex });
  }
  await submitPssaSession(db, { auth: student, sessionId: launch.sessionId });
  return launch.sessionId;
}

function correctPayload(item: any): unknown {
  const type = String(item.interactionType ?? item.itemType ?? "").toUpperCase();
  const correct = objectSource(item.correctResponseJson);
  if (type === "MCQ" || type === "CONVENTIONS") {
    const correctIndex = correct.correctIndex ?? item.correctIndex;
    const choiceCount = choiceArray(item.responseSpecJson).length;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choiceCount) throw new Error(`mcq_correct_index_missing_or_out_of_range:${item.id}`);
    return { selectedIndex: correctIndex };
  }
  if (type === "EBSR") return { partAIndex: objectSource(correct.partA).correctIndex, partBIndices: [...arraySource(objectSource(correct.partB).correctIndices)] };
  if (type === "MULTI_SELECT") return { selectedIndices: [...arraySource(correct.correctIndices)] };
  if (type === "HOT_TEXT") return { selectedSpanIds: [...arraySource(correct.correctSpanIds)] };
  if (type === "MATCHING_GRID") return { rowSelections: Object.fromEntries(arraySource(correct.correctCells).map((cell: any) => [cell.rowId, cell.columnId])) };
  if (type === "DRAG_DROP") return { assignments: Object.fromEntries(arraySource(correct.correctAssignments).map((row: any) => [row.tokenId, row.targetId])) };
  if (type === "INLINE_DROPDOWN") return { blankSelections: Object.fromEntries(arraySource(correct.blanks).map((blank: any) => [blank.blankId, blank.correctIndex])) };
  if (type === "SHORT_ANSWER") return { shortResponse: "The passage details support this answer." };
  throw new Error(`unsupported_interaction_type:${item.id}:${type}`);
}

function wrongMcqPayload(item: any): { selectedIndex: number } | null {
  const type = String(item.interactionType ?? item.itemType ?? "").toUpperCase();
  if (type !== "MCQ" && type !== "CONVENTIONS") return null;
  const correctIndex = objectSource(item.correctResponseJson).correctIndex ?? item.correctIndex;
  if (!Number.isInteger(correctIndex)) return null;
  const wrongIndex = roleChoiceArray(item.responseSpecJson).findIndex((choice: any, index) => index !== correctIndex && typeof choice?.distractorRole === "string" && choice.distractorRole);
  return wrongIndex >= 0 ? { selectedIndex: wrongIndex } : null;
}

function assertLeakFreeStudentPayload(value: unknown) {
  assert(value && typeof value === "object", "student DTO must be retrieved");
  assertNoBannedKeys(value);
  const serialized = JSON.stringify(value);
  assert.equal(STUDENT_SERIALIZED_LEAK_RE.test(serialized), false, "student payload must not expose scoring/rationale/DOK markers");
  for (const key of collectKeys(value)) {
    assert.equal(PSSA_STUDENT_DTO_BANNED_KEYS.includes(key as any), false, `banned student key ${key}`);
    assert.equal(/correct/i.test(key), false, `correct-like student key ${key}`);
    assert.equal(/rationale/i.test(key), false, `rationale-like student key ${key}`);
  }
}

function sectionsFor(form: LoadedForm) {
  if (form.hasSections && form.sections.length) return form.sections;
  return [{ sectionIndex: 1, sectionType: "flat", label: "Section 1", estimatedMinutes: 0 }];
}

function sectionIndexFor(row: LoadedFormItem) {
  return row.sectionIndex ?? 1;
}

function choiceArray(responseSpecJson: unknown): any[] {
  const spec = objectSource(responseSpecJson);
  const choices = spec.choices ?? spec.structuredChoicesJson ?? spec.answerChoicesJson;
  return Array.isArray(choices) ? choices : [];
}

function roleChoiceArray(responseSpecJson: unknown): any[] {
  const spec = objectSource(responseSpecJson);
  const choices = spec.structuredChoicesJson ?? spec.choices ?? spec.answerChoicesJson;
  return Array.isArray(choices) ? choices : [];
}

function teacherSourceHasDistractorRole(form: LoadedForm) {
  return form.items.some((row) => JSON.stringify(row.item.responseSpecJson).includes("distractorRole"));
}

function reportFormFromLoadedForm(form: LoadedForm) {
  return {
    id: form.id,
    formId: form.id,
    formVersion: form.contentHash,
    blueprintVersion: form.blueprintVersion,
    contentHash: form.contentHash,
    items: form.items.map((row) => ({
      id: row.itemId,
      itemId: row.itemId,
      interactionType: row.item.interactionType,
      itemType: row.item.itemType,
      eligibleContent: row.item.eligibleContent,
      reportingCategory: row.item.reportingCategory,
      correctIndex: objectSource(row.item.correctResponseJson).correctIndex ?? null,
      structuredChoicesJson: roleChoiceArray(row.item.responseSpecJson),
      answerChoicesJson: roleChoiceArray(row.item.responseSpecJson),
      choices: roleChoiceArray(row.item.responseSpecJson),
      scoringBucket: row.scoringBucket,
    })),
  };
}

function toReportSession(session: any) {
  if (!session) return null;
  return {
    status: session.status,
    earnedPoints: session.earnedPoints,
    totalPoints: session.totalPoints,
    pendingHumanPoints: session.pendingHumanPoints,
    analyticsEarnedPoints: session.analyticsEarnedPoints,
    analyticsTotalPoints: session.analyticsTotalPoints,
    analyticsPendingHumanPoints: session.analyticsPendingHumanPoints,
    submittedAt: session.submittedAt,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
    responses: session.responses.map((response: any) => ({
      itemId: response.itemId,
      responsePayloadJson: response.responsePayloadJson,
      scoreStatus: response.scoreStatus,
      pointsEarned: response.pointsEarned,
      maxPoints: response.maxPoints,
      scoringBucket: response.formItem?.scoringBucket ?? "operational",
    })),
  };
}

function benchmarkSeasonFor(blueprintVersion: string) {
  const lower = blueprintVersion.toLowerCase();
  if (lower.includes("eoy")) return "EOY";
  if (lower.includes("moy")) return "MOY";
  return "BOY";
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

function sumPoints(items: Array<{ pointValue: number }>) {
  return items.reduce((sum, row) => sum + row.pointValue, 0);
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function objectSource(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function arraySource(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function parseAnalytics(value: string): Args["expectAnalytics"] {
  if (value === "none") return "none";
  const [items, points] = value.split(":").map((part) => nonnegativeInt(part, "--expect-analytics"));
  if (!Number.isInteger(items) || !Number.isInteger(points)) throw new Error("--expect-analytics must be none or items:points");
  return { items, points };
}

function positiveInt(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}

function nonnegativeInt(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer.`);
  return parsed;
}

function kebab(value: string) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertDevAllowed(args);
  const db = new PrismaClient();
  try {
    const ledger = await assertPrismaLedger(db);
    const form = await loadVerificationForm(db, args.formId!);
    assertFormShape(form, args);
    const result = await verifySession(db, form, args);
    console.log("PSSA real-DB verification PASS");
    console.log(JSON.stringify({
      formId: form.id,
      blueprintVersion: form.blueprintVersion,
      contentHash: form.contentHash,
      ledger,
      delivered: form.items.length,
      operationalTotal: result.submitted.totalPoints,
      earnedAutoscored: result.submitted.earnedPoints,
      pendingHuman: result.submitted.pendingHumanPoints,
      analyticsTotal: result.submitted.analyticsTotalPoints,
      analyticsEarned: result.submitted.analyticsEarnedPoints,
      analyticsPending: result.submitted.analyticsPendingHumanPoints,
      shortAnswers: args.expectShortAnswers,
      pendingHumanItemIds: result.pendingHumanItemIds,
      scoreStatusCounts: result.scoreStatusCounts,
      teacherId: result.roster.teacherId,
      studentId: result.roster.studentId,
      classRoomId: result.roster.classRoomId,
      sessionId: result.sessionId,
    }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
