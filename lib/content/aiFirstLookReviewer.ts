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
      checks: normalizeChecks(parsed.checks, checklist, parsed),
      specificIssues: normalizeIssues(parsed.specificIssues),
      kidViewLintViolations: stringArray(parsed.kidViewLintViolations),
    },
  };
}

function normalizeReview(review: Omit<AIFirstLookReview, "modelDecisionId">, artifact: FirstLookArtifact): Omit<AIFirstLookReview, "modelDecisionId"> {
  return {
    artifactType: artifact.artifactType,
    artifactId: artifact.artifactId,
    recommendation: normalizeRecommendation(review.recommendation),
    confidence: clampConfidence(review.confidence),
    checks: normalizeChecks((review as unknown as Record<string, unknown>).checks, checklistForArtifact(artifact), review),
    specificIssues: normalizeIssues(review.specificIssues),
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

function normalizeChecks(value: unknown, checklist: ReturnType<typeof checklistForArtifact>, legacySource?: unknown): CheckResult[] {
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

  if (normalized.size === 0 && legacySource && typeof legacySource === "object") {
    const source = legacySource as Record<string, unknown>;
    const legacyPassed = new Set(stringArray(source.checksPassed));
    const legacyFailed = new Set(stringArray(source.checksFailed));
    for (const definition of checklist.items) {
      const passed = legacyPassed.has(definition.requirement);
      const failed = legacyFailed.has(definition.requirement);
      if (!passed && !failed) continue;
      normalized.set(definition.requirementId, {
        requirementId: definition.requirementId,
        result: failed ? "FAIL" : "PASS",
        severity: definition.severity,
        evidence: definition.requirement,
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

function normalizeIssues(value: unknown): AIFirstLookReview["specificIssues"] {
  if (!Array.isArray(value)) return [];
  return value.map((issue) => {
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
}

export function firstLookReviewToJson(review: AIFirstLookReview): Prisma.InputJsonValue {
  return review as unknown as Prisma.InputJsonValue;
}
