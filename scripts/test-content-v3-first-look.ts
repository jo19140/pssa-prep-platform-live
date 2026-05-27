import assert from "assert/strict";
import { runAIFirstLookReview, type FirstLookModelRunner } from "../lib/content/aiFirstLookReviewer";
import { checklistForArtifact } from "../lib/content/firstLookChecklists";

function deterministicReviewFor(
  checklist: ReturnType<typeof checklistForArtifact>,
  artifactId = "fixture-passage",
  artifactType: "DIAGNOSTIC_ITEM" | "LESSON_PART" | "PASSAGE" = "PASSAGE",
) {
  return {
  artifactType,
  artifactId,
  recommendation: "APPROVE" as const,
  confidence: 0.72,
  checks: checklist.items.map((item) => ({
    requirementId: item.requirementId,
    result: "PASS" as const,
    severity: item.severity,
    evidence: item.requirement,
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
      artifactType: "PASSAGE",
      artifactId: "fixture-passage",
      metadata: { dailyTargetCode: "a_e" },
      contentForReview: { passageText: "Maya made a safe game." },
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

  assert(paWrapped.checks.some((check) => check.requirementId === "PA_REQUIRES_AUDIO_DELIVERY"));
  assert(!paWrapped.checks.some((check) => check.requirementId === "PA_AUDIO_ONLY_KID_PROMPT"));
  assert(!paWrapped.checks.some((check) => check.requirementId === "DECODING_PSEUDOWORD_NOT_MISSPELLING"));

  const paBoundaryArtifact = {
    artifactType: "DIAGNOSTIC_ITEM",
    artifactId: "fixture-pa-boundary-item",
    metadata: { strand: "PA", itemType: "ORAL_SOUND_MATCH" },
    contentForReview: {
      strand: "PA",
      itemType: "ORAL_SOUND_MATCH",
      studentPromptJson: { kidPrompt: "Buddy will say three words. Which two start the same way?" },
      stimulusJson: { audioScript: "sun, seal, map" },
      expectedResponseJson: {
        canonical: "sun and seal",
        acceptedSemanticResponses: ["sun and seal"],
        speechTranscriptAliases: ["sun seal"],
        rejectedResponses: ["sun and map", "seal and map"],
      },
      scoringRubricJson: { scoring: "speech_response" },
      adminReviewJson: { reviewerOnlyChoices: ["sun and seal", "sun and map", "seal and map"] },
    },
  } as const;
  const boundaryWrapped = await runAIFirstLookReview(paBoundaryArtifact, {
    modelRunner: async ({ checklist }) => ({
      modelName: "fixture-model",
      metadata: { inferenceMs: 1 },
      review: {
        artifactType: "DIAGNOSTIC_ITEM",
        artifactId: paBoundaryArtifact.artifactId,
        recommendation: "REJECT",
        confidence: 0.12,
        checks: checklist.items.map((item) => ({
          requirementId: item.requirementId,
          result: "FAIL" as const,
          severity: item.severity,
          evidence: "Model cited compliance issues with other stated blockers.",
        })),
        specificIssues: [],
        kidViewLintViolations: [],
      },
    }),
    persistDecision: async () => null,
    attachDecision: async () => {},
  });

  const boundaryById = new Map(boundaryWrapped.checks.map((check) => [check.requirementId, check]));
  assert.equal(boundaryById.get("PA_NO_VISIBLE_PRINTED_CHOICES")?.result, "PASS");
  assert.equal(boundaryById.get("NO_KID_METADATA")?.result, "PASS");
  assert.equal(boundaryById.get("PA_REQUIRES_AUDIO_DELIVERY")?.result, "PASS");
  assert.equal(boundaryById.get("PA_SCORING_SPEECH_RESPONSE")?.result, "PASS");
  assert.equal(boundaryById.get("PA_DIALECT_ACCENT_SENSITIVE")?.severity, "WARNING");
  assert(boundaryWrapped.checks.every((check) => !check.evidence.includes("other stated blockers")));
  assert.equal((paBoundaryArtifact.contentForReview.scoringRubricJson as { scoring: string }).scoring, "speech_response");

  const decodingArtifact = {
    artifactType: "DIAGNOSTIC_ITEM",
    artifactId: "fixture-decoding-scoring-item",
    metadata: { strand: "DECODING", itemType: "REAL_WORD_DECODE" },
    contentForReview: {
      strand: "DECODING",
      itemType: "REAL_WORD_DECODE",
      studentPromptJson: { kidPrompt: "Read this word out loud.", displayText: "cake" },
      expectedResponseJson: {
        canonical: "cake",
        acceptedSemanticResponses: ["cake"],
        speechTranscriptAliases: [],
        rejectedResponses: [],
      },
      scoringRubricJson: { scoring: "speech_match" },
    },
  } as const;
  assert.equal((decodingArtifact.contentForReview.scoringRubricJson as { scoring: string }).scoring, "speech_match");

  console.log("Content v3 first-look wrapper preserves model output exactly, including deterministic persistence failure, dispatches diagnostic checks by strand, enforces kid-view audience boundaries, isolates per-check evidence, and preserves strand scoring modes.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
