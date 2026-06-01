import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { runAIFirstLookReview, type FirstLookModelRunner } from "@/lib/content/aiFirstLookReviewer";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { recordModelDecision, type ModelDecisionContext } from "@/lib/decisions/withModelDecisionLogging";
import { auditPassage, patternCodesFromDailyTarget } from "./passageAudit";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "./lessonAudit";
import { generatePart1Warmup } from "./lessonParts/part1Warmup";
import { generatePart2Concept } from "./lessonParts/part2Concept";
import { generatePart3Decoding } from "./lessonParts/part3Decoding";
import { generatePart4HeartVocab } from "./lessonParts/part4HeartVocab";
import { generatePart5Sentences } from "./lessonParts/part5Sentences";
import { generatePart6Encoding } from "./lessonParts/part6Encoding";
import { generatePart7ConnectedText } from "./lessonParts/part7ConnectedText";
import { generatePart8Comprehension } from "./lessonParts/part8Comprehension";
import type { GeneratedLessonPart, LessonGeneratorContext } from "./lessonParts/types";

export type LessonGenerationOptions = {
  phasePositionId: string;
  dailyTargetId: string;
  count?: number;
  firstLookModelRunner?: FirstLookModelRunner;
  recordDecision?: typeof recordModelDecision;
};

export type LessonGenerationResult = {
  insertedLessonIds: string[];
  failed: Array<{ dailyTargetCode: string; reasons: string[] }>;
};

export type LessonDraftGenerationParams = {
  phasePositionId: string;
  phaseNumber: number;
  phaseLabel: string;
  dailyTargetId: string;
  dailyTargetCode: string;
  targetPattern: string;
  targetWords: string[];
  pseudowords: string[];
  selectedPassageId: string;
};

export type LessonDraftModelRunner = (params: LessonDraftGenerationParams) => Promise<{ parts: GeneratedLessonPart[]; metadata?: { inputTokens?: number; outputTokens?: number; costUsd?: number } }>;

export async function generateLessonsForTarget(options: LessonGenerationOptions): Promise<LessonGenerationResult> {
  const count = options.count ?? 1;
  const insertedLessonIds: string[] = [];
  const failed: LessonGenerationResult["failed"] = [];
  for (let index = 0; index < count; index += 1) {
    const ctx = await buildLessonGeneratorContext(options.phasePositionId, options.dailyTargetId);
    const draft = await generateLessonDraft(ctx, { recordDecision: options.recordDecision });
    const audit = auditGeneratedLessonDraft(draft);
    if (!audit.canPersist) {
      failed.push({ dailyTargetCode: ctx.dailyTarget.code, reasons: audit.blockers });
      continue;
    }
    const lessonId = await persistLessonDraft(draft, ctx, options.firstLookModelRunner);
    insertedLessonIds.push(lessonId);
  }
  return { insertedLessonIds, failed };
}

export async function buildLessonGeneratorContext(phasePositionId: string, dailyTargetId: string): Promise<LessonGeneratorContext> {
  const [phasePosition, dailyTarget] = await Promise.all([
    db.phasePosition.findUnique({ where: { id: phasePositionId } }),
    db.dailyTarget.findUnique({ where: { id: dailyTargetId } }),
  ]);
  if (!phasePosition) throw new Error(`PhasePosition not found: ${phasePositionId}`);
  if (!dailyTarget) throw new Error(`DailyTarget not found: ${dailyTargetId}`);
  if (dailyTarget.phasePositionId !== phasePosition.id) throw new Error("DailyTarget does not belong to phase position.");
  const selectedPassage = await selectApprovedPassageForLesson(phasePosition.id, dailyTarget.code);
  if (!selectedPassage) {
    throw new Error(`No approved passage found for ${phasePosition.label} / ${dailyTarget.code}. Generate and approve a passage before lesson generation.`);
  }
  const heartWordsPreviewedThisLesson = ["said", "was", "they"];
  const heartWordsAssumedKnown = ["I", "a", "the", "to"];
  const vocabularyWords = ["gift", "pal"];
  const selectedPassageAudit = auditPassage(selectedPassage.text, {
    phasePosition,
    dailyTarget,
    heartWords: [...heartWordsPreviewedThisLesson, ...heartWordsAssumedKnown],
    vocabularyAllowlist: vocabularyWords,
  });
  return {
    phasePosition,
    dailyTarget,
    targetPattern: dailyTarget.code,
    targetWords: dailyTarget.exampleWords.slice(0, 5),
    reviewWords: [],
    pseudowords: dailyTarget.exampleNonwords.slice(0, 8),
    heartWordsPreviewedThisLesson,
    heartWordsAssumedKnown,
    vocabularyWords,
    selectedPassage,
    selectedPassageAudit,
  };
}

export async function generateLessonDraft(ctx: LessonGeneratorContext, options: {
  recordDecision?: typeof recordModelDecision;
  modelRunner?: LessonDraftModelRunner;
} = {}): Promise<GeneratedLessonDraft> {
  const recordDecision = options.recordDecision || recordModelDecision;
  const modelRunner = options.modelRunner || deterministicLessonPartRunner(ctx);
  const params: LessonDraftGenerationParams = {
    phasePositionId: ctx.phasePosition.id,
    phaseNumber: ctx.phasePosition.phaseNumber,
    phaseLabel: ctx.phasePosition.label,
    dailyTargetId: ctx.dailyTarget.id,
    dailyTargetCode: ctx.dailyTarget.code,
    targetPattern: ctx.targetPattern,
    targetWords: ctx.targetWords,
    pseudowords: ctx.pseudowords,
    selectedPassageId: ctx.selectedPassage?.id || "",
  };
  const decisionContext: ModelDecisionContext = {
    decisionType: DECISION_TYPES.LESSON_GENERATION,
    modelProvider: "HEURISTIC",
    modelName: "content-v3-lesson-part-generator-v1",
    promptKey: "content-v3-lesson-parts-phase3-entry-v1",
    inputContext: {
      phasePositionId: ctx.phasePosition.id,
      phaseNumber: ctx.phasePosition.phaseNumber,
      dailyTargetId: ctx.dailyTarget.id,
      dailyTargetCode: ctx.dailyTarget.code,
      targetPattern: ctx.targetPattern,
      selectedPassageId: ctx.selectedPassage?.id || null,
      partCount: 8,
    },
  };
  const parts = await recordDecision(decisionContext, async () => {
    const result = await modelRunner(params);
    return { output: result.parts, metadata: result.metadata };
  });
  return {
    phasePositionId: ctx.phasePosition.id,
    dailyTargetId: ctx.dailyTarget.id,
    phaseBand: ctx.phasePosition.phaseNumber,
    dailyTargetCode: ctx.dailyTarget.code,
    targetPattern: ctx.targetPattern,
    parts,
  };
}

export function deterministicLessonPartRunner(ctx: LessonGeneratorContext): LessonDraftModelRunner {
  return async () => ({
    parts: [
      generatePart1Warmup(ctx),
      generatePart2Concept(ctx),
      generatePart3Decoding(ctx),
      generatePart4HeartVocab(ctx),
      generatePart5Sentences(ctx),
      generatePart6Encoding(ctx),
      generatePart7ConnectedText(ctx),
      generatePart8Comprehension(ctx),
    ],
  });
}

async function persistLessonDraft(draft: GeneratedLessonDraft, ctx: LessonGeneratorContext, firstLookModelRunner?: FirstLookModelRunner) {
  const lesson = await db.lesson.create({
    data: {
      phasePositionId: draft.phasePositionId,
      dailyTargetId: draft.dailyTargetId,
      passageId: ctx.selectedPassage?.id,
      phaseBand: draft.phaseBand,
      dailyTargetCode: draft.dailyTargetCode,
      targetPattern: draft.targetPattern,
      targetLabel: ctx.dailyTarget.tutorLabel,
      lessonStatus: "candidate",
      lessonType: "STRUCTURED_LITERACY_8_PART",
      generatedBy: "content-v3-lesson-part-generator-v1",
      contentAuditStatus: "PENDING_REVIEW",
      reviewStatus: "PENDING",
    },
  });

  for (const part of draft.parts) {
    const created = await db.lessonPart.create({
      data: {
        lessonId: lesson.id,
        partNumber: part.partNumber,
        partLabel: part.partLabel,
        partType: part.partType,
        kidVisibleCopy: json(part.kidVisibleCopy),
        tutorVisibleCopy: json(part.tutorVisibleCopy),
        contentJson: json(part.contentJson),
        dailyTargetCode: draft.dailyTargetCode,
        targetPattern: draft.targetPattern,
        skillFocus: String(part.contentJson.skillFocus || part.partType),
        strandFocus: String(part.contentJson.strandFocus || "READING"),
        contentAuditJson: part.contentAuditJson ? json(part.contentAuditJson) : Prisma.JsonNull,
        wordTagsJson: part.wordTagsJson ? json(part.wordTagsJson) : Prisma.JsonNull,
        scoringRubricJson: part.scoringRubricJson ? json(part.scoringRubricJson) : Prisma.JsonNull,
        studentDisplayMode: part.studentDisplayMode || String(part.contentJson.studentDisplayMode || ""),
        responseMode: part.responseMode || String(part.contentJson.responseMode || ""),
        assistedModeAllowed: part.assistedModeAllowed,
        independentScoreEligible: part.independentScoreEligible,
        designNotes: part.designNotes,
        reviewStatus: "PENDING",
      },
    });
    await runAIFirstLookReview({
      artifactType: "LESSON_PART",
      artifactId: created.id,
      metadata: {
        lessonId: lesson.id,
        partNumber: part.partNumber,
        partType: part.partType,
        dailyTargetCode: draft.dailyTargetCode,
        targetPattern: draft.targetPattern,
      },
      contentForReview: {
        kidVisibleCopy: part.kidVisibleCopy,
        tutorVisibleCopy: part.tutorVisibleCopy,
        contentJson: part.contentJson,
      },
    }, firstLookModelRunner ? { modelRunner: firstLookModelRunner } : undefined);
  }
  return lesson.id;
}

async function selectApprovedPassageForLesson(phasePositionId: string, dailyTargetCode: string) {
  const passages = await db.passage.findMany({
    where: { phasePositionId, reviewStatus: "APPROVED", retiredAt: null },
    orderBy: [{ decodabilityScore: "desc" }, { createdAt: "asc" }],
  });
  return passages.find((passage) => passageTargetsDailyTarget(passage, dailyTargetCode)) ?? null;
}

function passageTargetsDailyTarget(passage: { sourceMetadataJson: unknown; contentAuditJson: unknown }, dailyTargetCode: string) {
  return JSON.stringify([passage.sourceMetadataJson, passage.contentAuditJson]).includes(dailyTargetCode);
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
