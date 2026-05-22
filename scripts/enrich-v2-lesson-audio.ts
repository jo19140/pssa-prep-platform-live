import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { Prisma, type LearningLesson, type LessonStep, type ResourceLink } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { db } from "@/lib/db";
import { generateStepAudio } from "@/lib/lessonAudio";
import type { LessonV2 } from "@/lib/lessonV2Schema";

loadEnvConfig(process.cwd());

const GENERATED_BY = "PREBUILT_AI_LIBRARY";
const GENERATOR_VERSION = "V2";
const SUMMARY_PATH = path.join(process.cwd(), "audit", "lesson-audio-enrichment-summary.json");
const ESTIMATED_COST_PER_MILLION_CHARS = 15;

type LessonWithSteps = LearningLesson & {
  steps: LessonStep[];
  heroResourceLink: ResourceLink | null;
};

type StepPlan = {
  order: number;
  stepType: string;
  title: string;
  bodyText: string;
  narrationScript: string;
};

type ProcessedStep = {
  lessonId: string;
  stepId: string;
  order: number;
  title: string;
  audioUrl: string;
  durationSec: number;
  chars: number;
};

type FailedStep = {
  lessonId: string;
  stepId?: string;
  order?: number;
  title?: string;
  error: string;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const lessonLimit = readNumberArg("--limit");
  const concurrency = Math.min(readNumberArg("--concurrency") || 2, 3);

  const lessons = await db.learningLesson.findMany({
    where: {
      generatedBy: GENERATED_BY,
      generatorVersion: GENERATOR_VERSION,
      reviewStatus: { not: "NEEDS_REVISION" },
    },
    include: {
      steps: { orderBy: { order: "asc" } },
      heroResourceLink: true,
    },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
  }) as LessonWithSteps[];

  const lessonPlans = lessons.map((lesson) => ({ lesson, plannedSteps: buildStepPlan(lesson) }));
  const lessonsNeedingAudio = lessonPlans
    .map(({ lesson, plannedSteps }) => {
      const existingMissing = lesson.steps.filter((step) => !step.audioUrl);
      const virtualMissing = lesson.steps.length ? existingMissing.length : plannedSteps.length;
      const chars = lesson.steps.length
        ? existingMissing.reduce((sum, step) => sum + step.narrationScript.length, 0)
        : plannedSteps.reduce((sum, step) => sum + step.narrationScript.length, 0);
      return { lesson, plannedSteps, missingSteps: virtualMissing, chars };
    })
    .filter((entry) => entry.missingSteps > 0);

  const selected = typeof lessonLimit === "number" ? lessonsNeedingAudio.slice(0, lessonLimit) : lessonsNeedingAudio;
  const missingSteps = selected.reduce((sum, entry) => sum + entry.missingSteps, 0);
  const chars = selected.reduce((sum, entry) => sum + entry.chars, 0);
  const estimate = estimateCost(chars);

  console.log(`${missingSteps} steps need audio across ${selected.length} V2 prebuilt lesson(s).`);
  console.log(`Estimated cost: $${estimate.point.toFixed(2)} (range $${estimate.low.toFixed(2)}-$${estimate.high.toFixed(2)}).`);
  console.log(`Eligible lessons scanned: ${lessons.length}. Excluded NEEDS_REVISION lessons by design.`);
  if (typeof lessonLimit === "number") console.log(`Limit applied: ${lessonLimit} lesson(s).`);
  console.table(selected.slice(0, 20).map((entry) => ({
    lessonId: entry.lesson.id,
    grade: entry.lesson.gradeLevel,
    standard: entry.lesson.standardCode,
    skill: entry.lesson.skill,
    missingSteps: entry.missingSteps,
    chars: entry.chars,
  })));

  if (dryRun) {
    writeSummary({
      dryRun: true,
      eligibleLessons: lessons.length,
      targetedLessons: selected.length,
      targetedSteps: missingSteps,
      chars,
      estimate,
      processed: [],
      failures: [],
      inProgress: false,
    });
    return;
  }
  const missingEnv = [
    process.env.OPENAI_API_KEY ? null : "OPENAI_API_KEY",
    process.env.BLOB_READ_WRITE_TOKEN ? null : "BLOB_READ_WRITE_TOKEN",
  ].filter(Boolean);
  if (missingEnv.length) {
    throw new Error(`Missing required environment variable(s): ${missingEnv.join(", ")}. No audio generation can run without these.`);
  }

  const processed: ProcessedStep[] = [];
  const failures: FailedStep[] = [];
  const queue: Array<{ lesson: LessonWithSteps; step: LessonStep }> = [];

  for (const entry of selected) {
    const steps = await ensureLessonSteps(entry.lesson, entry.plannedSteps);
    for (const step of steps.filter((step) => !step.audioUrl)) queue.push({ lesson: entry.lesson, step });
  }

  let cursor = 0;
  async function worker(workerId: number) {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const { lesson, step } = queue[index];
      try {
        const result = await generateStepAudio({
          lessonId: lesson.id,
          stepId: step.id,
          narrationScript: step.narrationScript,
        });
        await db.lessonStep.update({ where: { id: step.id }, data: { audioUrl: result.audioUrl } });
        processed.push({
          lessonId: lesson.id,
          stepId: step.id,
          order: step.order,
          title: step.title,
          audioUrl: result.audioUrl,
          durationSec: result.durationSec,
          chars: step.narrationScript.length,
        });
        if (processed.length % 25 === 0 || processed.length === queue.length) {
          console.log(`Processed ${processed.length}/${queue.length} steps (worker ${workerId}).`);
        }
      } catch (error: any) {
        failures.push({
          lessonId: lesson.id,
          stepId: step.id,
          order: step.order,
          title: step.title,
          error: error?.message || String(error),
        });
        console.error(`✗ ${lesson.gradeLevel} ${lesson.standardCode} ${lesson.skill} step ${step.order}: ${error?.message || error}`);
      } finally {
        writeSummary({
          dryRun: false,
          eligibleLessons: lessons.length,
          targetedLessons: selected.length,
          targetedSteps: queue.length,
          chars,
          estimate,
          processed,
          failures,
          inProgress: true,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));
  writeSummary({
    dryRun: false,
    eligibleLessons: lessons.length,
    targetedLessons: selected.length,
    targetedSteps: queue.length,
    chars,
    estimate,
    processed,
    failures,
    inProgress: false,
  });
  console.log(`Wrote summary to ${SUMMARY_PATH}`);
}

async function ensureLessonSteps(lesson: LessonWithSteps, plannedSteps: StepPlan[]) {
  const existing = await db.lessonStep.findMany({ where: { lessonId: lesson.id }, orderBy: { order: "asc" } });
  if (existing.length) return existing;
  await db.lessonStep.createMany({
    data: plannedSteps.map((step) => ({
      lessonId: lesson.id,
      order: step.order,
      stepType: step.stepType,
      title: step.title,
      bodyText: step.bodyText,
      narrationScript: step.narrationScript,
      checkQuestion: Prisma.JsonNull,
    })),
  });
  return db.lessonStep.findMany({ where: { lessonId: lesson.id }, orderBy: { order: "asc" } });
}

function buildStepPlan(lesson: LessonWithSteps): StepPlan[] {
  const fullLesson = ((lesson.sourcePayload as any)?.fullLesson || {}) as Partial<LessonV2>;
  const steps: StepPlan[] = [];
  addStep(steps, "INTRO", "Hook", fullLesson.hook || firstParagraph(lesson.lessonExplanation));
  addStep(steps, "EXPLANATION", "Explanation", fullLesson.explanation || lesson.lessonExplanation);
  addStep(steps, "WORKED_EXAMPLE", "Worked Example", fullLesson.workedExample || lesson.workedExample);
  if (lesson.heroResourceLink?.url || fullLesson.resourceUrl) {
    addStep(
      steps,
      "TRANSITION",
      "Hero Video",
      "Watch this short resource before practice. Use it to hear the skill explained another way, then try the guided questions.",
      "Watch this short resource before practice, then try the guided questions.",
    );
  }
  addStep(steps, "CHECK_QUESTION", "Guided Practice", "Try these with the lesson ideas close at hand. Submit each item to see scoring and feedback.");
  addStep(steps, "CHECK_QUESTION", "Independent Practice", "Apply the skill with less support. Submit each item to see scoring and feedback.");
  addStep(steps, "CHECK_QUESTION", "Exit Ticket", "Check the key takeaway before moving on. Submit the exit ticket to see feedback.");
  addStep(steps, "CHECK_QUESTION", "Mastery Check", "Show that the skill is ready for mixed practice. Submit each item to see feedback.");
  return steps;
}

function addStep(steps: StepPlan[], stepType: string, title: string, bodyText?: string, narrationScript?: string) {
  const text = (bodyText || "").trim();
  if (!text) return;
  steps.push({
    order: steps.length + 1,
    stepType,
    title,
    bodyText: text,
    narrationScript: (narrationScript || text).trim(),
  });
}

function firstParagraph(value: string) {
  return value.split(/\n{2,}/)[0]?.trim() || value.trim();
}

function estimateCost(chars: number) {
  const point = (chars / 1_000_000) * ESTIMATED_COST_PER_MILLION_CHARS;
  return {
    low: point * 0.75,
    point,
    high: point * 1.25,
  };
}

function writeSummary({
  dryRun,
  eligibleLessons,
  targetedLessons,
  targetedSteps,
  chars,
  estimate,
  processed,
  failures,
  inProgress,
}: {
  dryRun: boolean;
  eligibleLessons: number;
  targetedLessons: number;
  targetedSteps: number;
  chars: number;
  estimate: { low: number; point: number; high: number };
  processed: ProcessedStep[];
  failures: FailedStep[];
  inProgress: boolean;
}) {
  mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
  writeFileSync(SUMMARY_PATH, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    dryRun,
    inProgress,
    eligibleLessons,
    targetedLessons,
    targetedSteps,
    narrationChars: chars,
    estimatedCostUsd: estimate,
    processedSteps: processed.length,
    failedSteps: failures.length,
    processed,
    failures,
  }, null, 2)}\n`);
}

function readNumberArg(name: string) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) return null;
  const value = Number(arg.split("=")[1]);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
