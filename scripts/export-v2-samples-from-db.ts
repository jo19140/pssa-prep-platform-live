import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import type { LearningLesson, ResourceLink } from "@prisma/client";
import { db } from "@/lib/db";
import type { LessonV2 } from "@/lib/lessonV2Schema";

const OUTPUT_DIR = path.join(process.cwd(), "audit", "v2-samples");
const GENERATED_BY = "PREBUILT_AI_LIBRARY";
const GENERATOR_VERSION = "V2";

type LessonWithResource = LearningLesson & {
  heroResourceLink: ResourceLink | null;
};

type Profile = {
  filename: string;
  label: string;
  find: (excludeIds: Set<string>) => Promise<LessonWithResource | null>;
};

const profiles: Profile[] = [
  {
    filename: "sample-db-01-lowest-score.json",
    label: "Lowest score",
    find: (excludeIds) => findLesson({
      excludeIds,
      where: { qualityScore: 75 },
      orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
    }),
  },
  {
    filename: "sample-db-02-highest-score.json",
    label: "Highest score",
    find: (excludeIds) => findLesson({
      excludeIds,
      where: { qualityScore: 92 },
      orderBy: [{ heroResourceLinkId: "desc" }, { gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
    }),
  },
  {
    filename: "sample-db-03-foundational.json",
    label: "Foundational",
    find: (excludeIds) => findLesson({
      excludeIds,
      where: { standardCode: { startsWith: "CC.1.1." } },
      orderBy: [{ heroResourceLinkId: "desc" }, { gradeLevel: "asc" }, { qualityScore: "desc" }],
    }),
  },
  {
    filename: "sample-db-04-grade-4-no-video.json",
    label: "Grade 4 no video",
    find: (excludeIds) => findLesson({
      excludeIds,
      where: { gradeLevel: 4, heroResourceLinkId: null },
      orderBy: [{ qualityScore: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
    }),
  },
  {
    filename: "sample-db-05-grade-6-tda.json",
    label: "Grade 6 TDA",
    find: (excludeIds) => findLesson({
      excludeIds,
      where: {
        gradeLevel: 6,
        OR: [
          { standardCode: { startsWith: "CC.1.4.6.S" } },
          { skill: { contains: "TDA", mode: "insensitive" } },
          { skill: { contains: "Text Dependent", mode: "insensitive" } },
        ],
      },
      orderBy: [{ qualityScore: "desc" }, { standardCode: "asc" }, { skill: "asc" }],
    }),
  },
  {
    filename: "sample-db-06-grade-8-with-video.json",
    label: "Grade 8 with video",
    find: (excludeIds) => findLesson({
      excludeIds,
      where: { gradeLevel: 8, heroResourceLinkId: { not: null } },
      orderBy: [{ qualityScore: "desc" }, { standardCode: "asc" }, { skill: "asc" }],
    }),
  },
];

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const exportedIds = new Set<string>();
  const summaries: Array<{
    profile: string;
    filename: string;
    gradeLevel: number;
    standardCode: string;
    skill: string;
    qualityScore: number | null;
    hasHeroVideo: boolean;
    resourceTitle: string | null;
  }> = [];

  for (const profile of profiles) {
    const lesson = await profile.find(exportedIds);
    if (!lesson) throw new Error(`Could not find V2 lesson for profile: ${profile.label}`);
    exportedIds.add(lesson.id);

    const lessonV2 = toPreviewLesson(lesson);
    const output = {
      lesson: lessonV2,
      critic: { score: lesson.qualityScore || 0, status: "PASS", revisions: [] },
      validationIssues: Array.isArray(lesson.qualityIssues) ? lesson.qualityIssues : lessonV2.qualityIssues || [],
      iterations: 0,
    };

    const outputPath = path.join(OUTPUT_DIR, profile.filename);
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    summaries.push({
      profile: profile.label,
      filename: profile.filename,
      gradeLevel: lesson.gradeLevel,
      standardCode: lesson.standardCode,
      skill: lesson.skill,
      qualityScore: lesson.qualityScore,
      hasHeroVideo: Boolean(lessonV2.resourceUrl),
      resourceTitle: lessonV2.resourceTitle,
    });
  }

  console.table(summaries);
}

async function findLesson({
  excludeIds,
  where,
  orderBy,
}: {
  excludeIds: Set<string>;
  where: Record<string, unknown>;
  orderBy: Array<Record<string, unknown>>;
}) {
  return db.learningLesson.findFirst({
    where: {
      generatedBy: GENERATED_BY,
      generatorVersion: GENERATOR_VERSION,
      id: excludeIds.size ? { notIn: Array.from(excludeIds) } : undefined,
      ...where,
    },
    include: { heroResourceLink: true },
    orderBy,
  }) as Promise<LessonWithResource | null>;
}

function toPreviewLesson(lesson: LessonWithResource): LessonV2 {
  const sourcePayload = lesson.sourcePayload as any;
  const fullLesson = sourcePayload?.fullLesson as Partial<LessonV2> | undefined;
  if (!fullLesson) throw new Error(`Lesson ${lesson.id} is missing sourcePayload.fullLesson`);

  return {
    ...fullLesson,
    gradeLevel: lesson.gradeLevel,
    standardCode: lesson.standardCode,
    standardLabel: lesson.standardLabel,
    skill: lesson.skill,
    title: lesson.title,
    whyAssigned: lesson.whyAssigned,
    guidedPractice: lesson.guidedPractice as LessonV2["guidedPractice"],
    independentPractice: lesson.independentPractice as LessonV2["independentPractice"],
    exitTicket: lesson.exitTicket as LessonV2["exitTicket"],
    masteryCheck: lesson.masteryCheck as LessonV2["masteryCheck"],
    heroResourceLinkId: lesson.heroResourceLinkId || null,
    resourceTitle: lesson.heroResourceLink?.title || null,
    resourceUrl: lesson.heroResourceLink?.url || null,
    resourceProvider: lesson.heroResourceLink?.provider || null,
    resourceDescription: lesson.heroResourceLink?.description || null,
    exemplarsUsed: lesson.exemplarsUsed,
    teiTypesUsed: lesson.teiTypesUsed,
    generatorVersion: "V2",
    qualityScore: lesson.qualityScore || fullLesson.qualityScore || 0,
    qualityIssues: Array.isArray(lesson.qualityIssues) ? lesson.qualityIssues as string[] : fullLesson.qualityIssues || [],
  } as LessonV2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
