import { Prisma } from "@prisma/client";
import type { LearningPathItemInput } from "@/lib/learningPath";
import { buildDeterministicLearningLessons, lessonCacheKey, type LearningLessonBuild } from "@/lib/learningLessons";
import { db } from "@/lib/db";
import { resourceKey } from "@/lib/learningLessons";

type ResourceLike = {
  title: string;
  url: string;
  provider: string;
  description?: string | null;
};

export async function loadResourcesByStandard(gradeLevel: number, items: Pick<LearningPathItemInput, "standardCode">[]) {
  const standardCodes = items.map((item) => item.standardCode);
  const resourceLinks = await db.resourceLink.findMany({
    where: {
      OR: [
        { gradeLevel, standardCode: { in: standardCodes } },
        { gradeLevel: null, standardCode: { in: standardCodes } },
      ],
    },
  });
  return new Map<string, ResourceLike>(
    resourceLinks.flatMap((resource) => [
      [resourceKey(resource.gradeLevel || 0, resource.standardCode, resource.skill), resource],
      [resourceKey(resource.gradeLevel || 0, resource.standardCode, ""), resource],
    ]),
  );
}

export async function replaceLearningPathItems(learningPathId: string, items: LearningPathItemInput[]) {
  await db.learningPathItem.deleteMany({ where: { learningPathId } });
  await db.learningPathItem.createMany({
    data: items.map((item) => ({
      ...item,
      learningPathId,
      sourcePayload: item.sourcePayload as Prisma.InputJsonValue,
    })),
  });
  return db.learningPathItem.findMany({ where: { learningPathId }, orderBy: { order: "asc" } });
}

export async function replaceLearningLessons({
  learningPathId,
  userId,
  lessonBuilds,
}: {
  learningPathId: string;
  userId: string;
  lessonBuilds: LearningLessonBuild[];
}) {
  const savedPathItems = await db.learningPathItem.findMany({ where: { learningPathId }, orderBy: { order: "asc" } });
  await db.learningLesson.deleteMany({ where: { learningPathId } });
  for (const lessonBuild of lessonBuilds) {
    const matchingPathItem = savedPathItems.find((item) => item.order === lessonBuild.learningPathItemOrder);
    const lesson = await db.learningLesson.create({
      data: learningLessonCreateData({ learningPathId, learningPathItemId: matchingPathItem?.id, lessonBuild }),
    });
    await db.studentLessonProgress.upsert({
      where: { lessonId_userId: { lessonId: lesson.id, userId } },
      update: {},
      create: { lessonId: lesson.id, userId },
    });
  }
}

export async function updateLearningLessonFromBuild({
  learningPathId,
  lessonBuild,
}: {
  learningPathId: string;
  lessonBuild: LearningLessonBuild;
}) {
  const matchingPathItem = await db.learningPathItem.findFirst({
    where: { learningPathId, order: lessonBuild.learningPathItemOrder },
  });
  const existing = matchingPathItem
    ? await db.learningLesson.findUnique({ where: { learningPathItemId: matchingPathItem.id } })
    : await db.learningLesson.findFirst({ where: { learningPathId, priority: lessonBuild.priority } });
  if (!existing) return null;

  await db.learningLessonItem.deleteMany({ where: { lessonId: existing.id } });
  return db.learningLesson.update({
    where: { id: existing.id },
    data: {
      gradeLevel: lessonBuild.gradeLevel,
      standardCode: lessonBuild.standardCode,
      standardLabel: lessonBuild.standardLabel,
      skill: lessonBuild.skill,
      priority: lessonBuild.priority,
      title: lessonBuild.title,
      whyAssigned: lessonBuild.whyAssigned,
      lessonExplanation: lessonBuild.lessonExplanation,
      workedExample: lessonBuild.workedExample,
      resourceTitle: lessonBuild.resourceTitle,
      resourceUrl: lessonBuild.resourceUrl,
      resourceProvider: lessonBuild.resourceProvider,
      resourceDescription: lessonBuild.resourceDescription,
      heroResourceLink: lessonBuild.heroResourceLinkId ? { connect: { id: lessonBuild.heroResourceLinkId } } : { disconnect: true },
      guidedPractice: lessonBuild.guidedPractice as Prisma.InputJsonValue,
      independentPractice: lessonBuild.independentPractice as Prisma.InputJsonValue,
      exitTicket: lessonBuild.exitTicket as Prisma.InputJsonValue,
      masteryCheck: lessonBuild.masteryCheck as Prisma.InputJsonValue,
      retestRecommendation: lessonBuild.retestRecommendation,
      generatedBy: lessonBuild.generatedBy,
      aiStatus: lessonBuild.aiStatus,
      sourcePayload: lessonBuild.sourcePayload as Prisma.InputJsonValue,
      steps: {
        deleteMany: {},
        create: lessonStepCreateData(lessonBuild),
      },
      items: {
        create: lessonBuild.items.map((item) => ({
          itemType: item.itemType,
          title: item.title,
          content: item.content as Prisma.InputJsonValue,
          order: item.order,
        })),
      },
    },
  });
}

export async function applyStudentLessonReviewGate(learningPath: any, userId?: string) {
  if (!learningPath?.lessons?.length) return learningPath;
  const needsFallback = learningPath.lessons.some((lesson: any) => lesson.generatedBy === "AI_ENRICHED" && lesson.reviewStatus !== "APPROVED");
  if (!needsFallback) return learningPath;

  const gradeLevel = learningPath.session?.assessment?.grade || learningPath.lessons[0]?.gradeLevel || 6;
  const pathItems = learningPath.items || [];
  const responses = learningPath.session?.responses || [];
  const resourcesByStandard = await loadResourcesByStandard(gradeLevel, pathItems);
  const deterministic = buildDeterministicLearningLessons({ gradeLevel, pathItems, responses, resourcesByStandard });
  const deterministicByOrder = new Map(deterministic.map((lesson) => [lesson.learningPathItemOrder, lesson]));

  return {
    ...learningPath,
    lessons: learningPath.lessons.map((lesson: any) => {
      if (lesson.generatedBy !== "AI_ENRICHED" || lesson.reviewStatus === "APPROVED") return lesson;
      const pathItem = pathItems.find((item: any) => item.id === lesson.learningPathItemId || item.order === lesson.priority);
      const fallback = deterministicByOrder.get(pathItem?.order || lesson.priority);
      if (!fallback) return { ...lesson, aiStatus: "PENDING", generatedBy: "DETERMINISTIC" };
      return lessonFromBuild(lesson, fallback, userId);
    }),
  };
}

function learningLessonCreateData({
  learningPathId,
  learningPathItemId,
  lessonBuild,
}: {
  learningPathId: string;
  learningPathItemId?: string;
  lessonBuild: LearningLessonBuild;
}): Prisma.LearningLessonCreateInput {
  return {
    learningPath: { connect: { id: learningPathId } },
    learningPathItem: learningPathItemId ? { connect: { id: learningPathItemId } } : undefined,
    gradeLevel: lessonBuild.gradeLevel,
    standardCode: lessonBuild.standardCode,
    standardLabel: lessonBuild.standardLabel,
    skill: lessonBuild.skill,
    priority: lessonBuild.priority,
    title: lessonBuild.title,
    whyAssigned: lessonBuild.whyAssigned,
    lessonExplanation: lessonBuild.lessonExplanation,
    workedExample: lessonBuild.workedExample,
    resourceTitle: lessonBuild.resourceTitle,
    resourceUrl: lessonBuild.resourceUrl,
    resourceProvider: lessonBuild.resourceProvider,
    resourceDescription: lessonBuild.resourceDescription,
    heroResourceLink: lessonBuild.heroResourceLinkId ? { connect: { id: lessonBuild.heroResourceLinkId } } : undefined,
    guidedPractice: lessonBuild.guidedPractice as Prisma.InputJsonValue,
    independentPractice: lessonBuild.independentPractice as Prisma.InputJsonValue,
    exitTicket: lessonBuild.exitTicket as Prisma.InputJsonValue,
    masteryCheck: lessonBuild.masteryCheck as Prisma.InputJsonValue,
    retestRecommendation: lessonBuild.retestRecommendation,
    generatedBy: lessonBuild.generatedBy,
    aiStatus: lessonBuild.aiStatus,
    sourcePayload: lessonBuild.sourcePayload as Prisma.InputJsonValue,
    steps: {
      create: lessonStepCreateData(lessonBuild),
    },
    items: {
      create: lessonBuild.items.map((item) => ({
        itemType: item.itemType,
        title: item.title,
        content: item.content as Prisma.InputJsonValue,
        order: item.order,
      })),
    },
  };
}

function lessonFromBuild(existing: any, lessonBuild: LearningLessonBuild, userId?: string) {
  return {
    ...existing,
    gradeLevel: lessonBuild.gradeLevel,
    standardCode: lessonBuild.standardCode,
    standardLabel: lessonBuild.standardLabel,
    skill: lessonBuild.skill,
    priority: lessonBuild.priority,
    title: lessonBuild.title,
    whyAssigned: lessonBuild.whyAssigned,
    lessonExplanation: lessonBuild.lessonExplanation,
    workedExample: lessonBuild.workedExample,
    resourceTitle: lessonBuild.resourceTitle,
    resourceUrl: lessonBuild.resourceUrl,
    resourceProvider: lessonBuild.resourceProvider,
    resourceDescription: lessonBuild.resourceDescription,
    heroResourceLinkId: lessonBuild.heroResourceLinkId || null,
    heroResourceLink: lessonBuild.heroResource || existing.heroResourceLink,
    steps: (lessonBuild.steps || []).map((step) => ({
      id: `${existing.id}-step-${step.order}-fallback`,
      lessonId: existing.id,
      ...step,
    })),
    guidedPractice: lessonBuild.guidedPractice,
    independentPractice: lessonBuild.independentPractice,
    exitTicket: lessonBuild.exitTicket,
    masteryCheck: lessonBuild.masteryCheck,
    retestRecommendation: lessonBuild.retestRecommendation,
    generatedBy: "DETERMINISTIC",
    aiStatus: "PENDING",
    sourcePayload: {
      ...lessonBuild.sourcePayload,
      reviewFallbackForCacheKey: lessonCacheKey(lessonBuild),
    },
    progress: userId ? existing.progress : existing.progress,
    items: lessonBuild.items.map((item) => ({
      id: `${existing.id}-${item.order}-fallback`,
      lessonId: existing.id,
      itemType: item.itemType,
      title: item.title,
      content: item.content,
      order: item.order,
    })),
  };
}

function lessonStepCreateData(lessonBuild: LearningLessonBuild) {
  return (lessonBuild.steps || []).map((step) => ({
    order: step.order,
    stepType: step.stepType,
    title: step.title,
    bodyText: step.bodyText,
    narrationScript: step.narrationScript,
    audioUrl: step.audioUrl || null,
    imageUrl: step.imageUrl || null,
    imagePrompt: step.imagePrompt || null,
    checkQuestion: step.checkQuestion ? (step.checkQuestion as Prisma.InputJsonValue) : Prisma.JsonNull,
  }));
}
