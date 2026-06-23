import crypto from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

export const PSSA_WRITING_SCORER_VERSION = "pssa-writing-draft-v1";
export const PSSA_WRITING_SHORT_ANSWER_PROMPT_KEY = "pssa-g3-short-answer-draft-v1";
export const PSSA_WRITING_TDA_PROMPT_KEY = "pssa-tda-draft-v1";
export const PSSA_SHORT_ANSWER_HEURISTIC_MODEL_ID = "pssa-short-answer-heuristic-v1";

const G3_PROFILE_AREAS = ["completeness", "accuracy", "text_support", "explanation_clarity"] as const;
const TDA_PROFILE_AREAS = ["task_and_controlling_idea", "text_evidence", "analysis_and_explanation", "organization_and_cohesion", "language_and_conventions"] as const;
const PROFILE_SIGNALS = new Set(["clear", "emerging", "needs_support", "limited_evidence"]);

export type WritingProfileSignal = "clear" | "emerging" | "needs_support" | "limited_evidence";
export type WritingProfileArea = {
  areaId: string;
  signal: WritingProfileSignal;
  observation: string;
  responseExcerpt?: string;
  teachingMove: string;
};

export type WritingDraftResult =
  | {
      ok: true;
      score: number;
      rationale: string;
      instructionalProfile: WritingProfileArea[];
      nonScorableReason?: "BLANK" | "REFUSAL" | "OFF_TOPIC" | "COPIED" | "OTHER";
      modelId?: string;
      anchorSetVersion?: string;
    }
  | { ok: false; failureReason: string };

type Database = PrismaClient | Prisma.TransactionClient;

type LoadedWritingResponse = {
  id: string;
  responsePayloadJson: unknown;
  scoreStatus: string;
  pointsEarned: number | null;
  maxPoints: number;
  detail: string;
  session: {
    id: string;
    status: string;
    submittedAt: Date | null;
    formId: string;
    form: { id: string; gradeLevel: number };
  };
  formItem: {
    id: string;
    approvedContentHashSnapshot: string;
    passageIdSnapshot: string | null;
    pointValue: number;
    item: {
      id: string;
      interactionType: string;
      contentHash: string;
      responseSpecJson: unknown;
      scoringJson: unknown;
      licenseStatus: string;
      commercialUseAllowed: boolean;
      needsLegalReview: boolean;
      passages: Array<{ passage: PassageRow }>;
    };
    form: {
      passages: Array<{
        passageId: string;
        approvedPassageContentHashSnapshot: string;
        passage: PassageRow;
      }>;
    };
  };
};

type PassageRow = {
  id: string;
  title: string;
  text: string;
  contentHash: string;
  licenseStatus: string;
  commercialUseAllowed: boolean;
  needsLegalReview: boolean;
};

export async function preparePssaWritingEvaluationForResponse(database: Database, responseId: string, opts: { enqueue?: boolean } = {}) {
  const enqueue = opts.enqueue ?? true;
  const existing = await database.pssaWritingEvaluation.findUnique({
    where: { responseId },
    select: { id: true, status: true },
  });
  if (existing && isTerminalWritingEvaluationStatus(existing.status)) {
    return { enqueued: false, reason: "already_finalized", evaluationId: existing.id };
  }
  const loaded = await loadWritingResponse(database, responseId);
  if (!loaded) return { enqueued: false, reason: "response_not_found" };
  if (!isEligibleWritingResponse(loaded)) return { enqueued: false, reason: "not_eligible" };

  const snapshot = resolveWritingSnapshot(loaded);
  if (snapshot.ok === false) {
    const evaluation = await upsertFailedEvaluation(database, loaded, snapshot.failureReason);
    return { enqueued: false, reason: snapshot.failureReason, evaluationId: evaluation.id };
  }

  const input = buildWritingInputState(loaded, snapshot);
  const responseText = extractResponseText(loaded.responsePayloadJson);
  if (!responseText.trim()) {
    const evaluation = await upsertEvaluation(database, loaded, input, "PENDING");
    return { enqueued: false, reason: "blank_response", evaluationId: evaluation.id };
  }

  const evaluation = await upsertEvaluation(database, loaded, input, "PENDING");
  if (!enqueue) return { enqueued: false, evaluationId: evaluation.id };
  const jobKey = writingJobKey(loaded.id, input.inputHash);
  const job = await database.pssaWritingGradingJob.upsert({
    where: { jobKey },
    update: {},
    create: {
      evaluationId: evaluation.id,
      responseId: loaded.id,
      inputHash: input.inputHash,
      jobKey,
    },
  });
  return { enqueued: true, evaluationId: evaluation.id, jobId: job.id, jobKey };
}

export async function backfillPssaWritingGradingJobs(database: Database) {
  const responses = await database.pssaFormResponse.findMany({
    where: {
      scoreStatus: "pending_human_scoring",
      session: { status: "submitted", submittedAt: { not: null } },
      item: { interactionType: { in: ["SHORT_ANSWER", "TDA"] } },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const results = [];
  for (const response of responses) results.push(await preparePssaWritingEvaluationForResponse(database, response.id));
  return { scanned: responses.length, results };
}

export async function processPssaWritingGradingJob(database: PrismaClient, jobId: string, grader: (input: PssaWritingGradeInput) => Promise<WritingDraftResult> = gradePssaWritingResponse) {
  const claim = await claimWritingGradingJob(database, jobId);
  if (claim.claimed === false) return claim.job;
  const job = claim.job;
  try {
    const loaded = await loadWritingResponse(database, job.responseId);
    if (!loaded) throw new Error("response_not_found");
    const snapshot = resolveWritingSnapshot(loaded);
    if (snapshot.ok === false) throw new Error(snapshot.failureReason);
    const input = buildWritingInputState(loaded, snapshot);
    if (input.inputHash !== job.inputHash) throw new Error("stale_job_input");
    if (job.evaluation.currentInputHash !== input.inputHash) throw new Error("stale_evaluation_input");

    const gradeInput = buildGradeInput(loaded, snapshot, input);
    const draft = await grader(gradeInput);
    if (draft.ok === false) throw new Error(draft.failureReason);
    assertScoreRange(gradeInput, draft.score);
    const profile = validateInstructionalProfile(draft.instructionalProfile, gradeInput.responseText, gradeInput.profileAreaIds);
    return commitWritingDraftResult(database, job, {
      evaluationId: job.evaluationId,
      inputHash: input.inputHash,
      responseHash: input.responseHash,
      score: draft.score,
      rationale: draft.rationale,
      instructionalProfile: profile,
      scorerVersion: PSSA_WRITING_SCORER_VERSION,
      promptKey: gradeInput.promptKey,
      modelId: draft.modelId,
      anchorSetVersion: draft.anchorSetVersion,
      nonScorableReason: draft.nonScorableReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "writing_grading_failed";
    await failWritingGradingJob(database, job, message);
    throw error;
  }
}

type ClaimedWritingJob = Prisma.PssaWritingGradingJobGetPayload<{ include: { evaluation: true } }>;

async function claimWritingGradingJob(database: PrismaClient, jobId: string): Promise<{ claimed: true; job: ClaimedWritingJob } | { claimed: false; job: ClaimedWritingJob }> {
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PssaWritingGradingJob" WHERE id = ${jobId} FOR UPDATE`;
    const lockedJob = await tx.pssaWritingGradingJob.findUnique({
      where: { id: jobId },
      include: { evaluation: true },
    });
    if (!lockedJob) throw new Error("writing_grading_job_not_found");
    await tx.$queryRaw`SELECT id FROM "PssaWritingEvaluation" WHERE id = ${lockedJob.evaluationId} FOR UPDATE`;
    const job = await tx.pssaWritingGradingJob.findUnique({
      where: { id: jobId },
      include: { evaluation: true },
    });
    if (!job) throw new Error("writing_grading_job_not_found");
    if (job.status === "COMPLETED" || isTerminalWritingEvaluationStatus(job.evaluation.status)) {
      const completed = await tx.pssaWritingGradingJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date(), lastError: null },
        include: { evaluation: true },
      });
      return { claimed: false, job: completed };
    }
    const claimed = await tx.pssaWritingGradingJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 }, lastError: null },
      include: { evaluation: true },
    });
    return { claimed: true, job: claimed };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function commitWritingDraftResult(database: PrismaClient, job: ClaimedWritingJob, input: Parameters<typeof createOrReuseAiDraftAttempt>[1]) {
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PssaWritingGradingJob" WHERE id = ${job.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "PssaWritingEvaluation" WHERE id = ${job.evaluationId} FOR UPDATE`;
    const evaluation = await tx.pssaWritingEvaluation.findUnique({
      where: { id: job.evaluationId },
      select: { status: true, currentInputHash: true },
    });
    if (!evaluation) throw new Error("writing_evaluation_not_found");
    if (isTerminalWritingEvaluationStatus(evaluation.status)) {
      return tx.pssaWritingGradingJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date(), lastError: null },
      });
    }
    if (evaluation.currentInputHash !== input.inputHash) throw new Error("stale_evaluation_input");
    const attempt = await createOrReuseAiDraftAttempt(tx, input);
    await tx.pssaWritingEvaluation.updateMany({
      where: { id: job.evaluationId, currentInputHash: input.inputHash, status: { notIn: ["FINALIZED", "NON_SCORABLE"] } },
      data: { currentDraftAttemptId: attempt.id, status: "DRAFTED", failureReason: null },
    });
    return tx.pssaWritingGradingJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date(), lastError: null },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function failWritingGradingJob(database: PrismaClient, job: ClaimedWritingJob, message: string) {
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PssaWritingGradingJob" WHERE id = ${job.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "PssaWritingEvaluation" WHERE id = ${job.evaluationId} FOR UPDATE`;
    const evaluation = await tx.pssaWritingEvaluation.findUnique({
      where: { id: job.evaluationId },
      select: { status: true, currentInputHash: true },
    });
    if (evaluation && !isTerminalWritingEvaluationStatus(evaluation.status)) {
      await tx.pssaWritingEvaluation.updateMany({
        where: { id: job.evaluationId, currentInputHash: job.inputHash, status: { notIn: ["FINALIZED", "NON_SCORABLE"] } },
        data: { status: "FAILED", failureReason: message },
      });
    }
    return tx.pssaWritingGradingJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: message },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function isTerminalWritingEvaluationStatus(status: string) {
  return status === "FINALIZED" || status === "NON_SCORABLE";
}

export type PssaWritingGradeInput = {
  responseId: string;
  gradeLevel: number;
  interactionType: "SHORT_ANSWER" | "TDA";
  responseText: string;
  prompt: string;
  passage: string;
  rubricId: string;
  rubricVersion: string;
  rubricJson: unknown;
  promptKey: string;
  inputHash: string;
  profileAreaIds: readonly string[];
};

export async function gradePssaWritingResponse(input: PssaWritingGradeInput): Promise<WritingDraftResult> {
  if (input.interactionType === "SHORT_ANSWER") return gradePssaShortAnswer(input);
  return gradePssaTdaDraft(input);
}

export async function gradePssaShortAnswer(input: PssaWritingGradeInput): Promise<WritingDraftResult> {
  if (process.env.PSSA_WRITING_ALLOW_LOCAL_GRADER !== "1") {
    return { ok: false, failureReason: "grader_unavailable" };
  }
  const words = input.responseText.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { ok: false, failureReason: "blank_response" };
  const lower = input.responseText.toLowerCase();
  const supportWords = ["because", "text", "story", "passage", "shows", "says", "detail", "evidence", "character"].filter((word) => lower.includes(word)).length;
  const score = Math.max(0, Math.min(3, (words.length >= 8 ? 1 : 0) + (words.length >= 16 ? 1 : 0) + (supportWords >= 1 ? 1 : 0)));
  return {
    ok: true,
    score,
    rationale: "Draft score based on answer completeness, accuracy signals, and text-support language for teacher review.",
    instructionalProfile: [
      area("completeness", words.length >= 16 ? "clear" : "emerging", "The response gives an answer, but may need more complete development.", input.responseText, "Ask the student to restate the answer in a complete sentence."),
      area("accuracy", "emerging", "The draft should be checked against the item-specific rubric before final scoring.", undefined, "Compare the answer to the expected answer core."),
      area("text_support", supportWords >= 1 ? "emerging" : "needs_support", "Text support language is limited or emerging.", excerpt(input.responseText), "Prompt for one detail from the passage."),
      area("explanation_clarity", words.length >= 16 ? "emerging" : "needs_support", "The explanation may need clearer reasoning.", undefined, "Have the student explain how the detail proves the answer."),
    ],
    modelId: PSSA_SHORT_ANSWER_HEURISTIC_MODEL_ID,
  };
}

export async function gradePssaTdaDraft(_input: PssaWritingGradeInput): Promise<WritingDraftResult> {
  return { ok: false, failureReason: "tda_anchor_set_unlicensed" };
}

export function buildWritingInputState(loaded: LoadedWritingResponse, snapshot: Extract<ReturnType<typeof resolveWritingSnapshot>, { ok: true }>) {
  const responseHash = sha256(stableStringify(loaded.responsePayloadJson));
  const promptHash = snapshot.itemContentHash;
  const rubricContentHash = snapshot.itemContentHash;
  const passageContentHash = snapshot.passageContentHash;
  const rubricId = loaded.formItem.item.id;
  const rubricVersion = loaded.formItem.approvedContentHashSnapshot;
  const promptKey = loaded.formItem.item.interactionType === "TDA" ? PSSA_WRITING_TDA_PROMPT_KEY : PSSA_WRITING_SHORT_ANSWER_PROMPT_KEY;
  const anchorSetVersion = loaded.formItem.item.interactionType === "TDA" ? null : null;
  const anchorSetContentHash = loaded.formItem.item.interactionType === "TDA" ? null : null;
  const inputHash = sha256(stableStringify({
    responseId: loaded.id,
    responseHash,
    promptHash,
    passageContentHash,
    rubricId,
    rubricVersion,
    rubricContentHash,
    scorerVersion: PSSA_WRITING_SCORER_VERSION,
    promptKey,
    anchorSetVersion,
    anchorSetContentHash,
  }));
  return { responseHash, promptHash, rubricContentHash, passageContentHash, rubricId, rubricVersion, anchorSetContentHash, inputHash, promptKey };
}

export function resolveWritingSnapshot(loaded: LoadedWritingResponse):
  | { ok: true; passage: PassageRow; itemContentHash: string; passageContentHash: string }
  | { ok: false; failureReason: string } {
  const item = loaded.formItem.item;
  if (item.contentHash !== loaded.formItem.approvedContentHashSnapshot) return { ok: false, failureReason: "snapshot_item_hash_drift" };
  const passageId = loaded.formItem.passageIdSnapshot;
  if (!passageId) return { ok: false, failureReason: "missing_passage_snapshot" };
  const formPassage = loaded.formItem.form.passages.find((row) => row.passageId === passageId);
  if (!formPassage) return { ok: false, failureReason: "missing_form_passage_snapshot" };
  if (formPassage.passage.contentHash !== formPassage.approvedPassageContentHashSnapshot) return { ok: false, failureReason: "snapshot_passage_hash_drift" };
  if (!isCommerciallyUsable(item) || !isCommerciallyUsable(formPassage.passage)) return { ok: false, failureReason: "license_not_cleared" };
  return { ok: true, passage: formPassage.passage, itemContentHash: loaded.formItem.approvedContentHashSnapshot, passageContentHash: formPassage.approvedPassageContentHashSnapshot };
}

export function validateInstructionalProfile(value: unknown, responseText: string, allowedAreaIds: readonly string[]) {
  if (!Array.isArray(value)) throw new Error("profile_malformed");
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("profile_malformed");
    const row = entry as Record<string, unknown>;
    const allowedKeys = new Set(["areaId", "signal", "observation", "responseExcerpt", "teachingMove"]);
    for (const key of Object.keys(row)) {
      if (!allowedKeys.has(key)) throw new Error("profile_malformed");
    }
    const areaId = stringField(row.areaId, "areaId", 64);
    if (!allowedAreaIds.includes(areaId)) throw new Error("profile_unknown_area");
    if (seen.has(areaId)) throw new Error("profile_duplicate_area");
    seen.add(areaId);
    const signal = stringField(row.signal, "signal", 32) as WritingProfileSignal;
    if (!PROFILE_SIGNALS.has(signal)) throw new Error("profile_bad_signal");
    const responseExcerpt = row.responseExcerpt == null ? undefined : stringField(row.responseExcerpt, "responseExcerpt", 240);
    if (responseExcerpt && !normalize(responseText).includes(normalize(responseExcerpt))) throw new Error("profile_excerpt_not_in_response");
    return {
      areaId,
      signal,
      observation: stringField(row.observation, "observation", 320),
      ...(responseExcerpt ? { responseExcerpt } : {}),
      teachingMove: stringField(row.teachingMove, "teachingMove", 320),
    };
  });
}

export function assertScoreRange(input: PssaWritingGradeInput, score: unknown) {
  if (!Number.isInteger(score)) throw new Error("score_not_integer");
  const numericScore = score as number;
  if (input.interactionType === "SHORT_ANSWER" && (numericScore < 0 || numericScore > 3)) throw new Error("score_out_of_range");
  if (input.interactionType === "TDA" && (numericScore < 1 || numericScore > 4)) throw new Error("score_out_of_range");
}

export function writingJobKey(responseId: string, inputHash: string) {
  return `pssa-writing:${responseId}:${inputHash}`;
}

export function sha256(value: string) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

async function loadWritingResponse(database: Database, responseId: string): Promise<LoadedWritingResponse | null> {
  return database.pssaFormResponse.findUnique({
    where: { id: responseId },
    include: {
      session: { include: { form: { select: { id: true, gradeLevel: true } } } },
      formItem: {
        include: {
          item: { include: { passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } } } },
          form: { include: { passages: { include: { passage: true } } } },
        },
      },
    },
  }) as Promise<LoadedWritingResponse | null>;
}

function isEligibleWritingResponse(loaded: LoadedWritingResponse) {
  return Boolean(
    loaded.session.status === "submitted"
    && loaded.session.submittedAt
    && loaded.scoreStatus === "pending_human_scoring"
    && ["SHORT_ANSWER", "TDA"].includes(loaded.formItem.item.interactionType),
  );
}

async function upsertFailedEvaluation(database: Database, loaded: LoadedWritingResponse, failureReason: string) {
  const fallback = {
    responseHash: sha256(stableStringify(loaded.responsePayloadJson)),
    rubricId: loaded.formItem.item.id,
    rubricVersion: loaded.formItem.approvedContentHashSnapshot,
    rubricContentHash: loaded.formItem.approvedContentHashSnapshot,
    inputHash: sha256(`failed:${loaded.id}:${failureReason}`),
    promptHash: loaded.formItem.approvedContentHashSnapshot,
    passageContentHash: loaded.formItem.passageIdSnapshot ?? "missing",
    anchorSetContentHash: null,
    promptKey: loaded.formItem.item.interactionType === "TDA" ? PSSA_WRITING_TDA_PROMPT_KEY : PSSA_WRITING_SHORT_ANSWER_PROMPT_KEY,
  };
  return upsertEvaluation(database, loaded, fallback, "FAILED", failureReason);
}

async function upsertEvaluation(database: Database, loaded: LoadedWritingResponse, input: ReturnType<typeof buildWritingInputState>, status: "PENDING" | "FAILED", failureReason: string | null = null) {
  return database.pssaWritingEvaluation.upsert({
    where: { responseId: loaded.id },
    update: {
      responseHash: input.responseHash,
      rubricId: input.rubricId,
      rubricVersion: input.rubricVersion,
      rubricContentHash: input.rubricContentHash,
      currentInputHash: input.inputHash,
      promptHash: input.promptHash,
      passageContentHash: input.passageContentHash,
      anchorSetContentHash: input.anchorSetContentHash,
      status,
      failureReason,
    },
    create: {
      responseId: loaded.id,
      responseHash: input.responseHash,
      rubricId: input.rubricId,
      rubricVersion: input.rubricVersion,
      rubricContentHash: input.rubricContentHash,
      currentInputHash: input.inputHash,
      promptHash: input.promptHash,
      passageContentHash: input.passageContentHash,
      anchorSetContentHash: input.anchorSetContentHash,
      status,
      failureReason,
    },
  });
}

function buildGradeInput(loaded: LoadedWritingResponse, snapshot: Extract<ReturnType<typeof resolveWritingSnapshot>, { ok: true }>, input: ReturnType<typeof buildWritingInputState>): PssaWritingGradeInput {
  const interactionType = loaded.formItem.item.interactionType === "TDA" ? "TDA" : "SHORT_ANSWER";
  return {
    responseId: loaded.id,
    gradeLevel: loaded.session.form.gradeLevel,
    interactionType,
    responseText: extractResponseText(loaded.responsePayloadJson),
    prompt: promptText(loaded.formItem.item.responseSpecJson),
    passage: snapshot.passage.text,
    rubricId: input.rubricId,
    rubricVersion: input.rubricVersion,
    rubricJson: loaded.formItem.item.scoringJson,
    promptKey: input.promptKey,
    inputHash: input.inputHash,
    profileAreaIds: interactionType === "TDA" ? TDA_PROFILE_AREAS : G3_PROFILE_AREAS,
  };
}

async function createOrReuseAiDraftAttempt(database: Database, input: {
  evaluationId: string;
  inputHash: string;
  responseHash: string;
  score: number;
  rationale: string;
  instructionalProfile: WritingProfileArea[];
  scorerVersion: string;
  promptKey: string;
  modelId?: string;
  anchorSetVersion?: string;
  nonScorableReason?: "BLANK" | "REFUSAL" | "OFF_TOPIC" | "COPIED" | "OTHER";
}) {
  const attemptIdempotencyKey = `ai:${input.evaluationId}:${input.inputHash}`;
  const existing = await database.pssaWritingEvaluationAttempt.findUnique({ where: { attemptIdempotencyKey } });
  if (existing) return existing;
  for (let index = 0; index < 3; index++) {
    const last = await database.pssaWritingEvaluationAttempt.findFirst({
      where: { evaluationId: input.evaluationId },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });
    try {
      return await database.pssaWritingEvaluationAttempt.create({
        data: {
          evaluationId: input.evaluationId,
          attemptNumber: (last?.attemptNumber ?? 0) + 1,
          kind: "AI_DRAFT",
          attemptIdempotencyKey,
          inputHash: input.inputHash,
          responseHash: input.responseHash,
          score: input.score,
          nonScorableReason: input.nonScorableReason,
          rationale: input.rationale,
          instructionalProfileJson: input.instructionalProfile as unknown as Prisma.InputJsonValue,
          scorerVersion: input.scorerVersion,
          promptKey: input.promptKey,
          modelId: input.modelId,
          anchorSetVersion: input.anchorSetVersion,
        },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
  }
  const raced = await database.pssaWritingEvaluationAttempt.findUnique({ where: { attemptIdempotencyKey } });
  if (raced) return raced;
  throw new Error("attempt_number_conflict");
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as Record<string, unknown>).shortResponse ?? (payload as Record<string, unknown>).essay;
  return typeof value === "string" ? value : "";
}

function promptText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return [row.stem, row.instructionText].filter((part): part is string => typeof part === "string").join("\n\n");
}

function isCommerciallyUsable(row: { licenseStatus: string; commercialUseAllowed: boolean; needsLegalReview: boolean }) {
  return row.licenseStatus === "cleared" && row.commercialUseAllowed === true && row.needsLegalReview === false;
}

function area(areaId: string, signal: WritingProfileSignal, observation: string, responseText: string | undefined, teachingMove: string): WritingProfileArea {
  return { areaId, signal, observation, ...(responseText ? { responseExcerpt: excerpt(responseText) } : {}), teachingMove };
}

function excerpt(text: string) {
  return text.trim().split(/\s+/).slice(0, 12).join(" ");
}

function stringField(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${label}_missing`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) throw new Error(`${label}_invalid`);
  return trimmed;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
