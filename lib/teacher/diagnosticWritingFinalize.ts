import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { summarizePssaResponseBuckets } from "@/lib/content/pssaFormSession";
import {
  buildWritingInputState,
  preparePssaWritingEvaluationForResponse,
  resolveWritingSnapshot,
  sha256,
  stableStringify,
  validateInstructionalProfile,
} from "@/lib/content/pssaWritingGrading";

const TEACHER_SCORER_VERSION = "teacher-review-v1";
const TEACHER_PROMPT_KEY = "teacher-review";
const NON_SCORABLE_REASONS = new Set(["BLANK", "REFUSAL", "OFF_TOPIC", "COPIED", "OTHER"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Database = PrismaClient | Prisma.TransactionClient;
type Decision =
  | { kind: "SCORE"; score: number }
  | { kind: "NON_SCORABLE"; reason: "BLANK" | "REFUSAL" | "OFF_TOPIC" | "COPIED" | "OTHER" };

export type FinalizeWritingInput = {
  teacherUserId: string;
  caseId: string;
  classRoomId: string;
  formId: string;
  expectedConcurrencyToken: string;
  decision: Decision;
  overrideReason?: string | null;
  teacherNote?: string | null;
  idempotencyKey: string;
};

export class DiagnosticWritingFinalizeError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function finalizeDiagnosticWritingCase(input: FinalizeWritingInput, database: PrismaClient = db) {
  if (!UUID_RE.test(input.idempotencyKey)) throw new DiagnosticWritingFinalizeError(400, "invalid_idempotency_key");
  const responseId = parseCaseId(input.caseId);
  return database.$transaction(async (tx) => finalizeInTransaction(tx, { ...input, responseId }), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function computeDiagnosticWritingConcurrencyToken(
  database: Database,
  input: { caseId: string; classRoomId: string; formId: string; responseId: string },
) {
  const loaded = await loadWritingResponseForFinalize(database, input.responseId);
  if (!loaded) throw new DiagnosticWritingFinalizeError(404, "grading_case_not_found");
  const evaluation = await database.pssaWritingEvaluation.findUnique({
    where: { responseId: input.responseId },
    select: { currentInputHash: true, currentFinalAttemptId: true },
  });
  const currentInputHash = evaluation?.currentInputHash ?? currentInputHashFromLoaded(loaded);
  return concurrencyToken({
    caseId: input.caseId,
    classRoomId: input.classRoomId,
    formId: input.formId,
    currentInputHash,
    currentFinalAttemptId: evaluation?.currentFinalAttemptId ?? null,
  });
}

async function finalizeInTransaction(tx: Prisma.TransactionClient, input: FinalizeWritingInput & { responseId: string }) {
  await lockResponseRows(tx, input.responseId);
  await assertTeacherOwnsCase(tx, input);

  let loaded = await loadWritingResponseForFinalize(tx, input.responseId);
  if (!loaded) throw new DiagnosticWritingFinalizeError(404, "grading_case_not_found");
  let evaluation = await tx.pssaWritingEvaluation.findUnique({
    where: { responseId: input.responseId },
    include: { currentDraftAttempt: true, currentFinalAttempt: true },
  });

  if (!evaluation) {
    const ensured = await preparePssaWritingEvaluationForResponse(tx, input.responseId);
    if (!ensured.evaluationId) throw new DiagnosticWritingFinalizeError(422, String(ensured.reason ?? "evaluation_unavailable"));
    evaluation = await tx.pssaWritingEvaluation.findUnique({
      where: { id: ensured.evaluationId },
      include: { currentDraftAttempt: true, currentFinalAttempt: true },
    });
    loaded = await loadWritingResponseForFinalize(tx, input.responseId);
  }
  if (!evaluation || !loaded) throw new DiagnosticWritingFinalizeError(422, "evaluation_unavailable");

  const currentInputHash = currentInputHashFromLoaded(loaded);
  if (evaluation.currentInputHash !== currentInputHash) throw new DiagnosticWritingFinalizeError(409, "stale_grading_case");
  const actualToken = concurrencyToken({
    caseId: input.caseId,
    classRoomId: input.classRoomId,
    formId: input.formId,
    currentInputHash,
    currentFinalAttemptId: evaluation.currentFinalAttemptId,
  });

  const official = officialAttemptContent(loaded, evaluation, input);
  const requestHash = canonicalRequestHash({
    teacherUserId: input.teacherUserId,
    evaluationId: evaluation.id,
    inputHash: evaluation.currentInputHash,
    decision: input.decision,
    overrideReason: input.overrideReason,
    teacherNote: input.teacherNote,
    reviewedRationaleProfileHash: sha256(stableStringify({ rationale: official.rationale, profile: official.instructionalProfileJson ?? null })),
  });

  const existingReceipt = await tx.pssaWritingFinalizeReceipt.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { resultAttempt: true },
  });
  if (existingReceipt) {
    if (existingReceipt.requestHash !== requestHash) throw new DiagnosticWritingFinalizeError(409, "idempotency_key_reuse");
    return finalizeResult("idempotent", existingReceipt.resultAttemptId, actualToken);
  }
  if (input.expectedConcurrencyToken !== actualToken) throw new DiagnosticWritingFinalizeError(409, "stale_grading_case");

  if (evaluation.currentFinalAttemptId) {
    const matchingFinalReceipt = await tx.pssaWritingFinalizeReceipt.findFirst({
      where: { resultAttemptId: evaluation.currentFinalAttemptId, requestHash },
      select: { resultAttemptId: true },
    });
    if (matchingFinalReceipt) {
      const receipt = await tx.pssaWritingFinalizeReceipt.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          requestHash,
          evaluationId: evaluation.id,
          teacherUserId: input.teacherUserId,
          resultAttemptId: evaluation.currentFinalAttemptId,
        },
      });
      return finalizeResult("noop", receipt.resultAttemptId, actualToken);
    }
    if (!normalizeOptional(input.overrideReason)) throw new DiagnosticWritingFinalizeError(400, "override_reason_required");
  }

  const kind = evaluation.currentFinalAttemptId ? "TEACHER_OVERRIDE" : "TEACHER_FINAL";
  const attempt = await createTeacherAttempt(tx, {
    evaluationId: evaluation.id,
    attemptIdempotencyKey: input.idempotencyKey,
    kind,
    inputHash: evaluation.currentInputHash,
    responseHash: evaluation.responseHash,
    decision: input.decision,
    rationale: official.rationale,
    instructionalProfileJson: official.instructionalProfileJson,
    teacherUserId: input.teacherUserId,
    overrideReason: input.overrideReason,
  });
  await tx.pssaWritingFinalizeReceipt.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      requestHash,
      evaluationId: evaluation.id,
      teacherUserId: input.teacherUserId,
      resultAttemptId: attempt.id,
    },
  });
  await tx.pssaWritingEvaluation.update({
    where: { id: evaluation.id },
    data: {
      currentFinalAttemptId: attempt.id,
      status: input.decision.kind === "NON_SCORABLE" ? "NON_SCORABLE" : "FINALIZED",
      failureReason: null,
    },
  });
  await tx.pssaFormResponse.update({
    where: { id: input.responseId },
    data: responseUpdateForDecision(loaded, input.decision),
  });

  // Read-side derivation proof only. #36-2a deliberately does not write PssaFormSession totals.
  summarizePssaResponseBuckets({
    form: { items: loaded.session.form.items },
    responses: loaded.session.responses.map((response) => response.id === input.responseId
      ? { ...response, ...responseUpdateForDecision(loaded, input.decision) }
      : response),
  });

  return finalizeResult(kind === "TEACHER_FINAL" ? "finalized" : "overridden", attempt.id, actualToken);
}

function responseUpdateForDecision(loaded: LoadedWritingResponse, decision: Decision) {
  if (decision.kind === "SCORE") {
    assertScoreMapping(loaded, decision.score);
    return { pointsEarned: decision.score, scoreStatus: "scored" as const, conditionCode: null };
  }
  if (!NON_SCORABLE_REASONS.has(decision.reason)) throw new DiagnosticWritingFinalizeError(422, "unsupported_non_scorable_reason");
  return { pointsEarned: 0, scoreStatus: "scored" as const, conditionCode: decision.reason };
}

function assertScoreMapping(loaded: LoadedWritingResponse, score: number) {
  if (!Number.isInteger(score)) throw new DiagnosticWritingFinalizeError(422, "score_not_integer");
  const type = loaded.formItem.item.interactionType === "TDA" ? "TDA" : "SHORT_ANSWER";
  if (type === "SHORT_ANSWER" && (loaded.maxPoints !== 3 || score < 0 || score > 3)) throw new DiagnosticWritingFinalizeError(422, "unsupported_score_mapping");
  if (type === "TDA" && (loaded.maxPoints !== 4 || score < 1 || score > 4)) throw new DiagnosticWritingFinalizeError(422, "unsupported_score_mapping");
}

async function createTeacherAttempt(tx: Prisma.TransactionClient, input: {
  evaluationId: string;
  attemptIdempotencyKey: string;
  kind: "TEACHER_FINAL" | "TEACHER_OVERRIDE";
  inputHash: string;
  responseHash: string;
  decision: Decision;
  rationale: string | null;
  instructionalProfileJson: Prisma.InputJsonValue | null;
  teacherUserId: string;
  overrideReason?: string | null;
}) {
  const last = await tx.pssaWritingEvaluationAttempt.findFirst({
    where: { evaluationId: input.evaluationId },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true },
  });
  return tx.pssaWritingEvaluationAttempt.create({
    data: {
      evaluationId: input.evaluationId,
      attemptNumber: (last?.attemptNumber ?? 0) + 1,
      kind: input.kind,
      attemptIdempotencyKey: input.attemptIdempotencyKey,
      inputHash: input.inputHash,
      responseHash: input.responseHash,
      score: input.decision.kind === "SCORE" ? input.decision.score : null,
      nonScorableReason: input.decision.kind === "NON_SCORABLE" ? input.decision.reason : null,
      rationale: input.rationale,
      instructionalProfileJson: input.instructionalProfileJson,
      scorerVersion: TEACHER_SCORER_VERSION,
      promptKey: TEACHER_PROMPT_KEY,
      modelId: null,
      reviewedByUserId: input.teacherUserId,
      reviewedAt: new Date(),
      overrideReason: input.kind === "TEACHER_OVERRIDE" ? normalizeOptional(input.overrideReason) : null,
    },
  });
}

function officialAttemptContent(loaded: LoadedWritingResponse, evaluation: LoadedEvaluation, input: FinalizeWritingInput) {
  if (input.decision.kind === "NON_SCORABLE") {
    if (input.decision.reason === "OTHER" && !normalizeOptional(input.teacherNote)) throw new DiagnosticWritingFinalizeError(422, "other_requires_teacher_note");
    return { rationale: normalizeOptional(input.teacherNote) ?? normalizeOptional(input.overrideReason) ?? input.decision.reason, instructionalProfileJson: null };
  }
  const draft = evaluation.currentDraftAttempt;
  if (draft && draft.inputHash === evaluation.currentInputHash && draft.score === input.decision.score) {
    const type = loaded.formItem.item.interactionType === "TDA" ? "TDA" : "SHORT_ANSWER";
    const areaIds = type === "TDA"
      ? ["task_and_controlling_idea", "text_evidence", "analysis_and_explanation", "organization_and_cohesion", "language_and_conventions"]
      : ["completeness", "accuracy", "text_support", "explanation_clarity"];
    const profile = draft.instructionalProfileJson == null ? null : validateInstructionalProfile(draft.instructionalProfileJson, responseText(loaded.responsePayloadJson), areaIds);
    return { rationale: draft.rationale ?? null, instructionalProfileJson: profile as unknown as Prisma.InputJsonValue };
  }
  return { rationale: normalizeOptional(input.teacherNote) ?? normalizeOptional(input.overrideReason) ?? null, instructionalProfileJson: null };
}

async function assertTeacherOwnsCase(tx: Prisma.TransactionClient, input: FinalizeWritingInput & { responseId: string }) {
  const response = await tx.pssaFormResponse.findUnique({
    where: { id: input.responseId },
    include: { session: true },
  });
  if (!response || response.session.formId !== input.formId) throw new DiagnosticWritingFinalizeError(404, "grading_case_not_found");
  const classRoom = await tx.classRoom.findFirst({
    where: { id: input.classRoomId, teacher: { userId: input.teacherUserId } },
    include: { enrollments: { include: { studentProfile: { select: { userId: true } } } } },
  });
  if (!classRoom) throw new DiagnosticWritingFinalizeError(403, "forbidden");
  if (!classRoom.enrollments.some((enrollment) => enrollment.studentProfile.userId === response.session.userId)) {
    throw new DiagnosticWritingFinalizeError(403, "forbidden");
  }
}

async function lockResponseRows(tx: Prisma.TransactionClient, responseId: string) {
  await tx.$queryRaw`SELECT r.id FROM "PssaFormResponse" r WHERE r.id = ${responseId} FOR UPDATE`;
  await tx.$queryRaw`SELECT s.id FROM "PssaFormSession" s JOIN "PssaFormResponse" r ON r."sessionId" = s.id WHERE r.id = ${responseId} FOR UPDATE`;
  await tx.$queryRaw`SELECT e.id FROM "PssaWritingEvaluation" e WHERE e."responseId" = ${responseId} FOR UPDATE`;
}

function currentInputHashFromLoaded(loaded: LoadedWritingResponse) {
  const snapshot = resolveWritingSnapshot(loaded);
  if (snapshot.ok === false) throw new DiagnosticWritingFinalizeError(409, snapshot.failureReason);
  const input = buildWritingInputState(loaded, snapshot);
  return input.inputHash;
}

function concurrencyToken(value: { caseId: string; classRoomId: string; formId: string; currentInputHash: string; currentFinalAttemptId: string | null }) {
  return sha256(stableStringify(value));
}

function canonicalRequestHash(value: {
  teacherUserId: string;
  evaluationId: string;
  inputHash: string;
  decision: Decision;
  overrideReason?: string | null;
  teacherNote?: string | null;
  reviewedRationaleProfileHash: string;
}) {
  return sha256(stableStringify({
    teacherUserId: value.teacherUserId,
    evaluationId: value.evaluationId,
    inputHash: value.inputHash,
    decision: value.decision,
    overrideReason: normalizeOptional(value.overrideReason),
    teacherNote: normalizeOptional(value.teacherNote),
    reviewedRationaleProfileHash: value.reviewedRationaleProfileHash,
  }));
}

function parseCaseId(caseId: string) {
  const match = /^diagnostic:([A-Za-z0-9_-]+)$/.exec(caseId);
  if (!match) throw new DiagnosticWritingFinalizeError(400, "invalid_case_id");
  return match[1];
}

function finalizeResult(status: string, attemptId: string | null, concurrencyTokenValue: string) {
  return { status, attemptId, concurrencyToken: concurrencyTokenValue };
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

type LoadedEvaluation = NonNullable<Awaited<ReturnType<Prisma.TransactionClient["pssaWritingEvaluation"]["findUnique"]>>> & {
  currentDraftAttempt?: { inputHash: string; score: number | null; rationale: string | null; instructionalProfileJson: unknown } | null;
};

type LoadedWritingResponse = NonNullable<Awaited<ReturnType<typeof loadWritingResponseForFinalize>>>;

async function loadWritingResponseForFinalize(database: Database, responseId: string) {
  return database.pssaFormResponse.findUnique({
    where: { id: responseId },
    include: {
      session: {
        include: {
          form: {
            include: {
              items: true,
              passages: { include: { passage: true } },
            },
          },
          responses: true,
        },
      },
      formItem: {
        include: {
          item: { include: { passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } } } },
          form: { include: { passages: { include: { passage: true } } } },
        },
      },
    },
  });
}

function responseText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return typeof row.shortResponse === "string" ? row.shortResponse : typeof row.essay === "string" ? row.essay : "";
}
