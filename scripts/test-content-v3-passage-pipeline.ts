import assert from "assert/strict";
import { checklistForArtifact } from "../lib/content/firstLookChecklists";
import { auditPassage, decodabilityThresholdForPhase, phaseWordCountBand } from "../lib/literacy/passageAudit";
import { classifyPassageWords } from "../lib/literacy/passageClassifier";
import { evaluatePassageApprovalReadiness } from "../lib/literacy/passageApproval";
import { findNearDuplicatePassagesInRows } from "../lib/literacy/findNearDuplicatePassages";
import { generatePassageCandidate, type PassageGenerationParams } from "../lib/literacy/passageGenerator";
import { runPassageQualityAudit } from "../lib/literacy/passageQualityAudit";
import { tokenizePassage } from "../lib/literacy/passageTokenizer";

async function main() {
  assert.deepEqual(tokenizePassage("Maya's well-made cake—wow!"), ["maya", "well", "made", "cake", "wow"]);
  assert.deepEqual(tokenizePassage("Don't stop, Sam!!! 123"), ["don't", "stop", "sam", "123"]);
  assert.deepEqual(tokenizePassage("... ---"), []);

  const context = {
    targetPatternCodes: ["a_e"],
    allowedPatternCodes: ["closed_short_a"],
    blockedPatternCodes: ["i_e"],
    heartWords: ["the", "bike"],
    vocabularyAllowlist: ["robot"],
  };
  const classification = classifyPassageWords("The cake sat by the bike robot pine.", context);
  assert.equal(classification.words.find((entry) => entry.word === "bike")?.category, "heart");
  assert.equal(classification.words.find((entry) => entry.word === "cake")?.category, "target");
  assert.equal(classification.words.find((entry) => entry.word === "sat")?.category, "prerequisite");
  assert.equal(classification.words.find((entry) => entry.word === "robot")?.category, "vocabulary");
  assert(classification.blockedPatternViolations.some((entry) => entry.word === "pine"));

  assert.deepEqual(phaseWordCountBand(3), { min: 45, max: 80, target: 63 });
  assert.equal(decodabilityThresholdForPhase(3), 0.95);
  assert.equal(decodabilityThresholdForPhase(6), 0.92);

  const repeated = runPassageQualityAudit("Sam ran to the mat. Sam ran to the mat.");
  assert.equal(repeated.uniqueSentenceRatio, 0.5);
  assert.equal(repeated.passesQualityGate, false);
  const repeatedTrigram = runPassageQualityAudit("The cat sat. The cat ran. On the cat sat mat.");
  assert.equal(repeatedTrigram.uniqueSentenceRatio, 1);
  assert(repeatedTrigram.repeatedTrigrams.includes("the cat sat"));
  assert.equal(runPassageQualityAudit("Maya made cake").hasTerminalPunctuation, false);
  assert.equal(runPassageQualityAudit("").passesQualityGate, false);
  assert.equal(runPassageQualityAudit("Maya made a cake.", ["existing"]).passesQualityGate, false);
  assert.equal(runPassageQualityAudit("Maya made a cake. Sam had a map.").passesQualityGate, true);

  const nearDupes = findNearDuplicatePassagesInRows(
    "Maya made a cake. Sam had a map.",
    [
      { id: "exact", text: "Maya made a cake. Sam had a map." },
      { id: "sentence", text: "Maya made a cake. Tim sat." },
      { id: "far", text: "A dog ran fast." },
    ],
  );
  assert.deepEqual(nearDupes.sort(), ["exact", "sentence"]);

  const audit = auditPassage("Maya made a cake. Sam made a map. The cat sat at a gate. Maya had a game.", {
    phasePosition: { id: "phase-1", phaseNumber: 1, label: "Phase 1" },
    dailyTarget: { code: "a_e", targetPatternsJson: { patterns: ["a_e"] }, allowedPatternCodes: ["closed_short_a"], blockedPatternCodes: ["i_e"] },
    heartWords: ["maya", "a"],
    vocabularyAllowlist: [],
  });
  assert.equal(audit.wordCountWithinBand, true);
  assert.equal(audit.unclassifiedCount, 0);
  assert.equal(audit.passesAuditGate, true);

  assert.equal(evaluatePassageApprovalReadiness({
    contentAuditJson: audit,
    decodabilityScore: 0.94,
    phaseNumber: 3,
  }).canApprove, false);
  assert.equal(evaluatePassageApprovalReadiness({
    contentAuditJson: audit,
    decodabilityScore: 0.94,
    phaseNumber: 6,
  }).canApprove, true);
  assert.equal(evaluatePassageApprovalReadiness({
    contentAuditJson: { ...audit, quality: { ...audit.quality, repeatedTrigrams: ["maya made a"] } },
    decodabilityScore: 1,
    phaseNumber: 3,
  }).canApprove, false);

  const generationParams: PassageGenerationParams = {
    phaseNumber: 3,
    phasePositionId: "phase-3-entry",
    dailyTargetCode: "a_e",
    targetPatternCodes: ["a_e"],
    allowedPatternCodes: ["closed_short_a"],
    blockedPatternCodes: ["i_e"],
    exampleWords: ["cake"],
    vocabularyAllowlist: [],
  };
  const fakeModel = async () => ({ text: "Maya made a cake." });
  const unwrapped = (await fakeModel()).text;
  const wrapped = await generatePassageCandidate(generationParams, {
    modelRunner: fakeModel,
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  const wrappedPersistenceFailure = await generatePassageCandidate(generationParams, {
    modelRunner: fakeModel,
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  assert.equal(wrapped, unwrapped);
  assert.equal(wrappedPersistenceFailure, unwrapped);

  const passageChecklist = checklistForArtifact({ artifactType: "PASSAGE", metadata: {}, contentForReview: {} });
  const checklistIds = new Set(passageChecklist.items.map((item) => item.requirementId));
  assert(checklistIds.has("PASSAGE_AUDIT_GATE_PASSED"));
  assert(checklistIds.has("PASSAGE_WORD_COUNT_WITHIN_PHASE_BAND"));
  assert(checklistIds.has("PASSAGE_NO_BLOCKED_PATTERN_VIOLATIONS"));

  console.log("content-v3 passage pipeline checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
