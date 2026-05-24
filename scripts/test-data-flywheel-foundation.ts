import fs from "fs";
import path from "path";
import assert from "assert";
import { EVENT_TYPES } from "@/lib/events/eventTypes";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { stableHash } from "@/lib/decisions/withModelDecisionLogging";
import {
  captureDistractorGenerationDecision,
  captureGistGradingDecision,
  captureHeroVideoMatchDecision,
  recordDistractorCriticDecision,
  recordTdaScoringDecision,
} from "@/lib/decisions/instrumentedCallLogging";
import { getPromptTemplate, PROMPT_KEYS } from "@/lib/prompts/registry";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(path.join(root, "prisma/migrations/20260524190000_add_data_flywheel_foundation/migration.sql"), "utf8");

for (const model of ["StudentEvent", "StudentEventOutcome", "ModelDecision", "ModelDecisionOutcome", "EventExportBatch"]) {
  assert(schema.includes(`model ${model}`), `Missing ${model} model`);
  assert(migration.includes(`CREATE TABLE "${model}"`), `Missing ${model} migration table`);
}

assert(schema.includes("generalDataRetained           Boolean                @default(true)"), "VoiceConsent.generalDataRetained default missing");
assert(schema.includes("generalDataRetentionDays      Int                    @default(90)"), "VoiceConsent.generalDataRetentionDays default missing");
assert(migration.includes('"generalDataRetained" BOOLEAN NOT NULL DEFAULT true'), "generalDataRetained SQL default missing");
assert(migration.includes('"generalDataRetentionDays" INTEGER NOT NULL DEFAULT 90'), "generalDataRetentionDays SQL default missing");

assert.equal(EVENT_TYPES.ITEM_ANSWER_SUBMITTED, "ITEM_ANSWER_SUBMITTED");
assert.equal(DECISION_TYPES.TDA_SCORING, "TDA_SCORING");
assert.equal(DECISION_TYPES.DISTRACTOR_GENERATION, "DISTRACTOR_GENERATION");
assert.equal(DECISION_TYPES.DISTRACTOR_CRITIC, "DISTRACTOR_CRITIC");
assert.equal(DECISION_TYPES.GIST_GRADING, "GIST_GRADING");
assert.equal(DECISION_TYPES.HERO_VIDEO_MATCH, "HERO_VIDEO_MATCH");

assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }), "input hash must be stable across key order");
assert(getPromptTemplate(PROMPT_KEYS.TDA_SCORING_V1), "TDA prompt key missing");
assert(getPromptTemplate(PROMPT_KEYS.LESSON_DISTRACTOR_GENERATION_V1), "distractor generation prompt key missing");
assert(getPromptTemplate(PROMPT_KEYS.HERO_VIDEO_MATCH_HEURISTIC_V1), "hero match prompt key missing");

const answerRoute = fs.readFileSync(path.join(root, "app/api/test/answer/route.ts"), "utf8");
assert(answerRoute.includes("ITEM_ANSWER_SUBMITTED"), "answer route must record item answer events");
assert(!answerRoute.includes("response: body.answerPayload"), "answer route must not copy raw answer payload into StudentEvent responseJson");

runInstrumentedCallEqualityFixtures()
  .then(() => {
    console.log("data flywheel foundation checks passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function runInstrumentedCallEqualityFixtures() {
  await assertTdaScoringEquality();
  await assertDistractorGenerationEquality();
  await assertDistractorCriticEquality();
  await assertGistGradingEquality();
  await assertHeroVideoMatchEquality();
}

async function assertTdaScoringEquality() {
  const fakeCompletion = fakeChatCompletion({ score: 3, feedback: "Use one more quoted detail." });
  const run = async () => ({ output: fakeCompletion, metadata: { inferenceMs: 12, inputTokens: 20, outputTokens: 8, costUsd: 0.001 } });
  const unwrapped = (await run()).output;
  const wrapped = await recordTdaScoringDecision({
    modelName: "fake-model",
    gradeLevel: 5,
    essayWordCount: 84,
    promptLength: 120,
    passageLength: 400,
    exemplarGrade: 5,
    run,
    recordDecision: recordWithoutPersistenceFailure,
  });
  const captureFailed = await recordTdaScoringDecision({
    modelName: "fake-model",
    gradeLevel: 5,
    essayWordCount: 84,
    promptLength: 120,
    passageLength: 400,
    exemplarGrade: 5,
    run,
    recordDecision: recordWithForcedPersistenceFailure,
  });
  assert.deepEqual(wrapped, unwrapped, "TDA scoring wrapper must preserve completion output");
  assert.deepEqual(captureFailed, unwrapped, "TDA scoring persistence failure must preserve completion output");
}

async function assertDistractorGenerationEquality() {
  const fakeCompletion = fakeChatCompletion({ lessons: [{ learningPathItemOrder: 1, retestRecommendation: "Review evidence." }] });
  const wrapped = await captureDistractorGenerationDecision({
    modelName: "fake-model",
    gradeLevel: 4,
    lessonCount: 1,
    standardCodes: ["CC.1.2.4.B"],
    skills: ["main idea"],
    output: fakeCompletion,
    metadata: { inferenceMs: 9, inputTokens: 10, outputTokens: 5, costUsd: 0.001 },
    persistDecision: persistSuccessfulDecision,
  });
  const captureFailed = await captureDistractorGenerationDecision({
    modelName: "fake-model",
    gradeLevel: 4,
    lessonCount: 1,
    standardCodes: ["CC.1.2.4.B"],
    skills: ["main idea"],
    output: fakeCompletion,
    metadata: { inferenceMs: 9, inputTokens: 10, outputTokens: 5, costUsd: 0.001 },
    persistDecision: persistFailingDecision,
  });
  assert.deepEqual(wrapped.output, fakeCompletion, "distractor generation wrapper must preserve completion output");
  assert.deepEqual(captureFailed.output, fakeCompletion, "distractor generation persistence failure must preserve completion output");
}

async function assertDistractorCriticEquality() {
  const fakeCompletion = fakeChatCompletion({ status: "approved" });
  const run = async () => ({ output: fakeCompletion, metadata: { inferenceMs: 7, inputTokens: 12, outputTokens: 4, costUsd: 0.001 } });
  const unwrapped = (await run()).output;
  const wrapped = await recordDistractorCriticDecision({
    modelName: "fake-model",
    parentDecisionId: "decision_parent_1",
    gradeLevel: 6,
    standardCode: "CC.1.3.6.A",
    skill: "theme",
    stepCount: 5,
    practiceCounts: { guided: 4, independent: 5, exit: 1, mastery: 3 },
    run,
    recordDecision: recordWithoutPersistenceFailure,
  });
  const captureFailed = await recordDistractorCriticDecision({
    modelName: "fake-model",
    parentDecisionId: "decision_parent_1",
    gradeLevel: 6,
    standardCode: "CC.1.3.6.A",
    skill: "theme",
    stepCount: 5,
    practiceCounts: { guided: 4, independent: 5, exit: 1, mastery: 3 },
    run,
    recordDecision: recordWithForcedPersistenceFailure,
  });
  assert.deepEqual(wrapped, unwrapped, "distractor critic wrapper must preserve completion output");
  assert.deepEqual(captureFailed, unwrapped, "distractor critic persistence failure must preserve completion output");
}

async function assertGistGradingEquality() {
  const scored = { isCorrect: true, scorePointsEarned: 1, maxPoints: 1, errorPattern: "NONE" };
  const wrapped = await captureGistGradingDecision({
    studentEventId: "event_1",
    studentUserId: "student_1",
    assessmentId: "assessment_1",
    responseRecordId: "response_1",
    questionId: 3,
    standardCode: "CC.1.2.5.A",
    questionType: "SHORT_RESPONSE",
    responseWordCount: 18,
    hasSampleAnswer: true,
    output: scored,
    persistDecision: persistSuccessfulDecision,
  });
  const captureFailed = await captureGistGradingDecision({
    studentEventId: "event_1",
    studentUserId: "student_1",
    assessmentId: "assessment_1",
    responseRecordId: "response_1",
    questionId: 3,
    standardCode: "CC.1.2.5.A",
    questionType: "SHORT_RESPONSE",
    responseWordCount: 18,
    hasSampleAnswer: true,
    output: scored,
    persistDecision: persistFailingDecision,
  });
  assert.deepEqual(wrapped, scored, "gist grading wrapper must preserve scored output");
  assert.deepEqual(captureFailed, scored, "gist grading persistence failure must preserve scored output");
}

async function assertHeroVideoMatchEquality() {
  const matchOutput = { matched: true, resourceLinkId: "resource_1", provider: "PBS", tier: "CORE" };
  const wrapped = await captureHeroVideoMatchDecision({
    gradeLevel: 5,
    standardCode: "CC.1.2.5.B",
    skill: "central idea",
    candidateCount: 4,
    output: matchOutput,
    persistDecision: persistSuccessfulDecision,
  });
  const captureFailed = await captureHeroVideoMatchDecision({
    gradeLevel: 5,
    standardCode: "CC.1.2.5.B",
    skill: "central idea",
    candidateCount: 4,
    output: matchOutput,
    persistDecision: persistFailingDecision,
  });
  assert.deepEqual(wrapped, matchOutput, "hero video match wrapper must preserve match output");
  assert.deepEqual(captureFailed, matchOutput, "hero video match persistence failure must preserve match output");
}

function fakeChatCompletion(content: Record<string, unknown>) {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  };
}

async function recordWithoutPersistenceFailure(_ctx: any, fn: any) {
  const result = await fn();
  return result.output;
}

async function recordWithForcedPersistenceFailure(_ctx: any, fn: any) {
  const result = await fn();
  try {
    throw new Error("forced persistence failure");
  } catch {
    return result.output;
  }
}

async function persistSuccessfulDecision() {
  return "decision_1";
}

async function persistFailingDecision(): Promise<string> {
  throw new Error("forced persistence failure");
}
