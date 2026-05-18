import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateLessonV2, type GenerateLessonV2Input } from "@/lib/lessonGeneratorV2";
import { allPracticeQuestions, type LessonV2 } from "@/lib/lessonV2Schema";
import { buildPrebuiltLessonSeeds } from "@/lib/prebuiltLessonLibrary";

type TargetLesson = GenerateLessonV2Input & {
  source: string;
};

type GeneratedSummary = {
  gradeLevel: number;
  standardCode: string;
  skill: string;
  qualityScore: number;
  teiTypesUsed: string[];
  heroResourceLinkId: string | null;
  iterations: number;
  validationIssues: string[];
};

const LIBRARY_USER_EMAIL = "lesson-library-agent@pssa.local";
const LIBRARY_ASSESSMENT_TITLE = "AI Prebuilt Lesson Library";
const SUMMARY_PATH = path.join(process.cwd(), "audit", "slice-16-regeneration-summary.json");
const GENERATED_BY = "PREBUILT_AI_LIBRARY";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();
  const inProgressV1 = await db.studentLessonProgress.count({
    where: { lesson: { generatedBy: GENERATED_BY } },
  });
  if (inProgressV1 > 0 && !options.force) {
    console.error(`SAFETY HALT: ${inProgressV1} student progress rows exist on V1 prebuilt lessons.`);
    console.error("Pass --force to proceed anyway (will delete those progress rows).");
    process.exit(1);
  }

  const targets = await buildTargetLessons();
  printTargetSummary(targets, inProgressV1);

  if (options.dryRun) {
    console.log("\nDRY RUN ONLY: no generator calls and no DB writes were performed.");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for full V2 prebuilt regeneration.");
  }

  const libraryPath = await getOrCreateLibraryPath();
  await db.$transaction(async (tx) => {
    if (options.force) {
      const progressDeleted = await tx.studentLessonProgress.deleteMany({
        where: { lesson: { generatedBy: GENERATED_BY } },
      });
      console.log(`Deleted ${progressDeleted.count} student progress rows for old prebuilt lessons.`);
    }
    const deleted = await tx.learningLesson.deleteMany({
      where: { generatedBy: GENERATED_BY, generatorVersion: { not: "V2" } },
    });
    console.log(`Cleared ${deleted.count} V1 PREBUILT_AI_LIBRARY rows`);
  });

  const summary = await generateTargets(targets, libraryPath.id, options.concurrency);
  const durationMinutes = Math.round(((Date.now() - startedAt) / 60000) * 10) / 10;
  const output = buildSummary(targets.length, summary.successes, summary.failures, durationMinutes);
  mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
  writeFileSync(SUMMARY_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`\nWrote summary to ${SUMMARY_PATH}`);
  printFinalSummary(output);
}

async function buildTargetLessons(): Promise<TargetLesson[]> {
  const targets = new Map<string, TargetLesson>();

  const existing = await db.learningLesson.findMany({
    where: { generatedBy: GENERATED_BY },
    select: { gradeLevel: true, standardCode: true, standardLabel: true, skill: true },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
  });
  for (const lesson of existing) addTarget(targets, {
    gradeLevel: lesson.gradeLevel,
    standardCode: normalizeStandardCode(lesson.standardCode),
    standardLabel: lesson.standardLabel,
    skill: lesson.skill,
    source: "existing-v1-db",
  });

  for (const seed of buildPrebuiltLessonSeeds()) addTarget(targets, {
    gradeLevel: seed.gradeLevel,
    standardCode: normalizeStandardCode(seed.standardCode),
    standardLabel: seed.standardLabel,
    skill: seed.skill,
    source: "prebuilt-seed-library",
  });

  for (const lesson of foundationalTargets()) addTarget(targets, lesson);

  return Array.from(targets.values()).sort((a, b) =>
    a.gradeLevel - b.gradeLevel ||
    a.standardCode.localeCompare(b.standardCode) ||
    a.skill.localeCompare(b.skill),
  );
}

function addTarget(targets: Map<string, TargetLesson>, target: TargetLesson) {
  const standardCode = normalizeStandardCode(target.standardCode);
  const key = `${target.gradeLevel}:${standardCode}:${normalizeKey(target.skill)}`;
  const existing = targets.get(key);
  if (existing) {
    existing.source = Array.from(new Set(`${existing.source},${target.source}`.split(","))).join(",");
    return;
  }
  targets.set(key, {
    ...target,
    standardCode,
    standardLabel: target.standardLabel || labelForStandard(standardCode, target.skill),
  });
}

async function generateTargets(targets: TargetLesson[], learningPathId: string, concurrency: number) {
  const successes: GeneratedSummary[] = [];
  const failures: Array<TargetLesson & { error: string }> = [];
  let cursor = 0;

  async function worker(workerId: number) {
    while (cursor < targets.length) {
      const index = cursor;
      cursor += 1;
      const target = targets[index];
      const existing = await db.learningLesson.findFirst({
        where: {
          gradeLevel: target.gradeLevel,
          standardCode: target.standardCode,
          skill: target.skill,
          generatedBy: GENERATED_BY,
          generatorVersion: "V2",
        },
        select: { id: true, qualityScore: true },
      });
      if (existing) {
        console.log(`SKIP (already V2): ${target.gradeLevel} ${target.standardCode} ${target.skill}`);
        if ((index + 1) % 10 === 0) console.log(`Progress: ${index + 1}/${targets.length}`);
        continue;
      }

      try {
        const result = await generateLessonV2({
          ...target,
          commonError: "Students need targeted practice with standards-aligned reasoning, evidence use, and technology-enhanced item formats.",
        });
        await saveGeneratedLesson(learningPathId, index + 1, target, result.lesson);
        successes.push({
          gradeLevel: target.gradeLevel,
          standardCode: target.standardCode,
          skill: target.skill,
          qualityScore: result.lesson.qualityScore,
          teiTypesUsed: result.lesson.teiTypesUsed,
          heroResourceLinkId: result.lesson.heroResourceLinkId,
          iterations: result.iterations,
          validationIssues: result.validationIssues,
        });
        console.log(`✓ [w${workerId}] ${target.gradeLevel} ${target.standardCode} ${target.skill} (qScore: ${result.lesson.qualityScore})`);
      } catch (error: any) {
        failures.push({ ...target, error: error?.message || String(error) });
        console.error(`✗ [w${workerId}] ${target.gradeLevel} ${target.standardCode} ${target.skill}: ${error?.message || error}`);
      }

      if ((index + 1) % 10 === 0) console.log(`Progress: ${index + 1}/${targets.length}`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));
  return { successes, failures };
}

async function saveGeneratedLesson(learningPathId: string, priority: number, target: TargetLesson, lesson: LessonV2) {
  const contentSnapshot = lessonContentSnapshot(lesson);
  await db.learningLesson.create({
    data: {
      learningPath: { connect: { id: learningPathId } },
      gradeLevel: target.gradeLevel,
      standardCode: target.standardCode,
      standardLabel: target.standardLabel,
      skill: target.skill,
      priority,
      title: lesson.title,
      whyAssigned: lesson.whyAssigned,
      lessonExplanation: `${lesson.hook}\n\n${lesson.explanation}`,
      workedExample: lesson.workedExample,
      resourceTitle: lesson.heroResourceLinkId ? "Matched resource available" : null,
      resourceProvider: lesson.heroResourceLinkId ? "ResourceLink catalog" : null,
      resourceDescription: lesson.heroResourceLinkId ? "Hero video selected by confident ResourceLink match." : null,
      heroResourceLink: lesson.heroResourceLinkId ? { connect: { id: lesson.heroResourceLinkId } } : undefined,
      guidedPractice: lesson.guidedPractice as Prisma.InputJsonValue,
      independentPractice: lesson.independentPractice as Prisma.InputJsonValue,
      exitTicket: lesson.exitTicket as Prisma.InputJsonValue,
      masteryCheck: lesson.masteryCheck as Prisma.InputJsonValue,
      retestRecommendation: retestRecommendationForLesson(lesson),
      generatedBy: GENERATED_BY,
      aiStatus: "COMPLETED",
      reviewStatus: "PENDING_REVIEW",
      generatorVersion: "V2",
      qualityScore: lesson.qualityScore,
      qualityIssues: lesson.qualityIssues as Prisma.InputJsonValue,
      exemplarsUsed: lesson.exemplarsUsed,
      teiTypesUsed: lesson.teiTypesUsed,
      sourcePayload: {
        source: "lesson_generator_v2",
        target,
        generatorVersion: "V2",
        qualityScore: lesson.qualityScore,
        qualityIssues: lesson.qualityIssues,
        exemplarsUsed: lesson.exemplarsUsed,
        teiTypesUsed: lesson.teiTypesUsed,
        fullLesson: lesson,
      } as Prisma.InputJsonValue,
      reviews: {
        create: {
          status: "PENDING",
          aiOriginalContent: contentSnapshot as Prisma.InputJsonValue,
          currentContent: contentSnapshot as Prisma.InputJsonValue,
        },
      },
      items: {
        create: [
          { order: 1, itemType: "LESSON", title: "Lesson Explanation", content: { hook: lesson.hook, explanation: lesson.explanation } as Prisma.InputJsonValue },
          { order: 2, itemType: "WORKED_EXAMPLE", title: "Worked Example", content: { text: lesson.workedExample } as Prisma.InputJsonValue },
          { order: 3, itemType: "GUIDED_PRACTICE", title: "Guided Practice", content: { questions: lesson.guidedPractice } as Prisma.InputJsonValue },
          { order: 4, itemType: "INDEPENDENT_PRACTICE", title: "Independent Practice", content: { questions: lesson.independentPractice } as Prisma.InputJsonValue },
          { order: 5, itemType: "EXIT_TICKET", title: "Exit Ticket", content: { questions: lesson.exitTicket } as Prisma.InputJsonValue },
          { order: 6, itemType: "MASTERY_CHECK", title: "Mastery Check", content: { questions: lesson.masteryCheck } as Prisma.InputJsonValue },
        ],
      },
    },
  });
}

function lessonContentSnapshot(lesson: LessonV2) {
  return {
    title: lesson.title,
    whyAssigned: lesson.whyAssigned,
    hook: lesson.hook,
    explanation: lesson.explanation,
    lessonExplanation: `${lesson.hook}\n\n${lesson.explanation}`,
    workedExample: lesson.workedExample,
    commonErrors: lesson.commonErrors,
    sentenceFrames: lesson.sentenceFrames,
    successCriteria: lesson.successCriteria,
    guidedPractice: lesson.guidedPractice,
    independentPractice: lesson.independentPractice,
    exitTicket: lesson.exitTicket,
    masteryCheck: lesson.masteryCheck,
    retestRecommendation: retestRecommendationForLesson(lesson),
    generatorVersion: lesson.generatorVersion,
    qualityScore: lesson.qualityScore,
    qualityIssues: lesson.qualityIssues,
    exemplarsUsed: lesson.exemplarsUsed,
    teiTypesUsed: lesson.teiTypesUsed,
  };
}

async function getOrCreateLibraryPath() {
  const user = await db.user.upsert({
    where: { email: LIBRARY_USER_EMAIL },
    update: { name: "Lesson Creator Agent", role: "ADMIN" },
    create: { email: LIBRARY_USER_EMAIL, name: "Lesson Creator Agent", role: "ADMIN" },
  });

  let assessment = await db.assessment.findFirst({
    where: { title: LIBRARY_ASSESSMENT_TITLE, subject: "ELA" },
  });
  if (!assessment) {
    assessment = await db.assessment.create({
      data: { title: LIBRARY_ASSESSMENT_TITLE, subject: "ELA", state: "PA", grade: 6, isAdaptive: false },
    });
  }

  let testSession = await db.testSession.findFirst({
    where: { userId: user.id, assessmentId: assessment.id },
    include: { learningPath: true },
  });
  if (!testSession) {
    testSession = await db.testSession.create({
      data: {
        userId: user.id,
        assessmentId: assessment.id,
        submittedAt: new Date(),
        scorePercent: 0,
        totalPoints: 0,
        earnedPoints: 0,
        proficiencyBand: "LIBRARY",
      },
      include: { learningPath: true },
    });
  }

  if (testSession.learningPath) return testSession.learningPath;
  return db.learningPath.create({
    data: {
      sessionId: testSession.id,
      generatedBy: GENERATED_BY,
      aiStatus: "COMPLETED",
      aiSummary: "Reusable V2 lessons generated for the teacher lesson library.",
    },
  });
}

function foundationalTargets(): TargetLesson[] {
  return [
    target(3, "CC.1.1.3.D", "Phonics Patterns", "Foundational Skills - phonics patterns"),
    target(3, "CC.1.1.3.E", "Multisyllabic Words", "Foundational Skills - multisyllabic word reading"),
    target(3, "CC.1.1.3.E", "Common Affixes", "Foundational Skills - common affixes"),
    target(4, "CC.1.1.4.D", "Affixes and Roots", "Foundational Skills - affixes and roots"),
    target(4, "CC.1.1.4.E", "Decoding Multisyllabic Words", "Foundational Skills - multisyllabic decoding"),
    target(4, "CC.1.1.4.E", "Fluency Strategies", "Foundational Skills - fluency strategies"),
    target(5, "CC.1.1.5.D", "Greek and Latin Roots", "Foundational Skills - Greek and Latin roots"),
    target(5, "CC.1.1.5.E", "Affixes in Academic Vocabulary", "Foundational Skills - academic affixes"),
    target(5, "CC.1.1.5.E", "Fluency for Comprehension", "Foundational Skills - fluency for comprehension"),
    target(6, "CC.1.1.6.E", "Word Origins", "Foundational Skills - word origins"),
    target(6, "CC.1.1.6.E", "Morphological Analysis", "Foundational Skills - morphological analysis"),
    target(6, "CC.1.1.6.E", "Reading Fluency", "Foundational Skills - reading fluency"),
    target(7, "CC.1.1.7.E", "Etymology and Word Study", "Foundational Skills - etymology and word study"),
    target(7, "CC.1.1.7.E", "Domain-Specific Vocabulary Morphology", "Foundational Skills - domain-specific vocabulary morphology"),
    target(8, "CC.1.1.8.E", "Advanced Word Analysis", "Foundational Skills - advanced word analysis"),
    target(8, "CC.1.1.8.E", "Connotation Through Word Structure", "Foundational Skills - connotation through word structure"),
  ];
}

function target(gradeLevel: number, standardCode: string, skill: string, standardLabel: string): TargetLesson {
  return { gradeLevel, standardCode, standardLabel, skill, source: "new-foundational-targets" };
}

function parseArgs(args: string[]) {
  const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));
  const requestedConcurrency = concurrencyArg ? Number(concurrencyArg.split("=")[1]) : 1;
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    concurrency: Math.max(1, Math.min(3, Number.isFinite(requestedConcurrency) ? requestedConcurrency : 1)),
  };
}

function normalizeStandardCode(value: string) {
  const match = String(value || "").match(/CC\.1\.[1-4]\.[3-8]\.[A-Z][A-Z0-9]?/);
  return match?.[0] || String(value || "").trim();
}

function normalizeKey(value: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function labelForStandard(standardCode: string, skill: string) {
  if (standardCode.startsWith("CC.1.1.")) return `Foundational Skills - ${skill}`;
  if (standardCode.startsWith("CC.1.2.")) return `Informational Reading - ${skill}`;
  if (standardCode.startsWith("CC.1.3.")) return `Literary Reading - ${skill}`;
  if (standardCode.startsWith("CC.1.4.")) return `Writing and Conventions - ${skill}`;
  return skill;
}

function retestRecommendationForLesson(lesson: LessonV2) {
  const criteria = lesson.successCriteria?.slice(0, 2).join(" ") || "explain your answer with evidence";
  return `After students complete this V2 lesson, assign a short progress check that asks them to ${criteria.toLowerCase()}. Review TEI responses for item-format confusion before moving to the next standard.`;
}

function printTargetSummary(targets: TargetLesson[], inProgressV1: number) {
  const byGrade = countBy(targets, (target) => `Grade ${target.gradeLevel}`);
  const byStrand = countBy(targets, (target) => strandForStandard(target.standardCode));
  console.log(`Safety check: ${inProgressV1} student progress rows on existing PREBUILT_AI_LIBRARY lessons.`);
  console.log(`Target lessons: ${targets.length}`);
  console.log(`By grade: ${formatCounts(byGrade)}`);
  console.log(`By strand: ${formatCounts(byStrand)}`);
  console.log("\nTarget list:");
  targets.forEach((target, index) => {
    console.log(`${String(index + 1).padStart(3, "0")}. G${target.gradeLevel} ${target.standardCode} | ${target.skill} | ${target.standardLabel} | ${target.source}`);
  });
}

function buildSummary(totalTargets: number, successes: GeneratedSummary[], failures: Array<TargetLesson & { error: string }>, durationMinutes: number) {
  const qualityScores = successes.map((success) => success.qualityScore).sort((a, b) => a - b);
  const teiTypeDistribution = countBy(successes.flatMap((success) => success.teiTypesUsed), (type) => type);
  return {
    generatedAt: new Date().toISOString(),
    totalTargets,
    successfulGenerations: successes.length,
    failedGenerations: failures.length,
    failures,
    qualityScoreDistribution: {
      min: qualityScores[0] ?? null,
      max: qualityScores[qualityScores.length - 1] ?? null,
      mean: qualityScores.length ? round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : null,
      median: median(qualityScores),
    },
    teiTypeDistribution,
    heroVideoCoveragePercentage: successes.length ? round((successes.filter((success) => success.heroResourceLinkId).length / successes.length) * 100) : 0,
    totalCost: {
      estimatedUsdLow: round(successes.length * 0.55),
      estimatedUsdHigh: round(successes.length * 1.25),
      note: "OpenAI Responses API usage headers are not exposed by the SDK here; this is a rough per-lesson estimate.",
    },
    runtimeDurationMinutes: durationMinutes,
    successes,
  };
}

function printFinalSummary(summary: ReturnType<typeof buildSummary>) {
  console.log("\n=== Slice 16 regeneration summary ===");
  console.log(`Targets: ${summary.totalTargets}`);
  console.log(`Successful: ${summary.successfulGenerations}`);
  console.log(`Failed: ${summary.failedGenerations}`);
  console.log(`Quality: min=${summary.qualityScoreDistribution.min} mean=${summary.qualityScoreDistribution.mean} median=${summary.qualityScoreDistribution.median} max=${summary.qualityScoreDistribution.max}`);
  console.log(`Hero coverage: ${summary.heroVideoCoveragePercentage}%`);
  console.log(`Estimated cost: $${summary.totalCost.estimatedUsdLow}-$${summary.totalCost.estimatedUsdHigh}`);
}

function strandForStandard(standardCode: string) {
  if (standardCode.startsWith("CC.1.1.")) return "Foundational";
  if (standardCode.startsWith("CC.1.2.")) return "Informational";
  if (standardCode.startsWith("CC.1.3.")) return "Literary";
  if (standardCode.startsWith("CC.1.4.")) return "Writing/Conventions";
  return "Other";
}

function countBy<T>(items: T[], keyForItem: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyForItem(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function formatCounts(counts: Record<string, number>) {
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${value}`).join(", ");
}

function median(values: number[]) {
  if (!values.length) return null;
  const midpoint = Math.floor(values.length / 2);
  return values.length % 2 ? values[midpoint] : round((values[midpoint - 1] + values[midpoint]) / 2);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
