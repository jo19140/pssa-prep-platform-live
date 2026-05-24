import fs from "fs";
import path from "path";
import assert from "assert";
import { EVENT_TYPES } from "@/lib/events/eventTypes";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { stableHash } from "@/lib/decisions/withModelDecisionLogging";
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

console.log("data flywheel foundation checks passed");
