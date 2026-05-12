import { PrismaClient } from "@prisma/client";
import { sceneForLessonSkill } from "../lib/lessonVisuals";

const db = new PrismaClient();

type AuditIssue = {
  title: string;
  gradeLevel: number;
  skill: string;
  expectedScene: string;
  actualScene: string;
  issue: string;
};

function asRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  return {};
}

function sectionItems(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asRecord(item));
}

async function main() {
  const lessons = await db.learningLesson.findMany({
    where: { generatedBy: "PREBUILT_AI_LIBRARY" },
    orderBy: [{ gradeLevel: "asc" }, { skill: "asc" }, { title: "asc" }],
  });

  const issues: AuditIssue[] = [];
  let lessonsWithImagePrompt = 0;
  let lessonsWithImageUrl = 0;
  let practiceItems = 0;
  let practiceItemsWithVisual = 0;
  let practiceItemsWithImagePrompt = 0;
  let practiceItemsWithImageUrl = 0;

  for (const lesson of lessons) {
    const sourcePayload = asRecord(lesson.sourcePayload);
    const visual = asRecord(sourcePayload.visual);
    const expectedScene = sceneForLessonSkill(lesson.skill);
    const actualScene = String(visual.scene || "missing");

    if (actualScene !== expectedScene) {
      issues.push({
        title: lesson.title,
        gradeLevel: lesson.gradeLevel,
        skill: lesson.skill,
        expectedScene,
        actualScene,
        issue: "Lesson visual scene does not match the skill category.",
      });
    }

    if (typeof sourcePayload.imagePrompt === "string" || typeof visual.imagePrompt === "string") lessonsWithImagePrompt += 1;
    if (typeof sourcePayload.imageUrl === "string" || typeof visual.imageUrl === "string") lessonsWithImageUrl += 1;

    for (const section of [lesson.guidedPractice, lesson.independentPractice, lesson.exitTicket, lesson.masteryCheck]) {
      for (const item of sectionItems(section)) {
        practiceItems += 1;
        const itemVisual = asRecord(item.visual);
        if (Object.keys(itemVisual).length) practiceItemsWithVisual += 1;
        if (typeof item.imagePrompt === "string" || typeof itemVisual.imagePrompt === "string") practiceItemsWithImagePrompt += 1;
        if (typeof item.imageUrl === "string" || typeof itemVisual.imageUrl === "string") practiceItemsWithImageUrl += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        lessonsAudited: lessons.length,
        mismatchedLessonVisuals: issues.length,
        lessonsWithImagePrompt,
        lessonsWithImageUrl,
        practiceItems,
        practiceItemsWithVisual,
        practiceItemsWithImagePrompt,
        practiceItemsWithImageUrl,
        note:
          lessonsWithImageUrl === 0 && practiceItemsWithImageUrl === 0
            ? "No stored bitmap image URLs were found. Lessons currently use purposeful generated visual panels plus imagePrompt metadata, not persisted AI image files."
            : "Some stored bitmap image URLs were found. Review those separately for source and purpose.",
        sampleIssues: issues.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
