import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const lessons = await db.learningLesson.findMany({
    where: { generatedBy: "PREBUILT_AI_LIBRARY" },
    select: { id: true, gradeLevel: true, skill: true, title: true, updatedAt: true, createdAt: true },
    orderBy: [{ gradeLevel: "asc" }, { title: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const keepByKey = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const lesson of lessons) {
    const key = `${lesson.gradeLevel}::${lesson.skill}::${lesson.title}`;
    const keeper = keepByKey.get(key);
    if (keeper) {
      duplicateIds.push(lesson.id);
    } else {
      keepByKey.set(key, lesson.id);
    }
  }

  if (duplicateIds.length) {
    await db.learningLessonItem.deleteMany({ where: { lessonId: { in: duplicateIds } } });
    await db.learningLesson.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  console.log(`Prebuilt lesson dedupe complete: ${duplicateIds.length} duplicate lesson records removed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
