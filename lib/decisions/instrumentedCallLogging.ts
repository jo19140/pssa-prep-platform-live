import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import {
  persistModelDecision,
  recordModelDecision,
  type ModelDecisionMetadata,
  type ModelProvider,
} from "@/lib/decisions/withModelDecisionLogging";
import { PROMPT_KEYS } from "@/lib/prompts/registry";

type RecordDecision = typeof recordModelDecision;
type PersistDecision = typeof persistModelDecision;

export async function recordTdaScoringDecision<T>({
  modelName,
  gradeLevel,
  essayWordCount,
  promptLength,
  passageLength,
  rubricKey = "pssa-tda-4point",
  exemplarGrade,
  run,
  recordDecision = recordModelDecision,
}: {
  modelName: string;
  gradeLevel: number;
  essayWordCount: number;
  promptLength: number;
  passageLength: number;
  rubricKey?: string;
  exemplarGrade: number;
  run: () => Promise<{ output: T; metadata?: Partial<ModelDecisionMetadata> }>;
  recordDecision?: RecordDecision;
}) {
  return recordDecision(
    {
      decisionType: DECISION_TYPES.TDA_SCORING,
      modelProvider: "OPENAI",
      modelName,
      promptKey: PROMPT_KEYS.TDA_SCORING_V1,
      inputContext: {
        gradeLevel,
        essayWordCount,
        promptLength,
        passageLength,
        rubricKey,
        exemplarGrade,
      },
    },
    run,
  );
}

export async function captureDistractorGenerationDecision<T>({
  modelName,
  gradeLevel,
  lessonCount,
  standardCodes,
  skills,
  output,
  metadata,
  persistDecision = persistModelDecision,
}: {
  modelName: string;
  gradeLevel: number;
  lessonCount: number;
  standardCodes: string[];
  skills: string[];
  output: T;
  metadata: Partial<ModelDecisionMetadata>;
  persistDecision?: PersistDecision;
}) {
  const decisionId = await bestEffortPersist(
    persistDecision,
    {
      decisionType: DECISION_TYPES.DISTRACTOR_GENERATION,
      modelProvider: "OPENAI",
      modelName,
      promptKey: PROMPT_KEYS.LESSON_DISTRACTOR_GENERATION_V1,
      inputContext: {
        gradeLevel,
        lessonCount,
        standardCodes,
        skills,
      },
    },
    output,
    metadata,
  );
  return { output, decisionId };
}

export async function recordDistractorCriticDecision<T>({
  modelName,
  parentDecisionId,
  gradeLevel,
  standardCode,
  skill,
  stepCount,
  practiceCounts,
  run,
  recordDecision = recordModelDecision,
}: {
  modelName: string;
  parentDecisionId?: string;
  gradeLevel: number;
  standardCode: string;
  skill: string;
  stepCount: number;
  practiceCounts: { guided: number; independent: number; exit: number; mastery: number };
  run: () => Promise<{ output: T; metadata?: Partial<ModelDecisionMetadata> }>;
  recordDecision?: RecordDecision;
}) {
  return recordDecision(
    {
      decisionType: DECISION_TYPES.DISTRACTOR_CRITIC,
      modelProvider: "OPENAI",
      modelName,
      promptKey: PROMPT_KEYS.LESSON_DISTRACTOR_CRITIC_V1,
      parentDecisionId,
      inputContext: {
        gradeLevel,
        standardCode,
        skill,
        stepCount,
        practiceCounts,
      },
    },
    run,
  );
}

export async function captureHeroVideoMatchDecision<T>({
  gradeLevel,
  standardCode,
  skill,
  candidateCount,
  output,
  persistDecision = persistModelDecision,
}: {
  gradeLevel: number;
  standardCode: string;
  skill: string;
  candidateCount: number;
  output: T;
  persistDecision?: PersistDecision;
}) {
  await bestEffortPersist(
    persistDecision,
    {
      decisionType: DECISION_TYPES.HERO_VIDEO_MATCH,
      modelProvider: "HEURISTIC",
      modelName: "resource-link-token-overlap-v1",
      promptKey: PROMPT_KEYS.HERO_VIDEO_MATCH_HEURISTIC_V1,
      inputContext: {
        gradeLevel,
        standardCode,
        skill,
        candidateCount,
      },
    },
    output,
    { inferenceMs: 0, costUsd: 0 },
  );
  return output;
}

export async function captureGistGradingDecision<T>({
  modelName = "server-short-response-gist-v1",
  modelProvider = "HEURISTIC",
  studentEventId,
  studentUserId,
  assessmentId,
  responseRecordId,
  questionId,
  standardCode,
  questionType,
  responseWordCount,
  hasSampleAnswer,
  output,
  persistDecision = persistModelDecision,
}: {
  modelName?: string;
  modelProvider?: ModelProvider;
  studentEventId?: string;
  studentUserId: string;
  assessmentId: string;
  responseRecordId: string;
  questionId: number;
  standardCode: string;
  questionType: string;
  responseWordCount: number;
  hasSampleAnswer: boolean;
  output: T;
  persistDecision?: PersistDecision;
}) {
  await bestEffortPersist(
    persistDecision,
    {
      decisionType: DECISION_TYPES.GIST_GRADING,
      modelProvider,
      modelName,
      promptKey: PROMPT_KEYS.GIST_GRADING_HEURISTIC_V1,
      studentEventId,
      studentUserId,
      inputContext: {
        assessmentId,
        responseRecordId,
        questionId,
        standardCode,
        questionType,
        responseWordCount,
        hasSampleAnswer,
      },
    },
    output,
    { inferenceMs: 0, costUsd: 0 },
  );
  return output;
}

async function bestEffortPersist<T>(
  persistDecision: PersistDecision,
  ctx: Parameters<PersistDecision>[0],
  output: T,
  metadata: Partial<ModelDecisionMetadata>,
) {
  try {
    return await persistDecision(ctx, output, metadata);
  } catch (error) {
    console.warn("Model decision capture failed", { decisionType: ctx.decisionType, modelName: ctx.modelName, error });
    return null;
  }
}
