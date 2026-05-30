import assert from "assert/strict";
import fs from "fs";
import path from "path";
import { dtoLeaksBackendFields, toStudentItemDTO } from "../lib/literacy/diagnosticItemDTO";
import { diagnosticPoolFailures } from "../lib/literacy/diagnosticPoolPreflight";
import { selectNextDiagnosticItem, evidenceFloorStatus, type EngineAttempt, type EngineItem } from "../lib/literacy/diagnosticEngine";
import { scoreDiagnosticAttempt, scoreDiagnosticAttemptCore } from "../lib/literacy/diagnosticScorer";
import { computeDiagnosticResults } from "../lib/literacy/diagnosticPlacement";

async function main() {
const backendItem = {
  id: "item-1",
  strand: "DECODING",
  itemType: "REAL_WORD_DECODE",
  studentPromptJson: { kidPrompt: "Read this word.", displayText: "cake" },
  stimulusJson: null,
  displayMode: "TEXT_CARD_ONE_WORD",
  responseMode: "speech_response",
  isPracticeItem: false,
  expectedResponseJson: { canonical: "cake" },
  scoringRubricJson: { scoring: "speech_match" },
  adminReviewJson: { reviewerOnly: true },
  firstLookReviewModelDecisionId: "md_1",
  validationMetadataJson: { checked: true },
  canonicalAnswer: "cake",
  reviewStatus: "APPROVED",
};

const dto = toStudentItemDTO(backendItem);
assert.equal(dto.id, "item-1");
assert.equal(dtoLeaksBackendFields(dto), false);
assert(!("expectedResponseJson" in dto));
assert(!("scoringRubricJson" in dto));
assert(!("adminReviewJson" in dto));
assert(!("firstLookReviewModelDecisionId" in dto));
assert(!("validationMetadataJson" in dto));
assert(!("canonicalAnswer" in dto));
assert(!("correctAnswer" in dto));
assert(!("expectedPronunciation" in dto));

const preflightFailures = diagnosticPoolFailures([
  { strand: "DECODING", phaseBand: 3, wordType: "real_word", comprehensionMode: null },
]);
assert(preflightFailures.some((failure) => failure.reason === "decoding_phase_requires_real_and_pseudoword"));

const enginePool: EngineItem[] = [
  { id: "practice", strand: "PA", itemType: "PRACTICE", isPracticeItem: true },
  ...Array.from({ length: 8 }, (_, index) => item("PA", `pa-${index}`)),
  ...Array.from({ length: 5 }, (_, index) => item("DECODING", `dec-r-${index}`, { phaseBand: 3, wordType: index === 0 ? "pseudoword" : "real_word", targetPattern: "a_e" })),
  ...Array.from({ length: 6 }, (_, index) => item("MORPHOLOGY", `morph-${index}`)),
  item("FLUENCY", "fluency-1"),
  ...Array.from({ length: 8 }, (_, index) => item("VOCABULARY", `vocab-${index}`)),
  item("COMPREHENSION", "comp-listening", { itemType: "LISTENING_MAIN_IDEA" }),
  item("COMPREHENSION", "comp-reading", { itemType: "READING_MAIN_IDEA" }),
];
assert.equal(selectNextDiagnosticItem({ attempts: [], approvedItemPool: enginePool, practiceItem: enginePool[0] }).reasonCode, "GLOBAL_PRACTICE_ITEM");

const completedPaAttempts: EngineAttempt[] = Array.from({ length: 8 }, (_, index) => ({
  diagnosticItemId: `pa-${index}`,
  scored: true,
  correct: true,
  item: enginePool.find((entry) => entry.id === `pa-${index}`),
}));
const lowConfidenceAttempts: EngineAttempt[] = [
  ...completedPaAttempts,
  { diagnosticItemId: "dec-r-0", scored: false, correct: null, item: enginePool.find((entry) => entry.id === "dec-r-0") },
];
const replacement = selectNextDiagnosticItem({ attempts: lowConfidenceAttempts, approvedItemPool: enginePool });
assert.equal(replacement.reasonCode, "LOW_CONFIDENCE_REPLACEMENT");
assert.equal(replacement.sessionComplete, false);

const noReplacement = selectNextDiagnosticItem({
  attempts: lowConfidenceAttempts,
  approvedItemPool: enginePool.filter((entry) => entry.strand !== "DECODING" || entry.id === "dec-r-0"),
});
assert.equal(noReplacement.reasonCode, "INSUFFICIENT_SCORABLE_EVIDENCE");

const practiceAttempt: EngineAttempt = { diagnosticItemId: "practice", scored: true, correct: true, isPracticeAttempt: true, item: enginePool[0] };
assert.equal(evidenceFloorStatus("PA", [practiceAttempt], enginePool).complete, false);

const delayedCorrect = scoreDiagnosticAttemptCore({
  item: {
    id: "cake",
    strand: "DECODING",
    itemType: "REAL_WORD_DECODE",
    responseMode: "speech_response",
    expectedResponseJson: { canonical: "cake", acceptedSemanticResponses: ["cake"], speechTranscriptAliases: [], rejectedResponses: [] },
    scoringRubricJson: { scoring: "speech_match" },
  },
  responseJson: { transcript: "cake" },
  responseTimeMs: 6200,
  audioConfidence: 0.91,
});
assert.equal(delayedCorrect.delayed, true);
assert.equal(delayedCorrect.correct, true);
assert.equal(delayedCorrect.scored, true);

const aliasScore = scoreDiagnosticAttemptCore({
  item: {
    id: "pa",
    strand: "PA",
    itemType: "ORAL_SOUND_MATCH",
    responseMode: "speech_response",
    expectedResponseJson: { canonical: "sun and seal", acceptedSemanticResponses: ["sun and seal"], speechTranscriptAliases: ["sun seal"], rejectedResponses: ["sun and map"] },
    scoringRubricJson: { scoring: "speech_response" },
  },
  responseJson: { transcript: "sun seal" },
  audioConfidence: 0.9,
});
assert.equal(aliasScore.correct, true);
assert.equal(aliasScore.scorerReasoningJson.reasonCode, "ASR_ALIAS_MATCH");

const wrappedScore = await scoreDiagnosticAttempt(
  {
    item: {
      id: "cake",
      strand: "DECODING",
      itemType: "REAL_WORD_DECODE",
      responseMode: "speech_response",
      expectedResponseJson: { canonical: "cake", acceptedSemanticResponses: ["cake"], speechTranscriptAliases: [], rejectedResponses: [] },
      scoringRubricJson: { scoring: "speech_match" },
    },
    responseJson: { transcript: "cake" },
    responseTimeMs: 1000,
    audioConfidence: 0.9,
  },
  async (_ctx, fn) => (await fn()).output,
);
const unwrappedScore = scoreDiagnosticAttemptCore({
  item: {
    id: "cake",
    strand: "DECODING",
    itemType: "REAL_WORD_DECODE",
    responseMode: "speech_response",
    expectedResponseJson: { canonical: "cake", acceptedSemanticResponses: ["cake"], speechTranscriptAliases: [], rejectedResponses: [] },
    scoringRubricJson: { scoring: "speech_match" },
  },
  responseJson: { transcript: "cake" },
  responseTimeMs: 1000,
  audioConfidence: 0.9,
});
assert.deepEqual(wrappedScore, unwrappedScore);

const wrappedPersistenceFailureScore = await scoreDiagnosticAttempt(
  {
    item: {
      id: "cake",
      strand: "DECODING",
      itemType: "REAL_WORD_DECODE",
      responseMode: "speech_response",
      expectedResponseJson: { canonical: "cake", acceptedSemanticResponses: ["cake"], speechTranscriptAliases: [], rejectedResponses: [] },
      scoringRubricJson: { scoring: "speech_match" },
    },
    responseJson: { transcript: "cake" },
    responseTimeMs: 1000,
    audioConfidence: 0.9,
  },
  async (_ctx, fn) => {
    const result = await fn();
    try {
      throw new Error("deterministic scorer persistence failure");
    } catch {
      return result.output;
    }
  },
);
assert.deepEqual(wrappedPersistenceFailureScore, unwrappedScore);

const phaseResults = computeDiagnosticResults([
  { strand: "DECODING", phaseBand: 3, scored: true, correct: true },
  { strand: "DECODING", phaseBand: 3, scored: true, correct: true },
  { strand: "PA", scored: true, correct: false },
  { strand: "VOCABULARY", scored: true, correct: true },
]);
assert.equal(phaseResults.phasePlacement, 3);
assert.equal(phaseResults.placementBasis, "DECODING_ACCURACY_ONLY");
assert(JSON.stringify(phaseResults).includes("Priority 1"));
assert(JSON.stringify(phaseResults).includes("Relative strength on this diagnostic"));
assert(!JSON.stringify(phaseResults).includes("below grade level"));
assert(!JSON.stringify(phaseResults).includes("above grade level"));

const attemptsForCeiling: EngineAttempt[] = [
  ...completedPaAttempts,
  ...Array.from({ length: 4 }, (_, index) => ({
    diagnosticItemId: `hard-${index}`,
    scored: true,
    correct: false,
    item: item("DECODING", `hard-${index}`, { phaseBand: 5, wordType: "real_word" }),
  })),
];
const ceilingNext = selectNextDiagnosticItem({
  attempts: attemptsForCeiling,
  approvedItemPool: [
    item("DECODING", "easy", { phaseBand: 2, wordType: "real_word" }),
    item("DECODING", "hard-next", { phaseBand: 6, wordType: "real_word" }),
  ],
});
assert.equal(ceilingNext.sessionComplete, false);
assert.equal(ceilingNext.nextItem?.id, "easy");

const preflightSource = fs.readFileSync(path.join(process.cwd(), "lib/literacy/diagnosticPoolPreflight.ts"), "utf8");
assert(preflightSource.includes("getStudentReadyDiagnosticItems"));
assert(!preflightSource.includes("db.diagnosticItem"));

console.log("Content v3 diagnostic engine routing, DTO, preflight, scoring, placement, and equality fixtures pass.");
}

function item(strand: string, id: string, extra: Partial<EngineItem> = {}): EngineItem {
  return { id, strand, itemType: extra.itemType || "FIXTURE_ITEM", ...extra };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
