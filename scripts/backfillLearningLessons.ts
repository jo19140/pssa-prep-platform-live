import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildLearningLessons, resourceKey } from "@/lib/learningLessons";

async function main() {
  const paths = await db.learningPath.findMany({
    where: { lessons: { none: {} } },
    include: {
      items: { orderBy: { order: "asc" } },
      session: { include: { responses: true, assessment: true } },
    },
  });

  let created = 0;
  process.env.OPENAI_API_KEY = "";

  for (const path of paths) {
    const gradeLevel = path.session.assessment.grade || 6;
    const standardCodes = path.items.map((item) => item.standardCode);
    const resources = await db.resourceLink.findMany({
      where: {
        OR: [
          { gradeLevel, standardCode: { in: standardCodes } },
          { gradeLevel: null, standardCode: { in: standardCodes } },
        ],
      },
    });
    const resourcesByStandard = new Map(
      resources.flatMap((resource) => [
        [resourceKey(resource.gradeLevel || 0, resource.standardCode, resource.skill), resource],
        [resourceKey(resource.gradeLevel || 0, resource.standardCode, ""), resource],
      ]),
    );
    const lessonBuilds = await buildLearningLessons({
      gradeLevel,
      pathItems: path.items.map((item) => ({
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
        sourcePayload: typeof item.sourcePayload === "object" && item.sourcePayload ? item.sourcePayload as Record<string, unknown> : {},
      })),
      responses: path.session.responses,
      resourcesByStandard,
    });

    for (const lessonBuild of lessonBuilds) {
      const matchingPathItem = path.items.find((item) => item.order === lessonBuild.learningPathItemOrder);
      const lesson = await db.learningLesson.create({
        data: {
          learningPathId: path.id,
          learningPathItemId: matchingPathItem?.id,
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
      await db.studentLessonProgress.upsert({
        where: { lessonId_userId: { lessonId: lesson.id, userId: path.session.userId } },
        update: {},
        create: { lessonId: lesson.id, userId: path.session.userId },
      });
      created += 1;
    }
  }

  console.log(`Backfilled ${created} learning lessons across ${paths.length} learning paths.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
