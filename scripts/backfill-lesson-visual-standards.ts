import { Prisma, PrismaClient } from "@prisma/client";
import { buildLessonVisualMetadata } from "../lib/lessonVisuals";

const db = new PrismaClient();
const VISUAL_STANDARD_VERSION = 1;

type LessonForVisuals = {
  id: string;
  title: string;
  skill: string;
  gradeLevel: number;
  lessonExplanation: string;
  workedExample: string;
  guidedPractice: Prisma.JsonValue;
  independentPractice: Prisma.JsonValue;
  exitTicket: Prisma.JsonValue;
  masteryCheck: Prisma.JsonValue;
  sourcePayload: Prisma.JsonValue;
  items: Array<{ id: string; itemType: string; title: string; content: Prisma.JsonValue }>;
};

async function main() {
  const lessons = await db.learningLesson.findMany({
    include: { items: true },
    orderBy: [{ gradeLevel: "asc" }, { title: "asc" }],
  });

  let updatedLessons = 0;
  let updatedPracticeItems = 0;
  let updatedLessonItems = 0;

  for (const lesson of lessons) {
    const lessonVisual = buildLessonVisualMetadata({
      title: lesson.title,
      text: `${lesson.lessonExplanation} ${lesson.workedExample}`,
      skill: lesson.skill,
      gradeLevel: lesson.gradeLevel,
    });

    const sourcePayload = asRecord(lesson.sourcePayload);
    const nextSourcePayload = {
      ...sourcePayload,
      visualStandard: {
        version: VISUAL_STANDARD_VERSION,
        style: "rich-color-instructional",
        imagePolicy: "original-or-licensed-student-safe",
        updatedBy: "lesson_visual_backfill",
      },
      visual: {
        ...(asRecord(sourcePayload.visual)),
        ...lessonVisual,
        placement: "instruction",
      },
      imagePrompt: lessonVisual.imagePrompt,
    };

    const guidedPractice = addVisualsToPracticeSection(lesson, "guidedPractice", lesson.guidedPractice);
    const independentPractice = addVisualsToPracticeSection(lesson, "independentPractice", lesson.independentPractice);
    const exitTicket = addVisualsToPracticeSection(lesson, "exitTicket", lesson.exitTicket);
    const masteryCheck = addVisualsToPracticeSection(lesson, "masteryCheck", lesson.masteryCheck);
    updatedPracticeItems += guidedPractice.count + independentPractice.count + exitTicket.count + masteryCheck.count;

    await db.learningLesson.update({
      where: { id: lesson.id },
      data: {
        sourcePayload: nextSourcePayload as Prisma.InputJsonValue,
        guidedPractice: guidedPractice.value as Prisma.InputJsonValue,
        independentPractice: independentPractice.value as Prisma.InputJsonValue,
        exitTicket: exitTicket.value as Prisma.InputJsonValue,
        masteryCheck: masteryCheck.value as Prisma.InputJsonValue,
      },
    });
    updatedLessons += 1;

    for (const item of lesson.items) {
      const updated = addVisualsToLessonItem(lesson, item);
      if (!updated) continue;
      await db.learningLessonItem.update({
        where: { id: item.id },
        data: { content: updated as Prisma.InputJsonValue },
      });
      updatedLessonItems += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        updatedLessons,
        updatedPracticeItems,
        updatedLessonItems,
        visualStandardVersion: VISUAL_STANDARD_VERSION,
      },
      null,
      2,
    ),
  );
}

function addVisualsToPracticeSection(lesson: LessonForVisuals, sectionName: string, section: Prisma.JsonValue) {
  if (!Array.isArray(section)) return { value: section, count: 0 };

  let count = 0;
  const value = section.map((item, index) => {
    const question = asRecord(item);
    const visual = buildPracticeVisual(lesson, sectionName, question, index);
    count += 1;
    return {
      ...question,
      visualStandardVersion: VISUAL_STANDARD_VERSION,
      visual,
      imagePrompt: visual.imagePrompt,
    };
  });

  return { value, count };
}

function addVisualsToLessonItem(
  lesson: LessonForVisuals,
  item: { id: string; itemType: string; title: string; content: Prisma.JsonValue },
) {
  const content = asRecord(item.content);
  if (!Object.keys(content).length) return null;

  if (Array.isArray(content.questions)) {
    const questions = content.questions.map((question, index) => {
      const questionRecord = asRecord(question);
      const visual = buildPracticeVisual(lesson, item.itemType, questionRecord, index);
      return {
        ...questionRecord,
        visualStandardVersion: VISUAL_STANDARD_VERSION,
        visual,
        imagePrompt: visual.imagePrompt,
      };
    });
    return { ...content, questions };
  }

  if (typeof content.text === "string") {
    const visual = buildLessonVisualMetadata({
      title: item.title,
      text: content.text,
      skill: lesson.skill,
      gradeLevel: lesson.gradeLevel,
    });
    return {
      ...content,
      visualStandardVersion: VISUAL_STANDARD_VERSION,
      visual,
      imagePrompt: visual.imagePrompt,
    };
  }

  return null;
}

function buildPracticeVisual(lesson: LessonForVisuals, sectionName: string, question: Record<string, any>, index: number) {
  const text = [
    question.passage,
    question.question,
    question.prompt,
    question.correctAnswer,
    question.explanation,
    question.coachHint,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    ...buildLessonVisualMetadata({
      title: question.visualTitle || question.question || `${lesson.skill} ${sectionName} ${index + 1}`,
      text: text || `${lesson.lessonExplanation} ${lesson.workedExample}`,
      skill: lesson.skill,
      gradeLevel: lesson.gradeLevel,
    }),
    placement: sectionName,
    activityIndex: index + 1,
  };
}

function asRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return { ...(value as Record<string, any>) };
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
