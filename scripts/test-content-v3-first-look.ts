import assert from "assert/strict";
import { runAIFirstLookReview, type FirstLookModelRunner } from "../lib/content/aiFirstLookReviewer";
import { checklistForArtifact } from "../lib/content/firstLookChecklists";

function deterministicReviewFor(checklist: ReturnType<typeof checklistForArtifact>, artifactId = "fixture-diagnostic-item") {
  return {
  artifactType: "DIAGNOSTIC_ITEM" as const,
  artifactId,
  recommendation: "FLAG_FOR_HUMAN" as const,
  confidence: 0.72,
  checks: checklist.items.map((item, index) => ({
    requirementId: item.requirementId,
    result: index === 0 ? "FAIL" as const : "PASS" as const,
    severity: item.severity,
    evidence: index === 0 ? "Human should inspect the first checklist requirement." : item.requirement,
  })),
  specificIssues: [
    {
      severity: "minor" as const,
      location: "displayText",
      description: "Fixture issue for equality testing.",
    },
  ],
  kidViewLintViolations: [],
  };
}

const fakeRunner: FirstLookModelRunner = async ({ checklist }) => ({
  modelName: "fixture-model",
  review: deterministicReviewFor(checklist),
  metadata: { inferenceMs: 1 },
});

function withoutPersistenceId(review: Awaited<ReturnType<typeof runAIFirstLookReview>>) {
  const { modelDecisionId: _modelDecisionId, ...reviewWithoutPersistenceId } = review;
  return reviewWithoutPersistenceId;
}

async function main() {
  const fixtureArtifact = {
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: "fixture-diagnostic-item",
      metadata: { strand: "DECODING", itemType: "PSEUDOWORD_DECODE" },
      contentForReview: { displayText: "zake" },
    } as const;
  const unwrapped = (await fakeRunner({
    artifact: fixtureArtifact,
    checklist: checklistForArtifact(fixtureArtifact),
  })).review;

  const wrappedHappyPath = await runAIFirstLookReview(
    fixtureArtifact,
    {
      modelRunner: fakeRunner,
      persistDecision: async () => "fixture-model-decision-id",
      attachDecision: async () => {},
    },
  );

  assert.deepEqual(withoutPersistenceId(wrappedHappyPath), unwrapped);
  assert.equal(wrappedHappyPath.modelDecisionId, "fixture-model-decision-id");

  const wrappedPersistenceFailure = await runAIFirstLookReview(
    fixtureArtifact,
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

  const paWrapped = await runAIFirstLookReview(
    {
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: "fixture-pa-item",
      metadata: { strand: "PA", itemType: "ORAL_WORD_BLEND" },
      contentForReview: { strand: "PA", itemType: "ORAL_WORD_BLEND" },
    },
    {
      modelRunner: async ({ checklist }) => ({
        modelName: "fixture-model",
        metadata: { inferenceMs: 1 },
        review: {
          ...deterministicReviewFor(checklist, "fixture-pa-item"),
          artifactId: "fixture-pa-item",
          checks: checklist.items.map((item) => ({
            requirementId: item.requirementId,
            result: "NA" as const,
            severity: item.severity,
            evidence: item.requirement,
          })),
        },
      }),
      persistDecision: async () => null,
      attachDecision: async () => {},
    },
  );

  assert(paWrapped.checks.some((check) => check.requirementId === "PA_AUDIO_ONLY_KID_PROMPT"));
  assert(!paWrapped.checks.some((check) => check.requirementId === "DECODING_PSEUDOWORD_NOT_MISSPELLING"));
  console.log("Content v3 first-look wrapper preserves model output exactly, including deterministic persistence failure, and dispatches diagnostic checks by strand.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
