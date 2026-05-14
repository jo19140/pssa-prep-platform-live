import { Prisma } from "@prisma/client";
import { logAiFailure } from "@/lib/aiTelemetry";
import { db } from "@/lib/db";
import { gradeTdaEssay } from "@/lib/essayGrader";
import { buildLearningLessons, lessonCacheKey } from "@/lib/learningLessons";
import { generateLessonImageForPayload, lessonImageGenerationEnabled } from "@/lib/lessonImageGeneration";
import { generateStepAudio } from "@/lib/lessonStepAudio";
import { buildDeterministicLearningPath, enrichLearningPathWithAi, type LearningPathBuild } from "@/lib/learningPath";
import { loadResourcesByStandard, updateLearningLessonFromBuild } from "@/lib/learningLessonPersistence";
import { recomputeReportForSession } from "@/lib/reportSummaryBuilder";

export async function processAiJob(jobId: string) {
  const job = await db.aiJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`AI job not found: ${jobId}`);
  if (job.status === "COMPLETED") return job;

  await db.aiJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 }, lastError: null },
  });

  try {
    if (job.jobType === "ESSAY_GRADING") await processEssayGradingJob(job.sessionId, job.targetId);
    else if (job.jobType === "LESSON_ENRICHMENT") await processLessonEnrichmentJob(job.sessionId);
    else if (job.jobType === "LEARNING_PATH_ENRICHMENT") await processLearningPathEnrichmentJob(job.sessionId);
    else throw new Error(`Unsupported AI job type: ${job.jobType}`);

    return db.aiJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date(), lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI job failure";
    logAiFailure({
      scope: `aiJobProcessor.${job.jobType}`,
      error,
      context: { jobId: job.id, sessionId: job.sessionId, targetId: job.targetId },
    });
    await db.aiJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: message },
    });
    throw error;
  }
}

async function processEssayGradingJob(sessionId: string, responseRecordId: string | null) {
  if (!responseRecordId) throw new Error("ESSAY_GRADING job missing targetId");
  const response = await db.responseRecord.findUnique({
    where: { id: responseRecordId },
    include: { session: { include: { assessment: true } }, essayEvaluation: true },
  });
  if (!response) throw new Error("Response record not found");
  if (response.sessionId !== sessionId) throw new Error("Response record does not belong to job session");
  if (response.questionType !== "TDA") return;
  if (response.essayEvaluation) {
    await recomputeReportForSession(sessionId);
    return;
  }

  const payload = response.answerPayload as any;
  const essayGrade = await gradeTdaEssay({
    essay: String(payload?.essay || ""),
    prompt: String(payload?.prompt || ""),
    passage: String(payload?.passage || ""),
    gradeLevel: Number(payload?.gradeLevel || response.session.assessment.grade || 6),
    rubric: String(payload?.rubric || ""),
  });
  await db.$transaction(async (tx) => {
    await tx.responseRecord.update({
      where: { id: response.id },
      data: {
        scorePointsEarned: essayGrade.score,
        maxPoints: essayGrade.maxScore,
        isCorrect: essayGrade.score >= 3,
        errorPattern: essayGrade.score >= 3 ? "tda_on_track" : "tda_needs_revision",
      },
    });
    await tx.essayEvaluation.upsert({
      where: { responseRecordId: response.id },
      update: essayEvaluationData(essayGrade),
      create: { responseRecordId: response.id, ...essayEvaluationData(essayGrade) },
    });
  });
  await recomputeReportForSession(sessionId);
}

async function processLessonEnrichmentJob(sessionId: string) {
  const learningPath = await db.learningPath.findUnique({
    where: { sessionId },
    include: {
      session: { include: { assessment: true } },
      items: { orderBy: { order: "asc" } },
    },
  });
  if (!learningPath) throw new Error("Learning path not found");

  const responses = await db.responseRecord.findMany({ where: { sessionId }, include: { essayEvaluation: true } });
  const gradeLevel = learningPath.session.assessment.grade || Number((responses[0]?.answerPayload as any)?.gradeLevel || 6);
  const pathItems = learningPath.items.map((item) => ({
    order: item.order,
    standardCode: item.standardCode,
    standardLabel: item.standardLabel,
    skill: item.skill,
    priority: item.priority,
    title: item.title,
    recommendation: item.recommendation,
    activityType: item.activityType,
    difficulty: item.difficulty,
    estimatedMinutes: item.estimatedMinutes,
    rationale: item.rationale,
    practicePrompt: item.practicePrompt,
    aiExplanation: item.aiExplanation,
    sourcePayload: item.sourcePayload as Record<string, unknown>,
  }));
  const resourcesByStandard = await loadResourcesByStandard(gradeLevel, pathItems);
  const lessonBuilds = await buildLearningLessons({ gradeLevel, pathItems, responses, resourcesByStandard });
  for (const lessonBuild of lessonBuilds) {
    const updatedLesson = await updateLearningLessonFromBuild({
      learningPathId: learningPath.id,
      lessonBuild: { ...lessonBuild, generatedBy: "AI_ENRICHED", aiStatus: "COMPLETED" },
    });
    if (updatedLesson && lessonBuild.generatedBy === "AI_ENRICHED" && lessonBuild.aiStatus === "COMPLETED") {
      await generateStepAssets(updatedLesson.id);
      const cacheKey = lessonCacheKey(lessonBuild);
      const cache = await db.lessonCache.findUnique({ where: { cacheKey } });
      if (cache) {
        await db.learningLesson.update({
          where: { id: updatedLesson.id },
          data: { reviewStatus: cache.reviewStatus },
        });
        await db.lessonReview.updateMany({
          where: { lessonCacheId: cache.id, status: "PENDING", lessonId: null },
          data: { lessonId: updatedLesson.id },
        });
      }
    }
  }
}

async function generateStepAssets(lessonId: string) {
  const lesson = await db.learningLesson.findUnique({ where: { id: lessonId }, include: { steps: { orderBy: { order: "asc" } } } });
  if (!lesson?.steps.length) return;

  const imageSteps = lesson.steps.filter((step) => step.imagePrompt).slice(0, 2);
  const audioResults = await Promise.allSettled(
    lesson.steps.map(async (step) => {
      const audioUrl = await generateStepAudio({ stepId: step.id, narrationScript: step.narrationScript });
      if (audioUrl) await db.lessonStep.update({ where: { id: step.id }, data: { audioUrl } });
    }),
  );
  audioResults.forEach((result, index) => {
    if (result.status === "rejected") {
      logAiFailure({
        scope: "lessonStepAudio.promise",
        error: result.reason,
        context: { lessonId, stepId: lesson.steps[index]?.id },
      });
    }
  });

  if (!lessonImageGenerationEnabled()) return;
  await Promise.allSettled(
    imageSteps.map(async (step) => {
      const result = await generateLessonImageForPayload({
        title: step.title,
        skill: lesson.skill,
        gradeLevel: lesson.gradeLevel,
        lessonExplanation: step.bodyText,
        workedExample: step.narrationScript,
        sourcePayload: { imagePrompt: step.imagePrompt },
        force: true,
      });
      if (result.imageUrl) await db.lessonStep.update({ where: { id: step.id }, data: { imageUrl: result.imageUrl } });
    }),
  );
}

async function processLearningPathEnrichmentJob(sessionId: string) {
  const learningPath = await db.learningPath.findUnique({
    where: { sessionId },
    include: {
      session: { include: { user: true, assessment: true } },
      items: { orderBy: { order: "asc" } },
    },
  });
  if (!learningPath) throw new Error("Learning path not found");

  const deterministicPath: LearningPathBuild = {
    generatedBy: "DETERMINISTIC",
    aiStatus: "NOT_REQUESTED",
    aiSummary: learningPath.aiSummary,
    items: learningPath.items.map((item) => ({
      order: item.order,
      standardCode: item.standardCode,
      standardLabel: item.standardLabel,
      skill: item.skill,
      priority: item.priority,
      title: item.title,
      recommendation: item.recommendation,
      activityType: item.activityType,
      difficulty: item.difficulty,
      estimatedMinutes: item.estimatedMinutes,
      rationale: item.rationale,
      practicePrompt: item.practicePrompt,
      aiExplanation: item.aiExplanation,
      sourcePayload: item.sourcePayload as Record<string, unknown>,
    })),
  };
  const enriched = await enrichLearningPathWithAi({
    studentName: learningPath.session.user.name,
    assessmentTitle: learningPath.session.assessment.title,
    deterministicPath,
  });

  await db.learningPath.update({
    where: { id: learningPath.id },
    data: {
      generatedBy: enriched.generatedBy,
      aiStatus: enriched.aiStatus,
      aiSummary: enriched.aiSummary,
    },
  });
  for (const item of enriched.items) {
    await db.learningPathItem.update({
      where: { learningPathId_order: { learningPathId: learningPath.id, order: item.order } },
      data: { aiExplanation: item.aiExplanation },
    });
  }
}

function essayEvaluationData(essayGrade: Awaited<ReturnType<typeof gradeTdaEssay>>) {
  return {
    score: essayGrade.score,
    maxScore: essayGrade.maxScore,
    performanceBand: essayGrade.performanceBand,
    strengths: essayGrade.strengths as Prisma.InputJsonValue,
    areasForGrowth: essayGrade.areasForGrowth as Prisma.InputJsonValue,
    feedback: essayGrade.feedback,
    nextSteps: essayGrade.nextSteps as Prisma.InputJsonValue,
    rubricBreakdown: { ...essayGrade.rubricBreakdown, scoringRationale: essayGrade.scoringRationale } as Prisma.InputJsonValue,
    gradingProvider: essayGrade.gradingProvider,
  };
}
