import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assertScoreRange,
  gradePssaShortAnswer,
  PSSA_SHORT_ANSWER_HEURISTIC_MODEL_ID,
  stableStringify,
  validateInstructionalProfile,
  writingJobKey,
} from "../../lib/content/pssaWritingGrading";
import { assertNoBannedGradingCaseKeys, buildDiagnosticGradingCase } from "../../lib/teacher/gradingCaseDtoCore";

const read = (path: string) => fs.readFileSync(path, "utf8");

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260622133000_pssa_writing_evaluation_backend/migration.sql");
const grading = read("lib/content/pssaWritingGrading.ts");
const session = read("lib/content/pssaFormSession.ts");
const dto = read("lib/teacher/gradingCaseDto.ts");
const dtoCore = read("lib/teacher/gradingCaseDtoCore.ts");
const route = read("app/api/teacher/grading-cases/route.ts");

assert.match(schema, /model PssaWritingEvaluation[\s\S]*currentInputHash\s+String/, "evaluation must persist currentInputHash");
assert.match(schema, /model PssaWritingEvaluation[\s\S]*currentFinalAttemptId\s+String\?\s+@unique/, "#36-2 currentFinalAttemptId field must be precreated");
assert.match(schema, /model PssaWritingEvaluationAttempt[\s\S]*attemptIdempotencyKey\s+String\s+@unique/, "attemptIdempotencyKey must be unique");
assert.match(schema, /model PssaWritingEvaluationAttempt[\s\S]*reviewedByUserId\s+String\?[\s\S]*overrideReason\s+String\?[\s\S]*reviewedAt\s+DateTime\?/, "#36-2 audit fields must be present");
assert.match(schema, /reviewedByUser\s+User\?\s+@relation\("reviewedByUser"/, "reviewedByUser relation must be named");
assert.doesNotMatch(schema, /@@unique\(\[evaluationId,\s*kind,\s*inputHash\]\)/, "teacher overrides must not be blocked by composite unique");
assert.match(schema, /@@index\(\[evaluationId,\s*kind,\s*inputHash\]\)/, "attempt kind/input lookup must be indexed");
assert.match(schema, /model PssaWritingGradingJob[\s\S]*jobKey\s+String\s+@unique/, "dedicated diagnostic writing job table must have unique jobKey");
assert.match(migration, /CREATE TABLE "PssaWritingEvaluation"/, "migration must create evaluation table");
assert.match(migration, /CREATE TABLE "PssaWritingEvaluationAttempt"/, "migration must create attempt table");
assert.match(migration, /CREATE TABLE "PssaWritingGradingJob"/, "migration must create dedicated job table");

assert.match(grading, /rubricId = loaded\.formItem\.item\.id/, "rubricId must be itemId");
assert.match(grading, /rubricVersion = loaded\.formItem\.approvedContentHashSnapshot/, "rubricVersion must be approvedContentHashSnapshot");
assert.match(grading, /item\.contentHash !== loaded\.formItem\.approvedContentHashSnapshot/, "item snapshot drift must fail closed");
assert.match(grading, /formPassage\.passage\.contentHash !== formPassage\.approvedPassageContentHashSnapshot/, "passage snapshot drift must fail closed");
assert.match(grading, /license_not_cleared/, "passage/item license gate must exist");
assert.match(grading, /pssa-writing:\$\{responseId\}:\$\{inputHash\}/, "jobKey must include responseId and inputHash");
assert.match(grading, /attemptIdempotencyKey = `ai:\$\{input\.evaluationId\}:\$\{input\.inputHash\}`/, "AI attempt idempotency key must be evaluation+input");
assert.match(grading, /where:\s*\{\s*id: job\.evaluationId,\s*currentInputHash: input\.inputHash\s*\}/, "draft pointer update must be stale-input guarded");
assert.match(grading, /gradePssaShortAnswer/, "short-answer dispatcher path must exist");
assert.match(grading, /gradePssaTdaDraft/, "TDA dispatcher path must exist");
assert.match(grading, /tda_anchor_set_unlicensed/, "existing TDA anchors must fail closed until licensed");
assert.match(grading, /PSSA_WRITING_ALLOW_LOCAL_GRADER !== "1"[\s\S]*grader_unavailable/, "heuristic grader must require explicit local flag in every environment");
assert.doesNotMatch(grading, /OPENAI_API_KEY \? "external-writing-grader"|local-deterministic-dev|model_unavailable/, "OPENAI_API_KEY must not enable or relabel the heuristic grader");
assert.match(grading, /modelId: PSSA_SHORT_ANSWER_HEURISTIC_MODEL_ID/, "heuristic grader must identify itself honestly");
assert.match(grading, /modelId: draft\.modelId/, "injected external grader model identity must be recorded from the grader result");
assert.doesNotMatch(grading, /gradeRecord|learningAssignment/i, "#36-1 grading backend must not write gradebook tables");
assert.doesNotMatch(grading, /status:\s*"FINALIZED"|status:\s*"NON_SCORABLE"/, "AI draft processing must never finalize");

assert.match(session, /preparePssaWritingEvaluationForResponse/, "diagnostic submit must enqueue writing grading best-effort");
assert.match(session, /catch\s*\{[\s\S]*Best effort only/, "enqueue failures must not fail submit");
assert.doesNotMatch(session, /pointsEarned:\s*essay|scoreStatus:\s*"scored"|pendingHumanPoints:\s*0/, "submit wiring must not mutate writing score fields");

assert.match(route, /requireUser\(\["TEACHER"\]\)/, "grading-case route must be teacher-only");
assert.match(dto, /where:\s*\{\s*id: input\.classRoomId,\s*teacher:\s*\{\s*userId/, "DTO loader must verify class ownership from session user");
assert.match(dto, /scoreStatus:\s*"pending_human_scoring"/, "DTO loader must be diagnostic pending-writing scoped");
assert.match(dtoCore, /caseId: `diagnostic:\$\{input\.response\.id\}`/, "DTO must use opaque diagnostic case id");
assert.match(dtoCore, /evaluation\.currentDraftAttempt\.inputHash === evaluation\.currentInputHash/, "DTO must expose only current-input draft");

assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
assert.equal(writingJobKey("r1", "h1"), "pssa-writing:r1:h1");

const goodProfile = [
  { areaId: "completeness", signal: "clear", observation: "Complete enough.", responseExcerpt: "The bell helped", teachingMove: "Ask for one more detail." },
  { areaId: "accuracy", signal: "emerging", observation: "Mostly accurate.", teachingMove: "Check the expected answer." },
];
assert.deepEqual(validateInstructionalProfile(goodProfile, "The bell helped the family find the dog.", ["completeness", "accuracy"])[0]?.areaId, "completeness");
assert.throws(() => validateInstructionalProfile([{ ...goodProfile[0], areaId: "made_up" }], "The bell helped.", ["completeness"]), /profile_unknown_area/);
assert.throws(() => validateInstructionalProfile([goodProfile[0], goodProfile[0]], "The bell helped.", ["completeness"]), /profile_duplicate_area/);
assert.throws(() => validateInstructionalProfile([{ ...goodProfile[0], responseExcerpt: "not in answer" }], "The bell helped.", ["completeness"]), /profile_excerpt_not_in_response/);
assert.throws(() => validateInstructionalProfile([{ ...goodProfile[0], traitScore: 2 }], "The bell helped.", ["completeness"]), /profile_malformed|banned|unknown|duplicate/);

const shortAnswerInput = { interactionType: "SHORT_ANSWER", responseText: "x" } as any;
assert.doesNotThrow(() => assertScoreRange(shortAnswerInput, 0));
assert.doesNotThrow(() => assertScoreRange(shortAnswerInput, 3));
assert.throws(() => assertScoreRange(shortAnswerInput, 4), /score_out_of_range/);
assert.throws(() => assertScoreRange(shortAnswerInput, 2.5), /score_not_integer/);
const tdaInput = { interactionType: "TDA", responseText: "x" } as any;
assert.doesNotThrow(() => assertScoreRange(tdaInput, 1));
assert.doesNotThrow(() => assertScoreRange(tdaInput, 4));
assert.throws(() => assertScoreRange(tdaInput, 0), /score_out_of_range/);

const envBackup = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PSSA_WRITING_ALLOW_LOCAL_GRADER: process.env.PSSA_WRITING_ALLOW_LOCAL_GRADER,
};
const gradeInput = {
  responseId: "response-1",
  gradeLevel: 3,
  interactionType: "SHORT_ANSWER",
  responseText: "The passage says the bell helped because the family could hear it.",
  prompt: "Why did the bell help?",
  passage: "The bell helped the family find the dog.",
  rubricId: "item-1",
  rubricVersion: "item-hash",
  rubricJson: {},
  promptKey: "pssa-g3-short-answer-draft-v1",
  inputHash: "input-hash",
  profileAreaIds: ["completeness", "accuracy", "text_support", "explanation_clarity"],
} as const;
async function checkGraderProvenance() {
  try {
    process.env.OPENAI_API_KEY = "sk-build-dummy";
    delete process.env.PSSA_WRITING_ALLOW_LOCAL_GRADER;
    const unavailable = await gradePssaShortAnswer(gradeInput);
    assert.deepEqual(unavailable, { ok: false, failureReason: "grader_unavailable" }, "OPENAI_API_KEY alone must not enable heuristic grading");

    delete process.env.OPENAI_API_KEY;
    process.env.PSSA_WRITING_ALLOW_LOCAL_GRADER = "1";
    const localDraft = await gradePssaShortAnswer(gradeInput);
    assert.equal(localDraft.ok, true);
    assert.equal(localDraft.modelId, PSSA_SHORT_ANSWER_HEURISTIC_MODEL_ID, "local heuristic must record its own modelId");
  } finally {
    if (envBackup.OPENAI_API_KEY === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = envBackup.OPENAI_API_KEY;
    if (envBackup.PSSA_WRITING_ALLOW_LOCAL_GRADER === undefined) delete process.env.PSSA_WRITING_ALLOW_LOCAL_GRADER;
    else process.env.PSSA_WRITING_ALLOW_LOCAL_GRADER = envBackup.PSSA_WRITING_ALLOW_LOCAL_GRADER;
  }
}

const caseDto = buildDiagnosticGradingCase({
  classRoomId: "class-1",
  concurrencyToken: "opaque-token",
  response: {
    id: "response-1",
    responsePayloadJson: { shortResponse: "The bell helped the family." },
    maxPoints: 3,
    session: { formId: "form-1", user: { name: "Student One" } },
    formItem: { item: { id: "item-1", interactionType: "SHORT_ANSWER", responseSpecJson: { stem: "Why?", instructionText: "Use evidence." } } },
    writingEvaluation: null,
  },
});
assert.equal(caseDto.caseId, "diagnostic:response-1");
assert.equal(caseDto.status, "PENDING");
assert.equal(caseDto.aiDraft, null);
assert.doesNotThrow(() => assertNoBannedGradingCaseKeys(caseDto));
assert.throws(() => assertNoBannedGradingCaseKeys({ ...caseDto, responsePayloadJson: {} }), /banned key responsePayloadJson/);

checkGraderProvenance()
  .then(() => console.log("PSSA writing grading backend checks passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
