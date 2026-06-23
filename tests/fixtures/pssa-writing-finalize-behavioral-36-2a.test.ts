import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { buildWritingInputState, preparePssaWritingEvaluationForResponse, processPssaWritingGradingJob, resolveWritingSnapshot, type PssaWritingGradeInput, type WritingDraftResult } from "../../lib/content/pssaWritingGrading";
import { computeDiagnosticWritingConcurrencyToken, finalizeDiagnosticWritingCase } from "../../lib/teacher/diagnosticWritingFinalize";

const db = new PrismaClient();
const prefix = `p36_2a_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const ids: string[] = [];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  try {
    const base = await seedBase();
    await noJobOnFinalize(base);
    await terminalShortCircuit(base, "SCORE");
    await terminalShortCircuit(base, "NON_SCORABLE");
    await inFlightFinalizeRace(base);
    await lateFailureRace(base);
    await terminalPrepareGuard(base);
    await idempotencyBehavior(base);
    await staleConcurrency(base);
    console.log("PSSA writing finalize #36-2a behavioral checks passed");
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

async function noJobOnFinalize(base: BaseSeed) {
  const row = await seedResponse(base, "no_job");
  await finalize(row, { kind: "SCORE", score: 2 }, uuid("no-job"));
  assert.equal(await db.pssaWritingGradingJob.count({ where: { responseId: row.responseId } }), 0, "finalize no-eval path must not enqueue AI jobs");
}

async function terminalShortCircuit(base: BaseSeed, mode: "SCORE" | "NON_SCORABLE") {
  const row = await seedResponse(base, `terminal_${mode}`);
  const prepared = await preparePssaWritingEvaluationForResponse(db, row.responseId);
  assert.equal(prepared.enqueued, true);
  const job = await db.pssaWritingGradingJob.findFirstOrThrow({ where: { responseId: row.responseId } });
  const result = mode === "SCORE"
    ? await finalize(row, { kind: "SCORE", score: 3 }, uuid(`terminal-score-${mode}`))
    : await finalize(row, { kind: "NON_SCORABLE", reason: "BLANK" }, uuid(`terminal-ns-${mode}`), { teacherNote: "Blank response." });
  const beforeAttempts = job.attempts;
  const beforeAiDrafts = await aiDraftCount(row.responseId);
  let calls = 0;
  await processPssaWritingGradingJob(db, job.id, async () => {
    calls += 1;
    return draft();
  });
  const afterJob = await db.pssaWritingGradingJob.findUniqueOrThrow({ where: { id: job.id } });
  const evalRow = await db.pssaWritingEvaluation.findUniqueOrThrow({ where: { responseId: row.responseId } });
  assert.equal(calls, 0, "terminal eval at claim time must not call grader");
  assert.equal(afterJob.status, "COMPLETED");
  assert.equal(afterJob.attempts, beforeAttempts, "terminal short-circuit must not increment attempts");
  assert.equal(evalRow.status, mode === "SCORE" ? "FINALIZED" : "NON_SCORABLE");
  assert.equal(evalRow.currentFinalAttemptId, result.attemptId);
  assert.equal(evalRow.currentDraftAttemptId, null);
  assert.equal(await aiDraftCount(row.responseId), beforeAiDrafts, "terminal short-circuit must create zero new AI_DRAFT attempts");
}

async function inFlightFinalizeRace(base: BaseSeed) {
  const row = await seedResponse(base, "inflight");
  const prepared = await preparePssaWritingEvaluationForResponse(db, row.responseId);
  const job = await db.pssaWritingGradingJob.findFirstOrThrow({ where: { responseId: row.responseId } });
  let calls = 0;
  let finalAttemptId: string | null = null;
  await processPssaWritingGradingJob(db, job.id, async () => {
    calls += 1;
    const result = await finalize(row, { kind: "SCORE", score: 2 }, uuid("inflight-final"));
    finalAttemptId = result.attemptId;
    return draft();
  });
  const evalRow = await db.pssaWritingEvaluation.findUniqueOrThrow({ where: { id: prepared.evaluationId! } });
  const jobRow = await db.pssaWritingGradingJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(calls, 1, "worker claim wins first, so grader may run");
  assert.equal(jobRow.status, "COMPLETED");
  assert.equal(evalRow.status, "FINALIZED");
  assert.equal(evalRow.currentFinalAttemptId, finalAttemptId);
  assert.equal(evalRow.currentDraftAttemptId, null, "in-flight result must not set currentDraftAttempt after teacher final");
}

async function lateFailureRace(base: BaseSeed) {
  const row = await seedResponse(base, "late_failure");
  await preparePssaWritingEvaluationForResponse(db, row.responseId);
  const job = await db.pssaWritingGradingJob.findFirstOrThrow({ where: { responseId: row.responseId } });
  let rejectGrader!: (error: Error) => void;
  let called!: () => void;
  const calledPromise = new Promise<void>((resolve) => { called = resolve; });
  const worker = processPssaWritingGradingJob(db, job.id, async () => {
    called();
    return new Promise<WritingDraftResult>((_resolve, reject) => { rejectGrader = reject; });
  }).catch((error) => error);
  await calledPromise;
  const result = await finalize(row, { kind: "NON_SCORABLE", reason: "OTHER" }, uuid("late-failure-final"), { teacherNote: "Cannot score this response." });
  rejectGrader(new Error("deferred_model_failure"));
  const error = await worker;
  assert.equal(error instanceof Error, true);
  const evalRow = await db.pssaWritingEvaluation.findUniqueOrThrow({ where: { responseId: row.responseId } });
  const jobRow = await db.pssaWritingGradingJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(evalRow.status, "NON_SCORABLE");
  assert.equal(evalRow.currentFinalAttemptId, result.attemptId);
  assert.equal(evalRow.currentDraftAttemptId, null);
  assert.equal(jobRow.status, "FAILED", "late worker failure reaches the implementation-defined terminal failure state");
}

async function terminalPrepareGuard(base: BaseSeed) {
  const row = await seedResponse(base, "prepare_guard");
  const result = await finalize(row, { kind: "SCORE", score: 1 }, uuid("prepare-guard-final"));
  const beforeJobs = await db.pssaWritingGradingJob.count({ where: { responseId: row.responseId } });
  const prepared = await preparePssaWritingEvaluationForResponse(db, row.responseId, { enqueue: true });
  const evalRow = await db.pssaWritingEvaluation.findUniqueOrThrow({ where: { responseId: row.responseId } });
  assert.deepEqual(prepared, { enqueued: false, reason: "already_finalized", evaluationId: evalRow.id });
  assert.equal(evalRow.status, "FINALIZED");
  assert.equal(evalRow.currentFinalAttemptId, result.attemptId);
  assert.equal(await db.pssaWritingGradingJob.count({ where: { responseId: row.responseId } }), beforeJobs, "terminal prepare guard must not enqueue");
}

async function idempotencyBehavior(base: BaseSeed) {
  const row = await seedResponse(base, "idempotency");
  const key = uuid("idempotency-main");
  const first = await finalize(row, { kind: "SCORE", score: 2 }, key, { teacherNote: "Looks correct." });
  const replay = await finalize(row, { kind: "SCORE", score: 2 }, key, { teacherNote: "Looks correct." });
  assert.equal(replay.attemptId, first.attemptId);
  assert.equal(await teacherAttemptCount(row.responseId, "TEACHER_FINAL"), 1, "same UUID replay must not create duplicate TEACHER_FINAL");
  await assert.rejects(() => finalize(row, { kind: "SCORE", score: 3 }, key, { teacherNote: "Changed." }), /idempotency_key_reuse/);

  const noOp = await finalize(row, { kind: "SCORE", score: 2 }, uuid("idempotency-noop"), { teacherNote: "Looks correct." });
  assert.equal(noOp.status, "noop");
  assert.equal(await attemptCount(row.responseId), 1, "fresh UUID identical to final must be receipt-only");
  await assert.rejects(() => finalize(row, { kind: "SCORE", score: 1 }, uuid("idempotency-missing-reason")), /override_reason_required/);
  const override = await finalize(row, { kind: "NON_SCORABLE", reason: "REFUSAL" }, uuid("idempotency-override"), { overrideReason: "Teacher changed decision.", teacherNote: "Student refused." });
  assert.equal(override.status, "overridden");
  assert.equal(await teacherAttemptCount(row.responseId, "TEACHER_OVERRIDE"), 1);
  assert.notEqual(override.attemptId, first.attemptId);
}

async function staleConcurrency(base: BaseSeed) {
  const row = await seedResponse(base, "stale");
  const staleToken = await token(row);
  await finalize(row, { kind: "SCORE", score: 2 }, uuid("stale-first"));
  await assert.rejects(
    () => finalize(row, { kind: "SCORE", score: 3 }, uuid("stale-second"), { expectedConcurrencyToken: staleToken, overrideReason: "Changed score." }),
    /stale_grading_case/,
  );
}

async function finalize(row: ResponseSeed, decision: any, idempotencyKey: string, opts: { teacherNote?: string; overrideReason?: string; expectedConcurrencyToken?: string } = {}) {
  return finalizeDiagnosticWritingCase({
    teacherUserId: row.teacherUserId,
    caseId: `diagnostic:${row.responseId}`,
    classRoomId: row.classRoomId,
    formId: row.formId,
    expectedConcurrencyToken: opts.expectedConcurrencyToken ?? await token(row),
    decision,
    teacherNote: opts.teacherNote,
    overrideReason: opts.overrideReason,
    idempotencyKey,
  }, db);
}

async function token(row: ResponseSeed) {
  return computeDiagnosticWritingConcurrencyToken(db, {
    caseId: `diagnostic:${row.responseId}`,
    classRoomId: row.classRoomId,
    formId: row.formId,
    responseId: row.responseId,
  });
}

async function seedBase(): Promise<BaseSeed> {
  const suffix = crypto.randomUUID();
  const teacher = await db.user.create({ data: { email: `${prefix}_${suffix}_teacher@example.com`, name: "36-2a Teacher", role: "TEACHER" } });
  ids.push(teacher.id);
  const student = await db.user.create({ data: { email: `${prefix}_${suffix}_student@example.com`, name: "36-2a Student", role: "STUDENT" } });
  ids.push(student.id);
  const teacherProfile = await db.teacherProfile.create({ data: { userId: teacher.id, schoolName: "36-2a School" } });
  const studentProfile = await db.studentProfile.create({ data: { userId: student.id, schoolName: "36-2a School", grade: 3 } });
  const classRoom = await db.classRoom.create({ data: { name: "36-2a Class", teacherId: teacherProfile.id, grade: 3 } });
  await db.enrollment.create({ data: { classRoomId: classRoom.id, studentProfileId: studentProfile.id } });
  const passageHash = `sha256:${prefix}:passage`;
  const itemHash = `sha256:${prefix}:item`;
  const passage = await db.pssaPassage.create({
    data: {
      title: "36-2a Passage",
      gradeLevel: 3,
      passageType: "literary",
      text: "The bell helped the family find the dog because they could hear it.",
      wordCount: 13,
      sourceType: "internal_original",
      licenseStatus: "cleared",
      commercialUseAllowed: true,
      needsLegalReview: false,
      reviewStatus: "APPROVED",
      itemStatus: "pilot_ready",
      provenanceJson: {},
      contentHash: passageHash,
      studentReadyBlockedReason: "NONE",
    },
  });
  const item = await db.pssaItem.create({
    data: {
      gradeLevel: 3,
      standardCode: "CC.1.2.3.B",
      itemType: "SHORT_ANSWER",
      skill: "Text evidence",
      interactionType: "SHORT_ANSWER",
      responseSpecJson: { stem: "Why did the bell help?", instructionText: "Use evidence.", requiredSupportCount: 1, requiresTextSupport: true },
      correctResponseJson: {},
      scoringJson: { totalPoints: 3, scoreBandExamples: { 0: "", 1: "", 2: "", 3: "" }, scoringNotes: "Fixture rubric." },
      pointValue: 3,
      sourceType: "internal_original",
      licenseStatus: "cleared",
      commercialUseAllowed: true,
      needsLegalReview: false,
      reviewStatus: "APPROVED",
      itemStatus: "pilot_ready",
      alignmentStatus: "ALIGNED",
      approvalEligible: true,
      responseSpecVersion: "fixture-v1",
      auditContractVersion: "fixture",
      sourceScanVersion: "fixture",
      contentHash: itemHash,
      studentReadyBlockedReason: "NONE",
      provenanceJson: {},
    },
  });
  await db.pssaItemPassageLink.create({ data: { itemId: item.id, passageId: passage.id, role: "primary", sortOrder: 1 } });
  return { teacherUserId: teacher.id, studentUserId: student.id, classRoomId: classRoom.id, passageId: passage.id, passageHash, itemId: item.id, itemHash };
}

async function seedResponse(base: BaseSeed, label: string): Promise<ResponseSeed> {
  const form = await db.pssaForm.create({
    data: {
      gradeLevel: 3,
      blueprintVersion: "36-2a",
      seed: `${prefix}_${label}`,
      formStatus: "assembled",
      totalPoints: 3,
      categoryPointsJson: {},
      contentHash: `sha256:${prefix}:${label}:form`,
      auditContractVersion: "fixture",
      sourceScanVersion: "fixture",
      assembledBy: "fixture",
      assemblyRunId: `${prefix}_${label}`,
      passages: { create: { passageId: base.passageId, position: 1, approvedPassageContentHashSnapshot: base.passageHash } },
      items: { create: { itemId: base.itemId, position: 1, pointValue: 3, slotType: "short_answer", scoringBucket: "operational", approvedContentHashSnapshot: base.itemHash, passageIdSnapshot: base.passageId } },
    },
    include: { items: true },
  });
  const session = await db.pssaFormSession.create({
    data: {
      userId: base.studentUserId,
      formId: form.id,
      formContentHashAtStart: form.contentHash,
      status: "submitted",
      submittedAt: new Date(),
      totalPoints: 3,
      earnedPoints: 0,
      pendingHumanPoints: 3,
    },
  });
  const response = await db.pssaFormResponse.create({
    data: {
      sessionId: session.id,
      formItemId: form.items[0].id,
      positionSnapshot: 1,
      itemId: base.itemId,
      responsePayloadJson: { shortResponse: `The bell helped because the family could hear it. ${label}` },
      scoreStatus: "pending_human_scoring",
      pointsEarned: null,
      maxPoints: 3,
      detail: "short_answer_rubric",
    },
  });
  return { ...base, formId: form.id, sessionId: session.id, responseId: response.id };
}

function draft(): WritingDraftResult {
  return {
    ok: true,
    score: 3,
    rationale: "Draft rationale.",
    instructionalProfile: [
      { areaId: "completeness", signal: "clear", observation: "Complete.", responseExcerpt: "The bell helped", teachingMove: "Keep explaining." },
      { areaId: "accuracy", signal: "clear", observation: "Accurate.", teachingMove: "Confirm against rubric." },
    ],
    modelId: "fixture-grader",
  };
}

async function aiDraftCount(responseId: string) {
  return db.pssaWritingEvaluationAttempt.count({ where: { kind: "AI_DRAFT", evaluation: { responseId } } });
}

async function teacherAttemptCount(responseId: string, kind: "TEACHER_FINAL" | "TEACHER_OVERRIDE") {
  return db.pssaWritingEvaluationAttempt.count({ where: { kind, evaluation: { responseId } } });
}

async function attemptCount(responseId: string) {
  return db.pssaWritingEvaluationAttempt.count({ where: { evaluation: { responseId } } });
}

function uuid(label: string) {
  return crypto.createHash("sha256").update(`${prefix}:${label}`).digest("hex").replace(/^(.{8})(.{4})(.{3})(.{3})(.{12}).*$/, "$1-$2-4$3-8$4-$5");
}

async function cleanup() {
  await db.pssaFormSession.deleteMany({ where: { userId: { in: ids } } });
  await db.pssaForm.deleteMany({ where: { contentHash: { contains: prefix } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.pssaItem.deleteMany({ where: { contentHash: `sha256:${prefix}:item` } });
  await db.pssaPassage.deleteMany({ where: { contentHash: `sha256:${prefix}:passage` } });
}

type BaseSeed = {
  teacherUserId: string;
  studentUserId: string;
  classRoomId: string;
  passageId: string;
  passageHash: string;
  itemId: string;
  itemHash: string;
};

type ResponseSeed = BaseSeed & {
  formId: string;
  sessionId: string;
  responseId: string;
};
