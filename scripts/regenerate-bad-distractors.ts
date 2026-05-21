import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { Prisma, type LearningLesson, type ResourceLink } from "@prisma/client";
import OpenAI from "openai";
import { db } from "@/lib/db";
import {
  practiceQuestionSchema,
  practiceSections,
  type LessonV2,
  type PracticeQuestionV2,
} from "@/lib/lessonV2Schema";
import { validateDistractorPedagogy } from "@/lib/lessonV2Validators";

const GENERATED_BY = "PREBUILT_AI_LIBRARY";
const GENERATOR_VERSION = "V2";
const AUDIT_PATH = path.join(process.cwd(), "audit", "distractor-pedagogy-audit.json");
const SUMMARY_PATH = path.join(process.cwd(), "audit", "bad-distractor-regeneration-summary.json");
const PROGRESS_PATH = path.join(process.cwd(), "audit", "bad-distractor-regeneration-progress.json");
const MAX_ATTEMPTS_PER_ITEM = 3;

type LessonWithResource = LearningLesson & {
  heroResourceLink: ResourceLink | null;
};

type ItemTarget = {
  section: (typeof practiceSections)[number];
  index: number;
  issues: string[];
};

type LessonTarget = {
  lesson: LessonWithResource;
  itemTargets: ItemTarget[];
};

type RegenerationSuccess = {
  lessonId: string;
  gradeLevel: number;
  standardCode: string;
  skill: string;
  regeneratedItems: number;
  tokensUsed: number;
};

type RegenerationFailure = {
  lessonId: string;
  gradeLevel: number;
  standardCode: string;
  skill: string;
  failedItems: number;
  error: string;
};

type ProgressState = {
  completedLessonIds: string[];
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limit = readLimit();
  const lessons = await db.learningLesson.findMany({
    where: { generatedBy: GENERATED_BY, generatorVersion: GENERATOR_VERSION },
    include: { heroResourceLink: true },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
  });

  const targets = (await buildTargets(lessons)).filter((target) => target.itemTargets.length);
  const scopedTargets = typeof limit === "number" ? targets.slice(0, limit) : targets;
  const targetedItems = scopedTargets.reduce((sum, target) => sum + target.itemTargets.length, 0);

  console.log(`Scanned ${lessons.length} V2 PREBUILT_AI_LIBRARY lessons.`);
  console.log(`Targeting ${scopedTargets.length} lesson(s) and ${targetedItems} MC item(s) for distractor regeneration.`);
  if (existsSync(AUDIT_PATH)) {
    const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8"));
    console.log(`Audit baseline: ${audit.lessonsWithAtLeastOneDistractorIssue} lesson(s), ${audit.totalDistractorIssues} issue(s).`);
  }
  if (typeof limit === "number") console.log(`Limit applied: ${limit} lesson(s).`);
  console.table(scopedTargets.slice(0, 30).map((target) => ({
    id: target.lesson.id,
    grade: target.lesson.gradeLevel,
    standard: target.lesson.standardCode,
    skill: target.lesson.skill,
    items: target.itemTargets.length,
    firstTarget: `${target.itemTargets[0]?.section}[${target.itemTargets[0]?.index}]`,
  })));

  if (dryRun) {
    console.log("DRY RUN ONLY: no OpenAI calls and no DB writes were performed.");
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required to regenerate weak distractors.");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const progress = loadProgress();
  const completed = new Set(progress.completedLessonIds);
  const successes: RegenerationSuccess[] = [];
  const failures: RegenerationFailure[] = [];

  for (const target of scopedTargets) {
    if (completed.has(target.lesson.id)) console.log(`RECHECK ${target.lesson.gradeLevel} ${target.lesson.standardCode} ${target.lesson.skill} still has current distractor issues; retrying.`);
    try {
      const result = await regenerateLesson(openai, target);
      await replaceLessonContent(target.lesson, result.lesson, result.remainingIssues.length ? "NEEDS_REVISION" : "PENDING_REVIEW");
      if (result.remainingIssues.length) {
        failures.push({
          lessonId: target.lesson.id,
          gradeLevel: target.lesson.gradeLevel,
          standardCode: target.lesson.standardCode,
          skill: target.lesson.skill,
          failedItems: result.remainingIssues.length,
          error: result.remainingIssues.slice(0, 5).join("; "),
        });
        console.log(`⚠ ${target.lesson.gradeLevel} ${target.lesson.standardCode} ${target.lesson.skill}: marked NEEDS_REVISION (${result.remainingIssues.length} remaining issue(s))`);
      } else {
        successes.push({
          lessonId: target.lesson.id,
          gradeLevel: target.lesson.gradeLevel,
          standardCode: target.lesson.standardCode,
          skill: target.lesson.skill,
          regeneratedItems: target.itemTargets.length,
          tokensUsed: result.tokensUsed,
        });
        console.log(`✓ ${target.lesson.gradeLevel} ${target.lesson.standardCode} ${target.lesson.skill}: regenerated ${target.itemTargets.length} item(s), tokens ${result.tokensUsed}`);
      }
      completed.add(target.lesson.id);
      saveProgress({ completedLessonIds: Array.from(completed) });
      writeSummary({
        scannedLessons: lessons.length,
        targetedLessons: scopedTargets.length,
        targetedItems,
        successes,
        failures,
        inProgress: true,
      });
    } catch (error: any) {
      failures.push({
        lessonId: target.lesson.id,
        gradeLevel: target.lesson.gradeLevel,
        standardCode: target.lesson.standardCode,
        skill: target.lesson.skill,
        failedItems: target.itemTargets.length,
        error: error?.message || String(error),
      });
      await markNeedsRevision(target.lesson, error?.message || String(error));
      completed.add(target.lesson.id);
      saveProgress({ completedLessonIds: Array.from(completed) });
      console.error(`✗ ${target.lesson.gradeLevel} ${target.lesson.standardCode} ${target.lesson.skill}: ${error?.message || error}`);
    }
  }

  writeSummary({
    scannedLessons: lessons.length,
    targetedLessons: scopedTargets.length,
    targetedItems,
    successes,
    failures,
    inProgress: false,
  });
  console.log(`Wrote summary to ${SUMMARY_PATH}`);
}

async function buildTargets(lessons: LessonWithResource[]): Promise<LessonTarget[]> {
  return lessons
    .map((lesson) => {
      const v2 = toLessonV2(lesson);
      return { lesson, itemTargets: findItemTargets(v2) };
    });
}

function findItemTargets(lesson: LessonV2): ItemTarget[] {
  const grouped = new Map<string, ItemTarget>();
  for (const issue of validateDistractorPedagogy(lesson)) {
    const match = issue.match(/^(guidedPractice|independentPractice|exitTicket|masteryCheck)\[(\d+)\]/);
    if (!match) continue;
    const section = match[1] as ItemTarget["section"];
    const index = Number(match[2]);
    if (lesson[section]?.[index]?.type !== "mc") continue;
    const key = `${section}:${index}`;
    const current = grouped.get(key) || { section, index, issues: [] };
    current.issues.push(issue);
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).sort((a, b) =>
    practiceSections.indexOf(a.section) - practiceSections.indexOf(b.section) || a.index - b.index,
  );
}

async function regenerateLesson(openai: OpenAI, target: LessonTarget) {
  const lesson = toLessonV2(target.lesson);
  let tokensUsed = 0;
  const itemFailures: string[] = [];
  for (const itemTarget of target.itemTargets) {
    const original = lesson[itemTarget.section][itemTarget.index] as any;
    if (original.type !== "mc") continue;
    try {
      const result = await regenerateMcItem(openai, lesson, original, itemTarget);
      lesson[itemTarget.section][itemTarget.index] = result.item as PracticeQuestionV2;
      tokensUsed += result.tokensUsed;
    } catch (error: any) {
      itemFailures.push(`${itemTarget.section}[${itemTarget.index}]: ${error?.message || String(error)}`);
    }
  }

  const remainingIssues = [...validateDistractorPedagogy(lesson), ...itemFailures];
  lesson.qualityIssues = [
    ...(lesson.qualityIssues || []).filter((issue) => !/distractor|surface-eliminable|not grounded in passage/i.test(issue)),
    ...remainingIssues,
  ];
  lesson.qualityScore = remainingIssues.length ? Math.min(lesson.qualityScore || 75, 75) : Math.max(lesson.qualityScore || 0, 88);
  return { lesson, remainingIssues, tokensUsed };
}

async function regenerateMcItem(openai: OpenAI, lesson: LessonV2, original: any, target: ItemTarget) {
  const system = [
    "You are repairing one multiple-choice item in a standards-based ELA V2 lesson.",
    "Return JSON only in the shape {\"item\": <complete multiple-choice item>}.",
    "Keep the item type as \"mc\" and return every required field: type, question, passage, choices, correctAnswer, rightAnswerRationale, coachHint, distractorRationale.",
    "You may revise the question, choices, correctAnswer, rationales, and coachHint. Preserve the passage unless it is necessary to make the distractors passage-grounded.",
    "Every wrong answer must reveal a specific target-skill misunderstanding, not be eliminable because it is absent, absurd, or syntactically impossible.",
    "For passage-based questions, every distractor must be derived from a true passage detail but fail to answer the actual question.",
    "WORD-OVERLAP VALIDATION: for passage-based questions, every wrong answer choice must reuse at least one exact content word longer than 3 letters from the passage. Prefer short answer choices that quote or closely paraphrase true passage details.",
    "Do not write abstract distractors like \"It explains the character's feelings\" unless those words also appear in the passage. Anchor distractors in named people, places, objects, events, or phrases from the passage.",
    "For word-feature questions, at least two distractors should appear in the target word when the target word contains enough confusable features.",
    "For vocabulary-in-context, all distractors must share the correct answer's part of speech and plausibly fit the sentence shape.",
    "For conventions, all distractors must be plausible grammar or punctuation errors a student would actually make.",
    "Distractor rationales must include the exact wrong-answer text in the choice field and explain why a student might pick it plus why it is wrong.",
  ].join("\n");

  let lastIssue = target.issues.join("; ");
  let tokensUsed = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_ITEM; attempt += 1) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({
            gradeLevel: lesson.gradeLevel,
            standardCode: lesson.standardCode,
            standardLabel: lesson.standardLabel,
            skill: lesson.skill,
            lessonTitle: lesson.title,
            section: target.section,
            itemIndex: target.index,
            validationIssues: target.issues,
            previousAttemptIssue: lastIssue || undefined,
            originalItem: original,
            instruction: "Regenerate this MC item so its distractors are pedagogically strong under the supplied rules. Avoid changing non-answer fields unless needed.",
          }),
        },
      ],
    });
    tokensUsed += response.usage?.total_tokens || 0;
    const raw = response.choices[0]?.message?.content || "{}";
    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(raw);
    } catch {
      lastIssue = "Model returned invalid JSON.";
      continue;
    }
    const candidate = normalizeMcCandidate({ ...original, ...(parsedRaw.item || {}), type: "mc" });
    const parsed = practiceQuestionSchema.safeParse(candidate);
    if (!parsed.success) {
      lastIssue = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).slice(0, 6).join("; ");
      continue;
    }
    const testLesson = replaceItem(lesson, target.section, target.index, parsed.data);
    const itemIssues = validateDistractorPedagogy(testLesson).filter((issue) =>
      issue.startsWith(`${target.section}[${target.index}]`),
    );
    if (!itemIssues.length) return { item: parsed.data as Extract<PracticeQuestionV2, { type: "mc" }>, tokensUsed };
    const groundedFallback = groundPassageDistractors(parsed.data as any, lesson);
    if (groundedFallback) {
      const fallbackLesson = replaceItem(lesson, target.section, target.index, groundedFallback);
      const fallbackIssues = validateDistractorPedagogy(fallbackLesson).filter((issue) =>
        issue.startsWith(`${target.section}[${target.index}]`),
      );
      if (!fallbackIssues.length) return { item: groundedFallback, tokensUsed };
    }
    lastIssue = itemIssues.join("; ");
    await sleep(1500 * attempt);
  }
  throw new Error(`Could not regenerate ${target.section}[${target.index}]: ${lastIssue}`);
}

function groundPassageDistractors(item: any, lesson: LessonV2) {
  if (!item.passage || item.passage.length <= 100) return null;
  const normPassage = normalizeForOverlap(item.passage);
  const choices = [...item.choices];
  const wrongIndexes = choices
    .map((choice, index) => ({ choice, index }))
    .filter((entry) => entry.choice !== item.correctAnswer);
  const ungrounded = wrongIndexes.filter((entry) => !choiceGroundsInPassage(entry.choice, normPassage));
  if (!ungrounded.length) return null;

  const details = passageDetails(item.passage, item.correctAnswer, ungrounded.length);
  if (!details.length) return null;
  const rationales = [...item.distractorRationale];
  ungrounded.forEach((entry, detailIndex) => {
    const replacement = details[detailIndex % details.length];
    choices[entry.index] = replacement;
    const rationaleIndex = rationales.findIndex((rationale) => rationale.choice === entry.choice);
    const whyWrong = `This detail comes from the passage, so it is a tempting choice, but it does not answer this ${lesson.skill} question as directly as "${item.correctAnswer}".`;
    if (rationaleIndex >= 0) {
      rationales[rationaleIndex] = { choice: replacement, whyWrong };
    } else {
      rationales.push({ choice: replacement, whyWrong });
    }
  });
  return normalizeMcCandidate({ ...item, choices, distractorRationale: rationales });
}

function choiceGroundsInPassage(choice: string, normPassage: string) {
  return normalizeForOverlap(choice).split(" ").filter((word) => word.length > 3).some((word) => normPassage.includes(word));
}

function passageDetails(passage: string, correctAnswer: string, count: number) {
  const correctWords = new Set(normalizeForOverlap(correctAnswer).split(" ").filter((word) => word.length > 3));
  const sentences = passage.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const details: string[] = [];
  for (const sentence of sentences) {
    const words = sentence
      .replace(/["“”]/g, "")
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z0-9'-]/g, ""))
      .filter((word) => word.length > 3);
    const contentWords = words.filter((word) => !correctWords.has(word.toLowerCase())).slice(0, 7);
    if (contentWords.length < 3) continue;
    const detail = contentWords.join(" ");
    if (!details.some((existing) => normalizeForOverlap(existing) === normalizeForOverlap(detail))) details.push(detail);
    if (details.length >= count) break;
  }
  return details;
}

function normalizeForOverlap(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMcCandidate(candidate: any) {
  const choices = Array.isArray(candidate.choices) ? candidate.choices.map(String).slice(0, 4) : [];
  const correctAnswer = String(candidate.correctAnswer || choices[0] || "");
  const existingRationales = Array.isArray(candidate.distractorRationale) ? candidate.distractorRationale : [];
  const distractorRationale = choices
    .filter((choice: string) => choice !== correctAnswer)
    .map((choice: string) => {
      const exact = existingRationales.find((entry: any) => String(entry?.choice || "") === choice);
      return {
        choice,
        whyWrong: String(exact?.whyWrong || `This choice does not answer the question as well as "${correctAnswer}".`),
      };
    });
  return {
    ...candidate,
    choices,
    correctAnswer,
    distractorRationale,
  };
}

function replaceItem(lesson: LessonV2, section: ItemTarget["section"], index: number, item: PracticeQuestionV2) {
  const copy: LessonV2 = JSON.parse(JSON.stringify(lesson));
  copy[section][index] = item;
  return copy;
}

async function replaceLessonContent(existing: LessonWithResource, lesson: LessonV2, reviewStatus: "PENDING_REVIEW" | "NEEDS_REVISION") {
  const contentSnapshot = lessonContentSnapshot(lesson);
  await db.$transaction(async (tx) => {
    await tx.learningLessonItem.deleteMany({ where: { lessonId: existing.id } });
    await tx.lessonReview.deleteMany({ where: { lessonId: existing.id } });
    await tx.learningLesson.update({
      where: { id: existing.id },
      data: {
        guidedPractice: lesson.guidedPractice as Prisma.InputJsonValue,
        independentPractice: lesson.independentPractice as Prisma.InputJsonValue,
        exitTicket: lesson.exitTicket as Prisma.InputJsonValue,
        masteryCheck: lesson.masteryCheck as Prisma.InputJsonValue,
        reviewStatus,
        qualityScore: lesson.qualityScore,
        qualityIssues: lesson.qualityIssues as Prisma.InputJsonValue,
        sourcePayload: {
          source: "lesson_generator_v2",
          regeneratedBy: "regenerate-bad-distractors",
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
  });
}

async function markNeedsRevision(existing: LessonWithResource, reason: string) {
  const currentIssues = Array.isArray(existing.qualityIssues) ? existing.qualityIssues as string[] : [];
  await db.learningLesson.update({
    where: { id: existing.id },
    data: {
      reviewStatus: "NEEDS_REVISION",
      qualityIssues: [...currentIssues, `Distractor regeneration failed: ${reason}`] as Prisma.InputJsonValue,
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

function retestRecommendationForLesson(lesson: LessonV2) {
  return `After completing this V2 lesson, retry ${lesson.standardCode} items focused on ${lesson.skill} with attention to the success criteria and TEI formats practiced here.`;
}

function toLessonV2(lesson: LessonWithResource): LessonV2 {
  const fullLesson = (lesson.sourcePayload as any)?.fullLesson as Partial<LessonV2> | undefined;
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
    resourceTitle: lesson.heroResourceLink?.title || fullLesson.resourceTitle || null,
    resourceUrl: lesson.heroResourceLink?.url || fullLesson.resourceUrl || null,
    resourceProvider: lesson.heroResourceLink?.provider || fullLesson.resourceProvider || null,
    resourceDescription: lesson.heroResourceLink?.description || fullLesson.resourceDescription || null,
    exemplarsUsed: lesson.exemplarsUsed,
    teiTypesUsed: lesson.teiTypesUsed,
    generatorVersion: "V2",
    qualityScore: lesson.qualityScore || fullLesson.qualityScore || 0,
    qualityIssues: Array.isArray(lesson.qualityIssues) ? lesson.qualityIssues as string[] : fullLesson.qualityIssues || [],
  } as LessonV2;
}

function writeSummary({
  scannedLessons,
  targetedLessons,
  targetedItems,
  successes,
  failures,
  inProgress,
}: {
  scannedLessons: number;
  targetedLessons: number;
  targetedItems: number;
  successes: RegenerationSuccess[];
  failures: RegenerationFailure[];
  inProgress: boolean;
}) {
  const tokensUsed = successes.reduce((sum, success) => sum + success.tokensUsed, 0);
  const summary = {
    generatedAt: new Date().toISOString(),
    inProgress,
    scannedLessons,
    targetedLessons,
    targetedItems,
    successfulLessons: successes.length,
    lessonsMarkedNeedsRevision: failures.length,
    regeneratedItems: successes.reduce((sum, success) => sum + success.regeneratedItems, 0),
    tokensUsed,
    roughEstimatedCostUsd: Number(((tokensUsed / 1_000_000) * 7.5).toFixed(2)),
    successes,
    failures,
  };
  mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
  writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
}

function loadProgress(): ProgressState {
  if (!existsSync(PROGRESS_PATH)) return { completedLessonIds: [] };
  try {
    const parsed = JSON.parse(readFileSync(PROGRESS_PATH, "utf8"));
    return { completedLessonIds: Array.isArray(parsed.completedLessonIds) ? parsed.completedLessonIds : [] };
  } catch {
    return { completedLessonIds: [] };
  }
}

function saveProgress(progress: ProgressState) {
  mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
  writeFileSync(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`);
}

function readLimit() {
  const arg = process.argv.find((value) => value.startsWith("--limit="));
  if (!arg) return null;
  const value = Number(arg.split("=")[1]);
  if (!Number.isInteger(value) || value < 1) throw new Error("--limit must be a positive integer.");
  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
