import { Prisma, PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { generateLessonImageForPayload } from "../lib/lessonImageGeneration";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

const gradeLevel = Number(process.env.LESSON_IMAGE_GRADE_LEVEL || "6");
const limit = Number(process.env.LESSON_IMAGE_LIMIT || "5");
const force = process.env.LESSON_IMAGE_FORCE_REGENERATE === "true";

async function main() {
  process.env.OPENAI_LESSON_IMAGES_ENABLED = "true";

  const lessons = await db.learningLesson.findMany({
    where: { gradeLevel },
    orderBy: [{ generatedBy: "desc" }, { title: "asc" }],
    take: 100,
  });

  let generated = 0;
  const results: Array<{ id: string; title: string; imageUrl?: string; status: string }> = [];

  for (const lesson of lessons) {
    if (generated >= limit) break;

    const sourcePayload = asRecord(lesson.sourcePayload);
    const visual = asRecord(sourcePayload.visual);
    if (!force && (typeof sourcePayload.imageUrl === "string" || typeof visual.imageUrl === "string")) continue;

    const result = await generateLessonImageForPayload({
      title: lesson.title,
      skill: lesson.skill,
      gradeLevel: lesson.gradeLevel,
      lessonExplanation: lesson.lessonExplanation,
      workedExample: lesson.workedExample,
      sourcePayload,
      force,
    });

    await db.learningLesson.update({
      where: { id: lesson.id },
      data: { sourcePayload: result.sourcePayload as Prisma.InputJsonValue },
    });

    generated += 1;
    results.push({
      id: lesson.id,
      title: lesson.title,
      imageUrl: result.imageUrl,
      status: result.generated ? "GENERATED" : result.skippedReason || "UPDATED",
    });
  }

  console.log(JSON.stringify({ gradeLevel, requested: limit, attempted: generated, force, results }, null, 2));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return { ...(value as Record<string, unknown>) };
  return {};
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
