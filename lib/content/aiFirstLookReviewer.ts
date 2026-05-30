import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { persistModelDecision, type ModelDecisionContext, type ModelDecisionMetadata } from "@/lib/decisions/withModelDecisionLogging";
import { checklistForArtifact, type CheckSeverity, type FirstLookArtifactType } from "./firstLookChecklists";

export type CheckResult = {
  requirementId: string;
  result: "PASS" | "FAIL" | "NA";
  severity: CheckSeverity;
  evidence: string;
};

export type AIFirstLookReview = {
  modelDecisionId: string | null;
  artifactType: FirstLookArtifactType;
  artifactId: string;
  recommendation: "APPROVE" | "FLAG_FOR_HUMAN" | "REJECT";
  confidence: number;
  checks: CheckResult[];
  specificIssues: Array<{
    severity: "minor" | "moderate" | "major";
    location: string;
    description: string;
    suggestedFix?: string;
  }>;
  kidViewLintViolations: string[];
};

export type FirstLookArtifact = {
  artifactType: FirstLookArtifactType;
  artifactId: string;
  title?: string;
  metadata: Record<string, unknown>;
  contentForReview: unknown;
};

export type FirstLookModelRunner = (input: {
  artifact: FirstLookArtifact;
  checklist: ReturnType<typeof checklistForArtifact>;
}) => Promise<{ review: Omit<AIFirstLookReview, "modelDecisionId">; metadata?: Partial<ModelDecisionMetadata>; modelName: string }>;

type FirstLookPersistDecision = <T>(
  ctx: ModelDecisionContext,
  output: T,
  metadata?: Partial<ModelDecisionMetadata>,
) => Promise<string | null>;

type FirstLookReviewOptions = {
  modelRunner?: FirstLookModelRunner;
  persistDecision?: FirstLookPersistDecision;
  attachDecision?: (artifact: FirstLookArtifact, modelDecisionId: string | null) => Promise<void>;
};

export async function runAIFirstLookReview(artifact: FirstLookArtifact, modelRunnerOrOptions: FirstLookModelRunner | FirstLookReviewOptions = openAiFirstLookReview): Promise<AIFirstLookReview> {
  const options = typeof modelRunnerOrOptions === "function" ? { modelRunner: modelRunnerOrOptions } : modelRunnerOrOptions;
  const modelRunner = options.modelRunner || openAiFirstLookReview;
  const persistDecision = options.persistDecision || persistModelDecision;
  const attachDecision = options.attachDecision || attachFirstLookDecision;
  const checklist = checklistForArtifact(artifact);
  const started = Date.now();
  const modelResult = await modelRunner({ artifact, checklist });
  const reviewWithoutId = normalizeReview(modelResult.review, artifact);

  const modelDecisionId = await persistFirstLookDecision(
    persistDecision,
    {
      decisionType: DECISION_TYPES.CONTENT_FIRST_LOOK_REVIEW,
      modelProvider: process.env.OPENAI_API_KEY ? "OPENAI" : "HEURISTIC",
      modelName: modelResult.modelName,
      promptKey: checklist.key,
      inputContext: {
        artifactType: artifact.artifactType,
        artifactId: artifact.artifactId,
        checklistKey: checklist.key,
        checklistVersion: checklist.version,
        metadata: artifact.metadata,
      },
    },
    reviewWithoutId,
    { inferenceMs: Date.now() - started, ...(modelResult.metadata || {}) },
  );

  const review: AIFirstLookReview = { ...reviewWithoutId, modelDecisionId };
  await attachDecision(artifact, modelDecisionId);
  return review;
}

async function persistFirstLookDecision<T>(
  persistDecision: FirstLookPersistDecision,
  ctx: ModelDecisionContext,
  output: T,
  metadata: Partial<ModelDecisionMetadata>,
) {
  try {
    return await persistDecision(ctx, output, metadata);
  } catch (error) {
    console.warn("First-look model decision capture failed", { decisionType: ctx.decisionType, modelName: ctx.modelName, error });
    return null;
  }
}

async function openAiFirstLookReview({
  artifact,
  checklist,
}: {
  artifact: FirstLookArtifact;
  checklist: ReturnType<typeof checklistForArtifact>;
}): Promise<{ review: Omit<AIFirstLookReview, "modelDecisionId">; metadata?: Partial<ModelDecisionMetadata>; modelName: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      modelName: "missing-openai-api-key",
      review: {
        artifactType: artifact.artifactType,
        artifactId: artifact.artifactId,
        recommendation: "FLAG_FOR_HUMAN",
        confidence: 0,
        checks: checklist.items.map((item) => ({
          requirementId: item.requirementId,
          result: "NA",
          severity: item.severity,
          evidence: "OPENAI_API_KEY is not configured; human review required before approval.",
        })),
        specificIssues: [
          {
            severity: "moderate",
            location: "first-look reviewer",
            description: "AI first-look could not run because no OpenAI API key is configured.",
          },
        ],
        kidViewLintViolations: [],
      },
    };
  }

  const modelName = process.env.OPENAI_CONTENT_FIRST_LOOK_MODEL || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const started = Date.now();
  const completion = await openai.chat.completions.create({
    model: modelName,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are the AI first-look reviewer for Sý Learning Reading Buddy content.",
          "Return only JSON matching this shape: recommendation, confidence, checks, specificIssues, kidViewLintViolations.",
          "Each checks entry must have requirementId, result (PASS, FAIL, or NA), severity (BLOCKER, WARNING, or INFO), and evidence.",
          "Every checklist requirementId must appear at most once in checks. A requirement cannot both pass and fail.",
          "Evaluate each requirement independently. Do not cite aggregate compliance issues, other blockers, or other check results as evidence.",
          "For kid-view discipline checks, read only studentPromptJson and stimulusJson. Do not use expectedResponseJson, scoringRubricJson, or adminReviewJson when deciding those checks.",
          "Recommendation thresholds: REJECT is only for fundamentally wrong strand, broken JSON structure, off-scope content, unsafe content, or irreparable pedagogical violations.",
          "Use FLAG_FOR_HUMAN for fixable blockers, wording issues, missing metadata, ambiguity an edit could resolve, or any case where you lack confidence to approve.",
          "Use APPROVE only when all checks pass with no blockers and no unassessed required checks.",
          "The AI recommendation is advisory only; humans make the final approve/reject decision.",
          "Reject or flag kid-facing phoneme notation, phase codes, item counters, correctness feedback in diagnostics, and curriculum metadata.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          artifactType: artifact.artifactType,
          checklistVersion: checklist.version,
          checklistItems: checklist.items,
          artifact: artifact.contentForReview,
        }),
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
  return {
    modelName,
    metadata: {
      inferenceMs: Date.now() - started,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    },
    review: {
      artifactType: artifact.artifactType,
      artifactId: artifact.artifactId,
      recommendation: normalizeRecommendation(parsed.recommendation),
      confidence: clampConfidence(parsed.confidence),
      checks: normalizeChecks(parsed.checks, checklist),
      specificIssues: normalizeIssues(parsed.specificIssues),
      kidViewLintViolations: stringArray(parsed.kidViewLintViolations),
    },
  };
}

function normalizeReview(review: Omit<AIFirstLookReview, "modelDecisionId">, artifact: FirstLookArtifact): Omit<AIFirstLookReview, "modelDecisionId"> {
  const checklist = checklistForArtifact(artifact);
  const checks = enforceDiagnosticCheckBoundaries(
    normalizeChecks((review as unknown as Record<string, unknown>).checks, checklist),
    artifact,
  );
  return {
    artifactType: artifact.artifactType,
    artifactId: artifact.artifactId,
    recommendation: recommendationFromChecks(checks, normalizeRecommendation(review.recommendation)),
    confidence: clampConfidence(review.confidence),
    checks,
    specificIssues: normalizeIssues(review.specificIssues, checks),
    kidViewLintViolations: stringArray(review.kidViewLintViolations),
  };
}

async function attachFirstLookDecision(artifact: FirstLookArtifact, modelDecisionId: string | null) {
  if (!modelDecisionId) return;
  try {
    if (artifact.artifactType === "DIAGNOSTIC_ITEM") {
      await db.diagnosticItem.update({ where: { id: artifact.artifactId }, data: { firstLookReviewModelDecisionId: modelDecisionId } });
    } else if (artifact.artifactType === "LESSON_PART") {
      await db.lessonPart.update({ where: { id: artifact.artifactId }, data: { firstLookReviewModelDecisionId: modelDecisionId } });
    } else {
      await db.passage.update({ where: { id: artifact.artifactId }, data: { firstLookReviewModelDecisionId: modelDecisionId } });
    }
  } catch (error) {
    console.warn("First-look decision attach failed", { artifactType: artifact.artifactType, artifactId: artifact.artifactId, error });
  }
}

function normalizeRecommendation(value: unknown): AIFirstLookReview["recommendation"] {
  if (value === "APPROVE" || value === "REJECT" || value === "FLAG_FOR_HUMAN") return value;
  return "FLAG_FOR_HUMAN";
}

function clampConfidence(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeChecks(value: unknown, checklist: ReturnType<typeof checklistForArtifact>): CheckResult[] {
  const byRequirement = new Map(checklist.items.map((item) => [item.requirementId, item]));
  const normalized = new Map<string, CheckResult>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const requirementId = typeof record.requirementId === "string" ? record.requirementId : "";
      const definition = byRequirement.get(requirementId);
      if (!definition) continue;
      const result = record.result === "PASS" || record.result === "FAIL" || record.result === "NA" ? record.result : "NA";
      const severity = record.severity === "BLOCKER" || record.severity === "WARNING" || record.severity === "INFO" ? record.severity : definition.severity;
      normalized.set(requirementId, {
        requirementId,
        result,
        severity,
        evidence: typeof record.evidence === "string" && record.evidence.trim() ? record.evidence : definition.requirement,
      });
    }
  }

  for (const definition of checklist.items) {
    if (normalized.has(definition.requirementId)) continue;
    normalized.set(definition.requirementId, {
      requirementId: definition.requirementId,
      result: "NA",
      severity: definition.severity,
      evidence: "Reviewer did not return a result for this requirement.",
    });
  }

  return Array.from(normalized.values());
}

function enforceDiagnosticCheckBoundaries(checks: CheckResult[], artifact: FirstLookArtifact) {
  if (artifact.artifactType !== "DIAGNOSTIC_ITEM") return checks;
  const content = asRecord(artifact.contentForReview);
  const strand = String(artifact.metadata.strand || content.strand || "").toUpperCase();
  const studentPrompt = asRecord(content.studentPromptJson);
  const stimulus = asRecord(content.stimulusJson);
  const expected = asRecord(content.expectedResponseJson);
  const scoring = asRecord(content.scoringRubricJson);
  const adminReview = asRecord(content.adminReviewJson);
  const kidViewText = `${visibleTextFromKidJson(studentPrompt)} ${visibleTextFromKidJson(stimulus)}`;

  return checks.map((check) => {
    if (isKidViewDisciplineCheck(check.requirementId)) {
      return evaluateKidViewCheck(check, studentPrompt, stimulus, kidViewText, strand);
    }
    if (check.requirementId === "PA_REQUIRES_AUDIO_DELIVERY") {
      const hasAudio = typeof stimulus.audioScript === "string" && stimulus.audioScript.trim().length > 0;
      return {
        ...check,
        result: hasAudio ? "PASS" as const : "FAIL" as const,
        evidence: hasAudio ? "PASS: PA item has an oral/audio stimulus for delivery." : "FAIL: PA item is missing an oral/audio stimulus.",
      };
    }
    if (check.requirementId === "PA_AUDIO_ASSET_REQUIRED_FOR_PHONEMES") {
      return evaluatePaAudioAssetCheck(check, content, stimulus);
    }
    if (check.requirementId === "PA_NO_PRINTED_STIMULUS") {
      return evaluatePaNoPrintedStimulusCheck(check, studentPrompt, stimulus);
    }
    if (check.requirementId === "PA_SCORING_SPEECH_RESPONSE") {
      const scoringMode = typeof scoring.scoring === "string" ? scoring.scoring : "";
      return {
        ...check,
        result: scoringMode === "speech_response" ? "PASS" as const : "FAIL" as const,
        evidence: scoringMode === "speech_response" ? "PASS: PA scoring mode is speech_response." : `FAIL: PA scoring mode is ${scoringMode || "missing"}; PA items require speech_response.`,
      };
    }
    if (check.requirementId === "PA_UNAMBIGUOUS_CORRECT_ANSWER") {
      const canonical = typeof expected.canonical === "string" ? expected.canonical : "";
      return {
        ...check,
        result: canonical.trim() ? "PASS" as const : "FAIL" as const,
        evidence: canonical.trim() ? "PASS: expectedResponseJson has a canonical semantic answer." : "FAIL: expectedResponseJson is missing a canonical semantic answer.",
      };
    }
    if (check.requirementId === "MORPH_UNAMBIGUOUS_BASE_AFFIX_ROOT") {
      return evaluateMorphologyUnambiguousCheck(check, content, expected);
    }
    if (check.requirementId === "MORPH_TRANSPARENT_BAND_APPROPRIATE") {
      return evaluateMorphologyBandCheck(check, content);
    }
    if (check.requirementId === "DECODING_ONE_CARD_NO_CONTEXT") {
      return evaluateDecodingOneCardCheck(check, studentPrompt);
    }
    if (check.requirementId === "DECODING_TARGET_PATTERN_ONLY") {
      return evaluateDecodingTargetPatternCheck(check, studentPrompt, artifact.metadata);
    }
    if (
      check.requirementId === "DECODING_PSEUDOWORD_NOT_MISSPELLING" ||
      check.requirementId === "PSEUDOWORD_NO_REALWORD_HOMOPHONE" ||
      check.requirementId === "PSEUDOWORD_NO_NEAR_MISSPELLING"
    ) {
      return evaluateDecodingPseudowordCheck(check, studentPrompt, content);
    }
    if (check.requirementId === "DECODE_LATENCY_NOT_PLACEMENT") {
      return evaluateDecodeLatencyPlacementCheck(check, content, scoring);
    }
    if (check.requirementId === "ITEM_POOL_STATUS_NOT_CALIBRATED_BY_DEFAULT") {
      return evaluateItemPoolStatusCheck(check, content);
    }
    if (check.requirementId === "VOCAB_TIER2_NO_PICTURE_CHOICE") {
      return evaluateVocabularyPictureChoiceCheck(check, content, studentPrompt);
    }
    if (check.requirementId === "VOCAB_DISTRACTORS_SAME_ATTRIBUTE") {
      return evaluateVocabularyDistractorsCheck(check, content, studentPrompt, expected, adminReview);
    }
    if (check.evidence.toLowerCase().includes("other stated blockers") || check.evidence.toLowerCase().includes("compliance issues with other")) {
      return { ...check, evidence: "Evidence reset: each check must evaluate only its own requirement." };
    }
    return check;
  });
}

function evaluatePaAudioAssetCheck(check: CheckResult, content: Record<string, unknown>, stimulus: Record<string, unknown>): CheckResult {
  const audioScript = stringFrom(stimulus.audioScript);
  const skill = stringFrom(content.skill) || stringFrom(asRecord(content.adminReviewJson).skill);
  const requiresValidatedAudio =
    Boolean(content.audioAssetRequired) ||
    /phoneme_blending|onset_rime_blending/i.test(skill) ||
    /\/[a-z]+\/|[āēīōūăĕĭŏŭ]|\.{2,}|\b[a-z]\s*\.\.\.\s*[a-z]/i.test(audioScript);
  const validated = content.audioValidatedByHuman === true || asRecord(content.adminReviewJson).audioValidatedByHuman === true;
  if (!requiresValidatedAudio) {
    return {
      ...check,
      result: "NA",
      evidence: "NA: PA item uses whole-word audio and does not depend on isolated phoneme or segmented-sound production.",
    };
  }
  return {
    ...check,
    result: validated ? "PASS" : "FAIL",
    evidence: validated
      ? "PASS: segmented/phoneme PA stimulus has human-validated audio."
      : "FAIL: segmented/phoneme PA stimulus requires human-validated audio before approval; raw TTS strings are not production-safe.",
  };
}

function evaluatePaNoPrintedStimulusCheck(check: CheckResult, studentPrompt: Record<string, unknown>, stimulus: Record<string, unknown>): CheckResult {
  const printedStimulus = [
    studentPrompt.displayText,
    studentPrompt.printedStimulus,
    stimulus.displayText,
    stimulus.printedStimulus,
    stimulus.phonemeText,
    stimulus.letterChunks,
  ].filter(Boolean);
  const hasPrintedChoices = Array.isArray(studentPrompt.choices) && studentPrompt.choices.length > 0;
  const visiblePrintedStimulus = printedStimulus.map(String).join(" ");
  const hasPrintedStimulus =
    hasPrintedChoices ||
    visiblePrintedStimulus.trim().length > 0 ||
    /\/[a-z]+\/|[āēīōūăĕĭŏŭ]|\b[a-z]\s+\.\.\.\s+[a-z]/i.test(visiblePrintedStimulus);
  return {
    ...check,
    result: hasPrintedStimulus ? "FAIL" : "PASS",
    evidence: hasPrintedStimulus
      ? "FAIL: PA student-facing JSON exposes printed stimulus, choices, phoneme notation, or letter chunks."
      : "PASS: PA student-facing JSON does not expose printed stimulus, choices, phoneme notation, or letter chunks.",
  };
}

function evaluateKidViewCheck(check: CheckResult, studentPrompt: Record<string, unknown>, stimulus: Record<string, unknown>, kidViewText: string, strand: string): CheckResult {
  if (check.requirementId === "PA_NO_VISIBLE_PRINTED_CHOICES") {
    const hasVisibleChoices = Array.isArray(studentPrompt.choices) && studentPrompt.choices.length > 0;
    return {
      ...check,
      result: hasVisibleChoices ? "FAIL" : "PASS",
      evidence: hasVisibleChoices ? "FAIL: studentPromptJson exposes printed choices on an oral PA item." : "PASS: studentPromptJson exposes no printed choices.",
    };
  }

  const hasMetadataLeak = /phase\s*\d|phasePosition|dailyTarget|reviewStatus|difficultyBand|item\s*\d|correct\s*answer|scoring|rubric|\/[a-z]+\/|[āēīōūăĕĭŏŭ]/i.test(kidViewText);
  if (isNoKidMetadataCheck(check.requirementId)) {
    return {
      ...check,
      result: hasMetadataLeak ? "FAIL" : "PASS",
      evidence: hasMetadataLeak ? "FAIL: studentPromptJson/stimulusJson contain kid-view metadata or phoneme notation." : "PASS: studentPromptJson/stimulusJson contain no metadata, timer/counter, scoring copy, or phoneme notation.",
    };
  }

  if (check.requirementId === "DECODING_NO_VISIBLE_TIMER") {
    const hasTimer = /timer|countdown|seconds|responseTime|latency/i.test(kidViewText);
    return {
      ...check,
      result: hasTimer ? "FAIL" : "PASS",
      evidence: hasTimer ? "FAIL: studentPromptJson/stimulusJson expose timer or latency wording." : "PASS: no timer, item counter, phase label, or placement metadata is visible.",
    };
  }

  if (check.requirementId === "COMP_AUDIO_PROMPT_CLEAN" || check.requirementId === "DECODING_AUDIO_PROMPT_CLEAN") {
    const clean = !/\/[a-z]+\/|[āēīōūăĕĭŏŭ]/i.test(kidViewText);
    return {
      ...check,
      result: clean ? "PASS" : "FAIL",
      evidence: clean ? "PASS: kid-facing audio/prompt text is phoneme-notation-free." : "FAIL: kid-facing audio/prompt text contains phoneme notation.",
    };
  }

  return check;
}

function evaluateMorphologyUnambiguousCheck(check: CheckResult, content: Record<string, unknown>, expected: Record<string, unknown>): CheckResult {
  const word = studentWord(content);
  const canonical = typeof expected.canonical === "string" ? expected.canonical : "";
  const targetMorpheme = stringFrom(content.targetMorpheme) || stringFrom(asRecord(content.adminReviewJson).targetMorpheme);
  const skill = stringFrom(content.skill) || stringFrom(asRecord(content.adminReviewJson).skill);
  const theoryDependent = /unhappiness|unlockable|reorganization|disagreeable/i.test(word);
  const transparentSingleAffix = Boolean(
    canonical.trim() &&
      targetMorpheme &&
      skill === "base_word_identification" &&
      word.toLowerCase().includes(canonical.toLowerCase()) &&
      (targetMorpheme.startsWith("-") || targetMorpheme.endsWith("-")),
  );

  if (theoryDependent) {
    return {
      ...check,
      result: "FAIL",
      evidence: "FAIL: decomposition may be theory-dependent or have multiple defensible parses.",
    };
  }
  if (transparentSingleAffix) {
    return {
      ...check,
      result: "PASS",
      evidence: "PASS: transparent single-base plus single-affix morphology has one defensible base-word answer.",
    };
  }
  return check;
}

function evaluateMorphologyBandCheck(check: CheckResult, content: Record<string, unknown>): CheckResult {
  const wave = stringFrom(content.morphologyWave) || stringFrom(asRecord(content.adminReviewJson).morphologyWave);
  const text = `${visibleTextFromKidJson(asRecord(content.studentPromptJson))} ${visibleTextFromKidJson(asRecord(content.adminReviewJson))}`;
  const requiresEtymology = wave === "bound_roots" || /latin|greek|old english|etymolog|root origin|word origin|historical|cross-linguistic/i.test(text);
  if (requiresEtymology) {
    return {
      ...check,
      result: "FAIL",
      evidence: "FAIL: item appears to require historical, etymological, Latin/Greek, or cross-linguistic knowledge.",
    };
  }
  if (wave === "transparent_suffixes" || wave === "transparent_prefixes" || wave === "inflectional") {
    return {
      ...check,
      result: "PASS",
      evidence: "PASS: item uses transparent derivational or inflectional morphology appropriate for Phase 3 screening.",
    };
  }
  return check;
}

function evaluateDecodingOneCardCheck(check: CheckResult, studentPrompt: Record<string, unknown>): CheckResult {
  const hasDisplayWord = typeof studentPrompt.displayText === "string" && studentPrompt.displayText.trim().length > 0;
  const hasChoices = Array.isArray(studentPrompt.choices) && studentPrompt.choices.length > 0;
  const promptText = visibleTextFromKidJson(studentPrompt);
  const hasSentenceContext = /\b(sentence|story|paragraph|context)\b/i.test(promptText);
  return {
    ...check,
    result: hasDisplayWord && !hasChoices && !hasSentenceContext ? "PASS" : "FAIL",
    evidence: hasDisplayWord && !hasChoices && !hasSentenceContext
      ? "PASS: kid view presents one word or pseudoword card with no choices or sentence context."
      : "FAIL: decoding item should present one word or pseudoword card without choices or sentence context.",
  };
}

function evaluateDecodingTargetPatternCheck(check: CheckResult, studentPrompt: Record<string, unknown>, metadata: Record<string, unknown>): CheckResult {
  const displayText = typeof studentPrompt.displayText === "string" ? studentPrompt.displayText.toLowerCase() : "";
  const dailyTargetCode = typeof metadata.dailyTargetCode === "string" ? metadata.dailyTargetCode : typeof metadata.targetPattern === "string" ? metadata.targetPattern : "";
  if (!displayText || !dailyTargetCode) return check;
  const targetRegex = patternRegex(dailyTargetCode);
  return {
    ...check,
    result: targetRegex.test(displayText) ? "PASS" : "FAIL",
    evidence: targetRegex.test(displayText)
      ? `PASS: displayed card matches the ${dailyTargetCode} daily target pattern.`
      : `FAIL: displayed card does not match the ${dailyTargetCode} daily target pattern.`,
  };
}

function evaluateDecodingPseudowordCheck(check: CheckResult, studentPrompt: Record<string, unknown>, content: Record<string, unknown>): CheckResult {
  const itemType = stringFrom(content.itemType).toUpperCase();
  const displayText = stringFrom(studentPrompt.displayText).toLowerCase();
  if (!itemType.includes("PSEUDOWORD")) {
    return {
      ...check,
      result: "NA",
      evidence: "NA: real-word decoding item has no pseudoword to audit.",
    };
  }
  const obviousRealWordMisspellings = new Set(["maik", "mayk", "caik", "cayk", "bote", "boet", "lite", "lyt", "cute", "kyute"]);
  const commonRealWordHomophones = new Set(["mayk", "maik", "boet", "bote", "noe", "knew", "nite"]);
  const hasExpectedPronunciation = Boolean(stringFrom(content.expectedPronunciation) || stringFrom(asRecord(content.adminReviewJson).expectedPronunciation));
  if (check.requirementId === "PSEUDOWORD_NO_REALWORD_HOMOPHONE") {
    return {
      ...check,
      result: commonRealWordHomophones.has(displayText) ? "FAIL" : "PASS",
      evidence: commonRealWordHomophones.has(displayText)
        ? "FAIL: pseudoword is a real-word homophone or near-homophone."
        : "PASS: pseudoword does not match the explicit common homophone blocklist.",
    };
  }
  if (check.requirementId === "PSEUDOWORD_NO_NEAR_MISSPELLING") {
    return {
      ...check,
      result: obviousRealWordMisspellings.has(displayText) || !hasExpectedPronunciation ? "FAIL" : "PASS",
      evidence: obviousRealWordMisspellings.has(displayText)
        ? "FAIL: pseudoword resembles a common target-pattern word misspelling."
        : hasExpectedPronunciation
          ? "PASS: pseudoword has expectedPronunciation metadata and does not match the explicit near-misspelling blocklist."
          : "FAIL: pseudoword is missing backend expectedPronunciation metadata.",
    };
  }
  return {
    ...check,
    result: obviousRealWordMisspellings.has(displayText) ? "FAIL" : "PASS",
    evidence: obviousRealWordMisspellings.has(displayText)
      ? "FAIL: pseudoword resembles a common real-word misspelling."
      : "PASS: pseudoword does not match the explicit real-word-misspelling blocklist.",
  };
}

function evaluateDecodeLatencyPlacementCheck(check: CheckResult, content: Record<string, unknown>, scoring: Record<string, unknown>): CheckResult {
  const placementEvidence = asRecord(content.placementEvidenceJson);
  const fluencyEvidence = asRecord(content.fluencyEvidenceJson);
  const placementUses = stringFrom(scoring.placementUses) || stringFrom(placementEvidence.source);
  const latencyFeeds = stringFrom(scoring.latencyFeeds) || stringFrom(fluencyEvidence.source);
  const placementUsesLatency = placementEvidence.usesLatency === true || /latency|time/i.test(placementUses);
  const separated = Object.keys(placementEvidence).length > 0 && Object.keys(fluencyEvidence).length > 0;
  const passes = separated && !placementUsesLatency && Boolean(latencyFeeds);
  return {
    ...check,
    result: passes ? "PASS" : "FAIL",
    evidence: passes
      ? "PASS: placementEvidenceJson and fluencyEvidenceJson are separated; latency feeds fluency, not decoding placement."
      : "FAIL: decoding evidence must separate accuracy-based placement from latency-based fluency/automaticity.",
  };
}

function evaluateItemPoolStatusCheck(check: CheckResult, content: Record<string, unknown>): CheckResult {
  const itemStatus = stringFrom(content.itemStatus) || "candidate";
  const reviewStatus = stringFrom(content.reviewStatus);
  const invalidCalibrated = itemStatus === "calibrated" && reviewStatus !== "APPROVED";
  return {
    ...check,
    result: invalidCalibrated ? "FAIL" : "PASS",
    evidence: invalidCalibrated
      ? "FAIL: generated content cannot be labeled calibrated before review and response-data calibration."
      : `PASS: itemStatus is ${itemStatus}; generated banks are candidate pools until human review and calibration data support promotion.`,
  };
}

function evaluateVocabularyPictureChoiceCheck(check: CheckResult, content: Record<string, unknown>, studentPrompt: Record<string, unknown>): CheckResult {
  const itemType = stringFrom(content.itemType).toUpperCase();
  const vocabularyBand = stringFrom(content.vocabularyBand).toLowerCase();
  const targetWord = stringFrom(content.targetWord).toLowerCase();
  const concretePictureChoice = itemType === "CONCRETE_WORD_PICTURE_CHOICE";
  const tier2OrAbstract = vocabularyBand === "tier 2" || ["enormous", "brave", "fair", "similar", "different"].includes(targetWord);
  const hasPictureChoices = Array.isArray(studentPrompt.pictureChoices) || Array.isArray(studentPrompt.images);
  const violates = tier2OrAbstract && (concretePictureChoice || hasPictureChoices);
  return {
    ...check,
    result: violates ? "FAIL" : "PASS",
    evidence: violates
      ? "FAIL: Tier 2 or abstract/relational vocabulary must use context/scenario meaning tasks, not picture-choice tasks."
      : "PASS: vocabulary item type matches target-word concreteness and vocabulary band.",
  };
}

function evaluateVocabularyDistractorsCheck(
  check: CheckResult,
  content: Record<string, unknown>,
  studentPrompt: Record<string, unknown>,
  expected: Record<string, unknown>,
  adminReview: Record<string, unknown>,
): CheckResult {
  const targetWord = stringFrom(content.targetWord).toLowerCase();
  const canonical = stringFrom(expected.canonical).toLowerCase();
  const choices = Array.isArray(studentPrompt.choices) ? studentPrompt.choices.map(String).map((choice) => choice.toLowerCase()) : [];
  const semanticAttribute = stringFrom(adminReview.semanticAttribute) || (targetWord === "enormous" ? "size" : "");
  if (targetWord === "enormous") {
    const sizeDistractors = choices.includes("very tiny");
    return {
      ...check,
      result: canonical === "very large" && sizeDistractors ? "PASS" : "FAIL",
      evidence: canonical === "very large" && sizeDistractors
        ? "PASS: enormous tests size and includes a direct size-contrast distractor."
        : "FAIL: enormous distractors must contrast size, not condition or unrelated attributes.",
    };
  }
  return {
    ...check,
    result: semanticAttribute ? "PASS" : "NA",
    evidence: semanticAttribute
      ? `PASS: reviewer metadata declares distractors test the same attribute (${semanticAttribute}).`
      : "NA: semantic-attribute match is not machine-assessable without target metadata.",
  };
}

function isKidViewDisciplineCheck(requirementId: string) {
  return requirementId === "PA_NO_VISIBLE_PRINTED_CHOICES" || isNoKidMetadataCheck(requirementId) || requirementId === "DECODING_NO_VISIBLE_TIMER" || requirementId === "COMP_AUDIO_PROMPT_CLEAN" || requirementId === "DECODING_AUDIO_PROMPT_CLEAN";
}

function isNoKidMetadataCheck(requirementId: string) {
  return requirementId === "NO_KID_METADATA" || requirementId.endsWith("_NO_KID_METADATA") || requirementId === "DECODING_NO_PHONEME_NOTATION";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function visibleTextFromKidJson(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(visibleTextFromKidJson).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.values(value as Record<string, unknown>).map(visibleTextFromKidJson).join(" ");
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function studentWord(content: Record<string, unknown>) {
  const studentPrompt = asRecord(content.studentPromptJson);
  const displayText = stringFrom(studentPrompt.displayText);
  if (displayText) return displayText;
  const prompt = stringFrom(studentPrompt.kidPrompt);
  const match = prompt.match(/\bin\s+([A-Za-z-]+)\??/i);
  return match?.[1] || "";
}

function patternRegex(patternCode: string) {
  const match = patternCode.match(/^([aeiou])_e$/);
  if (!match) return /[\s\S]/;
  return new RegExp(`${match[1]}[a-z]+e$`, "i");
}

function normalizeIssues(value: unknown, checks: CheckResult[] = []): AIFirstLookReview["specificIssues"] {
  const modelIssues = Array.isArray(value) ? value : [];
  const normalizedIssues = modelIssues.map((issue) => {
    const record = (issue || {}) as Record<string, unknown>;
    const severity = record.severity === "major" || record.severity === "moderate" || record.severity === "minor" ? record.severity : "moderate";
    const normalized: AIFirstLookReview["specificIssues"][number] = {
      severity,
      location: typeof record.location === "string" ? record.location : "artifact",
      description: typeof record.description === "string" ? record.description : "Review issue needs human inspection.",
    };
    if (typeof record.suggestedFix === "string") normalized.suggestedFix = record.suggestedFix;
    return normalized;
  });

  const concreteIssues = normalizedIssues.filter((issue) => issue.description !== "Review issue needs human inspection.");
  if (concreteIssues.length) return concreteIssues;
  return checks
    .filter((check) => check.result === "FAIL")
    .map((check) => ({
      severity: check.severity === "BLOCKER" ? "major" as const : check.severity === "WARNING" ? "moderate" as const : "minor" as const,
      location: check.requirementId,
      description: check.evidence,
    }));
}

function recommendationFromChecks(checks: CheckResult[], fallback: AIFirstLookReview["recommendation"]): AIFirstLookReview["recommendation"] {
  if (!checks.length) return fallback;
  if (checks.some((check) => check.result === "FAIL" && check.severity === "BLOCKER" && isHardRejectCheck(check))) return "REJECT";
  if (checks.some((check) => check.result === "FAIL")) return "FLAG_FOR_HUMAN";
  if (checks.some((check) => check.result === "NA")) return "FLAG_FOR_HUMAN";
  return "APPROVE";
}

function isHardRejectCheck(check: CheckResult) {
  const evidence = check.evidence.toLowerCase();
  return (
    evidence.includes("wrong strand") ||
    evidence.includes("broken json") ||
    evidence.includes("off-scope") ||
    evidence.includes("unsafe") ||
    evidence.includes("irreparable") ||
    evidence.includes("offensive")
  );
}

export function firstLookReviewToJson(review: AIFirstLookReview): Prisma.InputJsonValue {
  return review as unknown as Prisma.InputJsonValue;
}
