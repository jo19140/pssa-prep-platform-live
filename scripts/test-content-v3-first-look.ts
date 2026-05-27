import assert from "assert/strict";
import { runAIFirstLookReview, type FirstLookModelRunner } from "../lib/content/aiFirstLookReviewer";

const deterministicReview = {
  artifactType: "DIAGNOSTIC_ITEM" as const,
  artifactId: "fixture-diagnostic-item",
  recommendation: "FLAG_FOR_HUMAN" as const,
  confidence: 0.72,
  checksPassed: ["Prompt is unambiguous and age-appropriate for grades 3-8."],
  checksFailed: ["Human should verify pseudoword does not resemble a common misspelling."],
  specificIssues: [
    {
      severity: "minor" as const,
      location: "displayText",
      description: "Fixture issue for equality testing.",
    },
  ],
  kidViewLintViolations: [],
};

const fakeRunner: FirstLookModelRunner = async () => ({
  modelName: "fixture-model",
  review: deterministicReview,
  metadata: { inferenceMs: 1 },
});

function withoutPersistenceId(review: Awaited<ReturnType<typeof runAIFirstLookReview>>) {
  const { modelDecisionId: _modelDecisionId, ...reviewWithoutPersistenceId } = review;
  return reviewWithoutPersistenceId;
}

async function main() {
  const unwrapped = (await fakeRunner({
    artifact: {
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: "fixture-diagnostic-item",
      metadata: { strand: "DECODING", itemType: "PSEUDOWORD_DECODE" },
      contentForReview: { displayText: "zake" },
    },
    checklist: {
      key: "fixture",
      version: "fixture",
      artifactType: "DIAGNOSTIC_ITEM",
      items: [],
    },
  })).review;

  const wrappedHappyPath = await runAIFirstLookReview(
    {
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: "fixture-diagnostic-item",
      metadata: { strand: "DECODING", itemType: "PSEUDOWORD_DECODE" },
      contentForReview: { displayText: "zake" },
    },
    {
      modelRunner: fakeRunner,
      persistDecision: async () => "fixture-model-decision-id",
      attachDecision: async () => {},
    },
  );

  assert.deepEqual(withoutPersistenceId(wrappedHappyPath), unwrapped);
  assert.equal(wrappedHappyPath.modelDecisionId, "fixture-model-decision-id");

  const wrappedPersistenceFailure = await runAIFirstLookReview(
    {
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: "fixture-diagnostic-item",
      metadata: { strand: "DECODING", itemType: "PSEUDOWORD_DECODE" },
      contentForReview: { displayText: "zake" },
    },
    {
      modelRunner: fakeRunner,
      persistDecision: async () => {
        throw new Error("deterministic persistence failure");
      },
      attachDecision: async () => {},
    },
  );

  assert.deepEqual(withoutPersistenceId(wrappedPersistenceFailure), unwrapped);
  assert.equal(wrappedPersistenceFailure.modelDecisionId, null);
  console.log("Content v3 first-look wrapper preserves model output exactly, including deterministic persistence failure.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
