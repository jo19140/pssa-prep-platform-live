import assert from "assert/strict";
import { runAIFirstLookReview, type FirstLookModelRunner } from "../lib/content/aiFirstLookReviewer";
import { deriveDiagnosticItemMetadata, diagnosticMetadataToUpdateInput } from "../lib/content/diagnosticItemMetadata";
import { checklistForArtifact } from "../lib/content/firstLookChecklists";
import { auditLessonForApproval, deriveLessonMetadata, deriveLessonPartMetadata, runLessonLinter } from "../lib/content/lessonMetadata";
import { buildPhase3EntryDiagnosticItems } from "../lib/content/phase3DiagnosticItems";
import { auditBankItems, loadBankPayload } from "./content/diagnostic-bank-v1-4";

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

  const pseudowordArtifact = {
    artifactType: "DIAGNOSTIC_ITEM",
    artifactId: "fixture-pseudoword-validation",
    metadata: { strand: "DECODING", itemType: "PSEUDOWORD_DECODE", dailyTargetCode: "a_e", targetPattern: "a_e" },
    contentForReview: {
      strand: "DECODING",
      itemType: "PSEUDOWORD_DECODE",
      itemStatus: "candidate",
      studentPromptJson: { kidPrompt: "Read this made-up word out loud.", displayText: "zake" },
      expectedResponseJson: {
        canonical: "zake",
        acceptedSemanticResponses: ["zake"],
        speechTranscriptAliases: [],
        rejectedResponses: [],
      },
      scoringRubricJson: { scoring: "speech_match", latencyFeeds: "FLUENCY", placementUses: "accuracy_only" },
      targetPattern: "a_e",
      wordType: "pseudoword",
      expectedPronunciation: "zake (a_e target pattern)",
      placementEvidenceJson: { source: "pseudoword_accuracy", usesLatency: false },
      fluencyEvidenceJson: { source: "response_latency", placementImpact: "none" },
    },
  } as const;
  const pseudowordWrapped = await runAIFirstLookReview(pseudowordArtifact, {
    modelRunner: async ({ checklist }) => ({
      modelName: "fixture-model",
      metadata: { inferenceMs: 1 },
      review: deterministicReviewFor(checklist, pseudowordArtifact.artifactId, "DIAGNOSTIC_ITEM"),
    }),
    persistDecision: async () => null,
    attachDecision: async () => {},
  });
  const pseudowordById = new Map(pseudowordWrapped.checks.map((check) => [check.requirementId, check]));
  assert.equal(pseudowordById.get("PSEUDOWORD_NO_REALWORD_HOMOPHONE")?.result, "PASS");
  assert.equal(pseudowordById.get("PSEUDOWORD_NO_NEAR_MISSPELLING")?.result, "PASS");
  assert.equal(pseudowordById.get("DECODE_LATENCY_NOT_PLACEMENT")?.result, "PASS");
  assert.equal(pseudowordById.get("ITEM_POOL_STATUS_NOT_CALIBRATED_BY_DEFAULT")?.result, "PASS");

  const latencyLeakWrapped = await runAIFirstLookReview(
    {
      ...pseudowordArtifact,
      artifactId: "fixture-latency-placement-leak",
      contentForReview: {
        ...pseudowordArtifact.contentForReview,
        scoringRubricJson: { scoring: "speech_match", placementUses: "accuracy_plus_latency" },
        placementEvidenceJson: { source: "accuracy_and_latency", usesLatency: true },
      },
    },
    {
      modelRunner: async ({ checklist }) => ({
        modelName: "fixture-model",
        metadata: { inferenceMs: 1 },
        review: deterministicReviewFor(checklist, "fixture-latency-placement-leak", "DIAGNOSTIC_ITEM"),
      }),
      persistDecision: async () => null,
      attachDecision: async () => {},
    },
  );
  assert.equal(new Map(latencyLeakWrapped.checks.map((check) => [check.requirementId, check])).get("DECODE_LATENCY_NOT_PLACEMENT")?.result, "FAIL");

  const bikeMetadata = deriveDiagnosticItemMetadata({
    strand: "DECODING",
    itemType: "REAL_WORD_DECODE",
    dailyTargetCode: "i_e",
    studentPromptJson: { kidPrompt: "Read this word out loud.", displayText: "bike" },
    expectedResponseJson: {
      canonical: "bike",
      acceptedSemanticResponses: ["bike"],
      speechTranscriptAliases: [],
      rejectedResponses: [],
    },
    scoringRubricJson: { scoring: "speech_match", latencyFeeds: "FLUENCY" },
  });
  assert.equal(bikeMetadata.metadata.targetPattern, "i_e");
  assert.equal(bikeMetadata.metadata.wordType, "real_word");
  assert.equal(bikeMetadata.metadata.displayText, "bike");
  assert.equal(bikeMetadata.metadata.canonicalAnswer, "bike");
  assert.equal(bikeMetadata.metadata.displayMode, "TEXT_CARD_ONE_WORD");
  assert.equal(bikeMetadata.metadata.responseMode, "speech_response");
  assert.equal(bikeMetadata.metadata.skill, "real_word_decoding");
  assert.deepEqual(bikeMetadata.missingRequired, []);

  const saveEditPromotion = deriveDiagnosticItemMetadata({
    strand: "DECODING",
    itemType: "REAL_WORD_DECODE",
    studentPromptJson: { kidPrompt: "Read this word out loud.", displayText: "bike" },
    expectedResponseJson: { canonical: "bike", acceptedSemanticResponses: ["bike"], speechTranscriptAliases: [], rejectedResponses: [] },
    scoringRubricJson: { scoring: "speech_match" },
    adminReviewJson: {
      appliedEdits: [
        { field: "targetPattern", before: null, after: "i_e", reviewNoteExcerpt: "targetPattern: i_e" },
        { field: "wordType", before: null, after: "real_word", reviewNoteExcerpt: "wordType: real_word" },
        { field: "displayText", before: null, after: "bike", reviewNoteExcerpt: "displayText: bike" },
        { field: "canonicalAnswer", before: null, after: "bike", reviewNoteExcerpt: "canonicalAnswer: bike" },
      ],
    },
  });
  const promotedUpdate = diagnosticMetadataToUpdateInput(saveEditPromotion.metadata) as Record<string, unknown>;
  assert.equal(promotedUpdate.targetPattern, "i_e");
  assert.equal(promotedUpdate.wordType, "real_word");
  assert.equal(promotedUpdate.displayText, "bike");
  assert.equal(promotedUpdate.canonicalAnswer, "bike");

  const missingDecodingMetadata = deriveDiagnosticItemMetadata({
    strand: "DECODING",
    itemType: "REAL_WORD_DECODE",
    studentPromptJson: { kidPrompt: "Read this word out loud." },
    expectedResponseJson: {},
    scoringRubricJson: {},
  });
  assert(missingDecodingMetadata.approvalBlockers.some((blocker) => blocker.includes("displayText")));
  assert(missingDecodingMetadata.approvalBlockers.some((blocker) => blocker.includes("scoring")));

  const paSegmentedWrapped = await runAIFirstLookReview(
    {
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: "fixture-pa-segmented-audio",
      metadata: { strand: "PA", itemType: "ORAL_WORD_BLEND" },
      contentForReview: {
        strand: "PA",
        itemType: "ORAL_WORD_BLEND",
        skill: "onset_rime_blending",
        audioAssetRequired: true,
        audioValidatedByHuman: false,
        studentPromptJson: { kidPrompt: "Buddy will say the parts slowly. Say the whole word." },
        stimulusJson: { audioScript: "m ... ake", backendPhonemeMetadata: { blendType: "onset_rime", onset: "m", rime: "ake" } },
        expectedResponseJson: {
          canonical: "make",
          acceptedSemanticResponses: ["make"],
          speechTranscriptAliases: ["mayk"],
          rejectedResponses: [],
        },
        scoringRubricJson: { scoring: "speech_response" },
      },
    },
    {
      modelRunner: async ({ checklist }) => ({
        modelName: "fixture-model",
        metadata: { inferenceMs: 1 },
        review: deterministicReviewFor(checklist, "fixture-pa-segmented-audio", "DIAGNOSTIC_ITEM"),
      }),
      persistDecision: async () => null,
      attachDecision: async () => {},
    },
  );
  const paSegmentedById = new Map(paSegmentedWrapped.checks.map((check) => [check.requirementId, check]));
  assert.equal(paSegmentedById.get("PA_AUDIO_ASSET_REQUIRED_FOR_PHONEMES")?.result, "FAIL");
  assert.equal(paSegmentedById.get("PA_NO_PRINTED_STIMULUS")?.result, "PASS");

  const paPrintedStimulus = deriveDiagnosticItemMetadata({
    strand: "PA",
    itemType: "ORAL_SOUND_MATCH",
    skill: "initial_sound_matching",
    studentPromptJson: { kidPrompt: "Which two start the same way?", choices: ["sun and seal", "sun and map"] },
    stimulusJson: { audioScript: "sun, seal, map" },
    expectedResponseJson: { canonical: "sun and seal", acceptedSemanticResponses: ["sun and seal"], speechTranscriptAliases: [], rejectedResponses: [] },
    scoringRubricJson: { scoring: "speech_response" },
  });
  assert(paPrintedStimulus.approvalBlockers.some((blocker) => blocker.includes("printed stimulus")));

  const morphologyTransparentArtifact = {
    artifactType: "DIAGNOSTIC_ITEM",
    artifactId: "fixture-morph-transparent",
    metadata: {
      strand: "MORPHOLOGY",
      itemType: "BASE_WORD_ID",
      phaseBand: 3,
      morphologyWave: "transparent_suffixes",
      targetMorpheme: "-ful",
      skill: "base_word_identification",
    },
    contentForReview: {
      strand: "MORPHOLOGY",
      itemType: "BASE_WORD_ID",
      studentPromptJson: { kidPrompt: "Which part is the base word in playful?", choices: ["play", "-ful", "playful"] },
      expectedResponseJson: {
        canonical: "play",
        acceptedSemanticResponses: ["play"],
        speechTranscriptAliases: [],
        rejectedResponses: ["-ful", "playful"],
      },
      scoringRubricJson: { scoring: "selected_choice" },
      phaseBand: 3,
      morphologyWave: "transparent_suffixes",
      targetMorpheme: "-ful",
      skill: "base_word_identification",
    },
  } as const;
  const morphologyTransparentWrapped = await runAIFirstLookReview(morphologyTransparentArtifact, {
    modelRunner: async ({ checklist }) => ({
      modelName: "fixture-model",
      metadata: { inferenceMs: 1 },
      review: {
        ...deterministicReviewFor(checklist, morphologyTransparentArtifact.artifactId, "DIAGNOSTIC_ITEM"),
        checks: checklist.items.map((item) => ({
          requirementId: item.requirementId,
          result: item.requirementId.startsWith("MORPH_") ? "FAIL" as const : "PASS" as const,
          severity: item.severity,
          evidence: "Fixture model over-flagged basic morphology.",
        })),
      },
    }),
    persistDecision: async () => null,
    attachDecision: async () => {},
  });
  const transparentById = new Map(morphologyTransparentWrapped.checks.map((check) => [check.requirementId, check]));
  assert.equal(transparentById.get("MORPH_UNAMBIGUOUS_BASE_AFFIX_ROOT")?.result, "PASS");
  assert.equal(transparentById.get("MORPH_TRANSPARENT_BAND_APPROPRIATE")?.result, "PASS");
  assert.notEqual(morphologyTransparentWrapped.recommendation, "REJECT");

  const morphologyTheoryDependentWrapped = await runAIFirstLookReview(
    {
      ...morphologyTransparentArtifact,
      artifactId: "fixture-morph-theory-dependent",
      contentForReview: {
        ...morphologyTransparentArtifact.contentForReview,
        studentPromptJson: { kidPrompt: "Which part is the base word in unhappiness?", choices: ["happy", "unhappy", "-ness"] },
        expectedResponseJson: {
          canonical: "happy",
          acceptedSemanticResponses: ["happy"],
          speechTranscriptAliases: [],
          rejectedResponses: ["unhappy", "-ness"],
        },
      },
    },
    {
      modelRunner: async ({ checklist }) => ({
        modelName: "fixture-model",
        metadata: { inferenceMs: 1 },
        review: deterministicReviewFor(checklist, "fixture-morph-theory-dependent", "DIAGNOSTIC_ITEM"),
      }),
      persistDecision: async () => null,
      attachDecision: async () => {},
    },
  );
  const theoryById = new Map(morphologyTheoryDependentWrapped.checks.map((check) => [check.requirementId, check]));
  assert.equal(theoryById.get("MORPH_UNAMBIGUOUS_BASE_AFFIX_ROOT")?.result, "FAIL");
  assert.equal(morphologyTheoryDependentWrapped.recommendation, "FLAG_FOR_HUMAN");

  const fixableBlockerWrapped = await runAIFirstLookReview(fixtureArtifact, {
    modelRunner: async ({ checklist }) => ({
      modelName: "fixture-model",
      metadata: { inferenceMs: 1 },
      review: {
        ...deterministicReviewFor(checklist, "fixture-fixable-blocker", "PASSAGE"),
        checks: checklist.items.map((item, index) => ({
          requirementId: item.requirementId,
          result: index === 0 ? "FAIL" as const : "PASS" as const,
          severity: item.severity,
          evidence: index === 0 ? "Fixable wording issue an edit can resolve." : item.requirement,
        })),
      },
    }),
    persistDecision: async () => null,
    attachDecision: async () => {},
  });
  assert.equal(fixableBlockerWrapped.recommendation, "FLAG_FOR_HUMAN");

  const hardRejectWrapped = await runAIFirstLookReview(fixtureArtifact, {
    modelRunner: async ({ checklist }) => ({
      modelName: "fixture-model",
      metadata: { inferenceMs: 1 },
      review: {
        ...deterministicReviewFor(checklist, "fixture-hard-reject", "PASSAGE"),
        checks: checklist.items.map((item, index) => ({
          requirementId: item.requirementId,
          result: index === 0 ? "FAIL" as const : "PASS" as const,
          severity: item.severity,
          evidence: index === 0 ? "Wrong strand for this diagnostic item." : item.requirement,
        })),
      },
    }),
    persistDecision: async () => null,
    attachDecision: async () => {},
  });
  assert.equal(hardRejectWrapped.recommendation, "REJECT");

  const morphologySeed = buildPhase3EntryDiagnosticItems().find((item) => item.strand === "MORPHOLOGY" && item.itemType === "BASE_WORD_ID");
  assert(morphologySeed);
  assert.equal((morphologySeed.studentPromptJson as { kidPrompt: string }).kidPrompt, "Which part is the base word in playful?");
  assert.deepEqual((morphologySeed.studentPromptJson as { choices: string[] }).choices, ["play", "-ful", "playful"]);
  assert.equal(morphologySeed.phaseBand, 3);
  assert.equal(morphologySeed.morphologyWave, "transparent_suffixes");
  assert.equal(morphologySeed.targetMorpheme, "-ful");
  assert.equal(morphologySeed.skill, "base_word_identification");

  const enormousSeed = buildPhase3EntryDiagnosticItems().find((item) => item.strand === "VOCABULARY" && item.targetWord === "enormous");
  assert(enormousSeed);
  assert.equal(enormousSeed.itemType, "WORD_MEANING_CONTEXT");
  assert.equal(enormousSeed.vocabularyBand, "Tier 2");
  assert.deepEqual((enormousSeed.studentPromptJson as { choices: string[] }).choices, ["very large", "very tiny", "broken"]);
  assert.equal((enormousSeed.expectedResponseJson as { canonical: string }).canonical, "very large");

  const vocabularyWrapped = await runAIFirstLookReview(
    {
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: "fixture-vocab-enormous",
      metadata: { strand: "VOCABULARY", itemType: enormousSeed.itemType },
      contentForReview: {
        strand: "VOCABULARY",
        itemType: enormousSeed.itemType,
        studentPromptJson: enormousSeed.studentPromptJson,
        expectedResponseJson: enormousSeed.expectedResponseJson,
        scoringRubricJson: enormousSeed.scoringRubricJson,
        vocabularyBand: enormousSeed.vocabularyBand,
        targetWord: enormousSeed.targetWord,
      },
    },
    {
      modelRunner: async ({ checklist }) => ({
        modelName: "fixture-model",
        metadata: { inferenceMs: 1 },
        review: deterministicReviewFor(checklist, "fixture-vocab-enormous", "DIAGNOSTIC_ITEM"),
      }),
      persistDecision: async () => null,
      attachDecision: async () => {},
    },
  );
  const vocabById = new Map(vocabularyWrapped.checks.map((check) => [check.requirementId, check]));
  assert.equal(vocabById.get("VOCAB_TIER2_NO_PICTURE_CHOICE")?.result, "PASS");
  assert.equal(vocabById.get("VOCAB_DISTRACTORS_SAME_ATTRIBUTE")?.result, "PASS");

  const tier2PictureChoice = deriveDiagnosticItemMetadata({
    strand: "VOCABULARY",
    itemType: "CONCRETE_WORD_PICTURE_CHOICE",
    vocabularyBand: "Tier 2",
    targetWord: "enormous",
    studentPromptJson: { kidPrompt: "What does enormous mean?", pictureChoices: ["big.png", "small.png"] },
    expectedResponseJson: { canonical: "very large", acceptedSemanticResponses: ["very large"], speechTranscriptAliases: [], rejectedResponses: [] },
    scoringRubricJson: { scoring: "selected_choice" },
  });
  assert(tier2PictureChoice.approvalBlockers.some((blocker) => blocker.includes("picture-choice")));

  const lessonFixture = buildLessonFixture("i_e");
  const lessonMetadata = deriveLessonMetadata(lessonFixture);
  assert.equal(lessonMetadata.phaseBand, 3);
  assert.equal(lessonMetadata.dailyTargetCode, "i_e");
  assert.equal(lessonMetadata.targetPattern, "i_e");
  assert.equal(lessonMetadata.lessonType, "STRUCTURED_LITERACY_8_PART");
  assert.equal(lessonFixture.parts.length, 8);
  assert.equal(deriveLessonPartMetadata(lessonFixture.parts[2], lessonFixture).partType, "WORD_LEVEL_DECODING");
  assert.equal(deriveLessonPartMetadata(lessonFixture.parts[6], lessonFixture).independentScoreEligible, false);
  const lessonFailures = runLessonLinter(lessonFixture).filter((check) => check.result === "FAIL" && check.severity === "BLOCKER");
  assert.deepEqual(lessonFailures, []);

  const warmupLeak = buildLessonFixture("i_e");
  (warmupLeak.parts[0].contentJson as any).warmupWords.push("bike");
  assert(runLessonLinter(warmupLeak).some((check) => check.ruleId === "LESSON_WARMUP_NO_TODAY_PATTERN" && check.result === "FAIL"));

  const connectedTextUnclassified = buildLessonFixture("i_e");
  (connectedTextUnclassified.parts[6].contentJson as any).contentAuditJson.unclassifiedWords = ["mystery"];
  assert(auditLessonForApproval(connectedTextUnclassified).blockers.some((blocker) => blocker.includes("LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED")));

  const unpreviewedHeart = buildLessonFixture("i_e");
  (unpreviewedHeart.parts[6].contentJson as any).contentAuditJson.heartWords = ["their"];
  assert(auditLessonForApproval(unpreviewedHeart).blockers.some((blocker) => blocker.includes("LESSON_HEART_WORDS_PREVIEWED")));

  const shortEncoding = buildLessonFixture("i_e");
  (shortEncoding.parts[5].contentJson as any).dictatedWords = ["bike"];
  assert(runLessonLinter(shortEncoding).some((check) => check.ruleId === "LESSON_ENCODING_MINIMUM_ITEMS" && check.result === "FAIL"));

  const missingMetadataLesson = { ...lessonFixture, phasePositionId: null, dailyTargetId: null };
  assert(auditLessonForApproval(missingMetadataLesson).blockers.some((blocker) => blocker.includes("LESSON_HAS_PHASE_POSITION")));
  assert(auditLessonForApproval(missingMetadataLesson).blockers.some((blocker) => blocker.includes("LESSON_HAS_DAILY_TARGET")));

  const v14Bank = loadBankPayload();
  const v14Audit = auditBankItems(v14Bank.items, v14Bank.bankId, { requireSourceStatuses: true });
  assert.equal(v14Bank.items.length, 120);
  assert.equal(v14Audit.passCount, 120);
  assert.equal(v14Audit.failCount, 0);

  console.log("Content v3 first-look wrapper preserves model output exactly, including deterministic persistence failure, dispatches diagnostic checks by strand, enforces kid-view audience boundaries, isolates per-check evidence, preserves strand scoring modes, recalibrates transparent morphology, maps fixable blockers to FLAG_FOR_HUMAN, renders bound morphemes in BASE_WORD_ID prompts, enforces vocabulary v2 rules, PA validated-audio gates, pseudoword validation, candidate item status, separates decoding placement from latency fluency evidence, enforces Content v3 lesson metadata/audit guards, and validates the Reading Buddy Phase 1-3 v1.4 diagnostic bank at 120/120.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function buildLessonFixture(targetPattern: string) {
  const wordTags = {
    target: ["bike", "time", "zibe"],
    prerequisite: ["sit", "map", "can"],
    heart: ["said"],
    vocabulary: ["ramp"],
    unclassified: [],
  };
  return {
    id: "lesson-fixture",
    phasePositionId: "phase-3-entry",
    dailyTargetId: "daily-target-i-e",
    phasePosition: { phaseNumber: 3, subPosition: "ENTRY", label: "Phase 3 Entry" },
    dailyTarget: { code: targetPattern, kidVisibleLabel: targetPattern, tutorLabel: "Phase 3 Entry i_e", phasePosition: { phaseNumber: 3, subPosition: "ENTRY", label: "Phase 3 Entry" } },
    parts: [
      {
        partNumber: 1,
        partLabel: "Cumulative Code Review",
        kidVisibleCopy: { title: "Warm up" },
        contentJson: { partType: "CUMULATIVE_CODE_REVIEW", dailyTargetCode: targetPattern, targetPattern, warmupWords: ["sit", "map", "can"], wordTags },
      },
      {
        partNumber: 2,
        partLabel: "Target Concept",
        kidVisibleCopy: { title: "Meet the pattern" },
        contentJson: { partType: "EXPLICIT_TARGET_INSTRUCTION", dailyTargetCode: targetPattern, targetPattern, conceptExamples: ["bike", "time"], teachingLanguage: "When e comes at the end, the vowel can say its name." },
      },
      {
        partNumber: 3,
        partLabel: "Word-Level Decoding",
        kidVisibleCopy: { title: "Read words" },
        contentJson: {
          partType: "WORD_LEVEL_DECODING",
          dailyTargetCode: targetPattern,
          targetPattern,
          wordTags,
          contrastiveLines: [
            { lineType: "target_only_real_words", words: [{ word: "bike", wordType: "real_word", targetPattern }] },
            { lineType: "target_vs_review", words: [{ word: "bike", wordType: "real_word", targetPattern }, { word: "bit", wordType: "review_word", targetPattern: "closed_syllable" }] },
            { lineType: "cumulative_review", words: [{ word: "map", wordType: "review_word", targetPattern: "closed_syllable" }] },
            { lineType: "target_only_pseudowords", words: [{ word: "zibe", wordType: "pseudoword", targetPattern, expectedPronunciation: "zibe", validation: { checkedAgainstDictionary: true, nearMisspellingRejected: true } }] },
          ],
        },
      },
      {
        partNumber: 4,
        partLabel: "High-Utility Word and Vocabulary",
        kidVisibleCopy: { title: "Helpful words" },
        contentJson: { partType: "HFW_VOCAB", dailyTargetCode: targetPattern, targetPattern, heartWords: ["said"], vocabularyWords: ["ramp"], wordTags },
      },
      {
        partNumber: 5,
        partLabel: "Sentence Reading",
        kidVisibleCopy: { title: "Read sentences" },
        contentJson: { partType: "SENTENCE_READING", dailyTargetCode: targetPattern, targetPattern, sentences: ["Mike can ride the bike."], wordTags, contentAuditJson: { ...wordTags, unclassifiedWords: [] } },
      },
      {
        partNumber: 6,
        partLabel: "Encoding and Spelling",
        kidVisibleCopy: { title: "Spell words" },
        contentJson: { partType: "ENCODING_SPELLING", dailyTargetCode: targetPattern, targetPattern, dictatedWords: ["bike", "time", "kite", "side", "mile", "hide"], dictatedSentences: ["Mike rides a bike.", "The kite is high."], expectedSpellings: ["bike", "time", "kite", "side", "mile", "hide"], scoringRubricJson: { scoring: "spelling_accuracy" }, wordTags },
      },
      {
        partNumber: 7,
        partLabel: "Connected Text Reading",
        kidVisibleCopy: { title: "Read a story" },
        contentJson: { partType: "CONNECTED_TEXT_READING", dailyTargetCode: targetPattern, targetPattern, passageText: "Mike rides the bike up the ramp.", listenFirstAllowed: true, readOnOwnAllowed: true, connectedTextMode: "ASSISTED_VS_INDEPENDENT", scoringRubricJson: { assistedIndependentSeparated: true }, wordTags, contentAuditJson: { ...wordTags, targetWords: ["Mike", "bike"], prerequisiteWords: ["up"], heartWords: ["said"], vocabularyWords: ["ramp"], unclassifiedWords: [] } },
      },
      {
        partNumber: 8,
        partLabel: "Comprehension and Language",
        kidVisibleCopy: { title: "Talk about it" },
        contentJson: { partType: "COMPREHENSION_LANGUAGE_EXTENSION", dailyTargetCode: targetPattern, targetPattern, questions: [{ type: "literal", prompt: "What did Mike ride?" }], questionTypes: ["literal"], responseMode: "speech_response", autopilotRecommendation: { nextDailyTargetCode: targetPattern } },
      },
    ],
    passage: { contentAuditJson: { targetWords: ["bike"], prerequisiteWords: ["up"], heartWords: ["said"], vocabularyWords: ["ramp"], unclassifiedWords: [] } },
  };
}
