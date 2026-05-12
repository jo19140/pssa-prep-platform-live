import { Prisma } from "@prisma/client";
import type { LearningPathItemInput } from "@/lib/learningPath";
import type { LearningLessonBuild } from "@/lib/learningLessons";
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
      guidedPractice: lessonBuild.guidedPractice as Prisma.InputJsonValue,
      independentPractice: lessonBuild.independentPractice as Prisma.InputJsonValue,
      exitTicket: lessonBuild.exitTicket as Prisma.InputJsonValue,
      masteryCheck: lessonBuild.masteryCheck as Prisma.InputJsonValue,
      retestRecommendation: lessonBuild.retestRecommendation,
      generatedBy: lessonBuild.generatedBy,
      aiStatus: lessonBuild.aiStatus,
      sourcePayload: lessonBuild.sourcePayload as Prisma.InputJsonValue,
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
    guidedPractice: lessonBuild.guidedPractice as Prisma.InputJsonValue,
    independentPractice: lessonBuild.independentPractice as Prisma.InputJsonValue,
    exitTicket: lessonBuild.exitTicket as Prisma.InputJsonValue,
    masteryCheck: lessonBuild.masteryCheck as Prisma.InputJsonValue,
    retestRecommendation: lessonBuild.retestRecommendation,
    generatedBy: lessonBuild.generatedBy,
    aiStatus: lessonBuild.aiStatus,
    sourcePayload: lessonBuild.sourcePayload as Prisma.InputJsonValue,
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
