import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { Prisma, type LearningLesson, type ResourceLink } from "@prisma/client";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { allPracticeQuestions, practiceQuestionSchema, practiceSections, type LessonV2, type PracticeQuestionV2 } from "@/lib/lessonV2Schema";
import { validatePassageContent, wordCount } from "@/lib/lessonV2Validators";

const GENERATED_BY = "PREBUILT_AI_LIBRARY";
const GENERATOR_VERSION = "V2";
const SUMMARY_PATH = path.join(process.cwd(), "audit", "topic-variety-regeneration-summary.json");
const IDS_PATH = path.join(process.cwd(), "audit", "topic-variety-lesson-ids.txt");
const DOMAINS = ["informational science", "historical/social studies", "literary narrative", "biographical", "process/how-to", "paired-text comparison"];

type LessonWithResource = LearningLesson & {
  heroResourceLink: ResourceLink | null;
};

type VarietyIssue = {
  reason: string;
  details: string;
};

type AffectedLesson = {
  lesson: LessonWithResource;
  topics: string[];
  issues: VarietyIssue[];
};

type RegenerationSuccess = {
  id: string;
  gradeLevel: number;
  standardCode: string;
  skill: string;
  qualityScore: number;
  topics: string[];
  attempts: number;
};

type RegenerationFailure = {
  id: string;
  gradeLevel: number;
  standardCode: string;
  skill: string;
  error: string;
  attempts: number;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const concurrency = readConcurrency();
  const limit = readLimit();
  const lessons = await db.learningLesson.findMany({
    where: { generatedBy: GENERATED_BY, generatorVersion: GENERATOR_VERSION },
    include: { heroResourceLink: true },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
  });

  const affected = lessons
    .map((lesson) => {
      const v2 = toLessonV2(lesson);
      const analysis = analyzeLesson(v2);
      return { lesson, ...analysis };
    })
    .filter((entry) => entry.issues.length);

  const targets = typeof limit === "number" ? affected.slice(0, limit) : affected;
  mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
  writeFileSync(IDS_PATH, `${targets.map((entry) => entry.lesson.id).join("\n")}${targets.length ? "\n" : ""}`);

  console.log(`Scanned ${lessons.length} V2 lessons.`);
  console.log(`Found ${affected.length} lesson(s) needing topic-variety or passage-length regeneration.`);
  if (typeof limit === "number") console.log(`Limiting this run to ${targets.length} lesson(s).`);
  console.table(targets.slice(0, 30).map((entry) => ({
    id: entry.lesson.id,
    grade: entry.lesson.gradeLevel,
    standard: entry.lesson.standardCode,
    skill: entry.lesson.skill,
    topics: entry.topics.length,
    issues: entry.issues.length,
    firstIssue: entry.issues[0]?.details,
  })));
  console.log(`Wrote target IDs to ${IDS_PATH}`);

  if (dryRun) {
    console.log("DRY RUN ONLY: no OpenAI calls and no DB writes were performed.");
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for LLM topic-variety regeneration.");

  const successes: RegenerationSuccess[] = [];
  const failures: RegenerationFailure[] = [];
  let cursor = 0;

  async function worker(workerId: number) {
    while (cursor < targets.length) {
      const index = cursor;
      cursor += 1;
      const target = targets[index];
      try {
        const result = await regenerateWithRetries(target);
        await replaceLessonContent(target.lesson, result.lesson, "regenerate-topic-variety-lessons");
        const post = analyzeLesson(result.lesson);
        successes.push({
          id: target.lesson.id,
          gradeLevel: target.lesson.gradeLevel,
          standardCode: target.lesson.standardCode,
          skill: target.lesson.skill,
          qualityScore: result.lesson.qualityScore,
          topics: post.topics,
          attempts: result.attempts,
        });
        console.log(`✓ [w${workerId}] ${target.lesson.gradeLevel} ${target.lesson.standardCode} ${target.lesson.skill} (${post.topics.length} topics, qScore ${result.lesson.qualityScore}, attempts ${result.attempts})`);
      } catch (error: any) {
        failures.push({
          id: target.lesson.id,
          gradeLevel: target.lesson.gradeLevel,
          standardCode: target.lesson.standardCode,
          skill: target.lesson.skill,
          error: error?.message || String(error),
          attempts: 3,
        });
        console.error(`✗ [w${workerId}] ${target.lesson.gradeLevel} ${target.lesson.standardCode} ${target.lesson.skill}: ${error?.message || error}`);
      } finally {
        writeSummary({
          scannedLessons: lessons.length,
          affectedLessons: affected.length,
          targetedLessons: targets.length,
          successes,
          failures,
          inProgress: true,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));
  writeSummary({
    scannedLessons: lessons.length,
    affectedLessons: affected.length,
    targetedLessons: targets.length,
    successes,
    failures,
    inProgress: false,
  });
  console.log(`Wrote summary to ${SUMMARY_PATH}`);
}

async function regenerateWithRetries(target: AffectedLesson) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const lesson: LessonV2 = JSON.parse(JSON.stringify(toLessonV2(target.lesson)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const repairs = planItemRepairs(lesson);
      for (const repair of repairs) {
        const currentTopics = analyzeLesson(lesson).topics;
        const domain = DOMAINS[(repair.globalIndex + attempt - 1) % DOMAINS.length];
        const replacement = await regeneratePracticeItem(openai, lesson, repair, currentTopics, domain);
        (lesson as any)[repair.section][repair.localIndex] = replacement;
      }
      const post = analyzeLesson(lesson);
      if (post.issues.length) {
        throw new Error(`Regenerated lesson still failed topic/length checks: ${post.issues.map((issue) => issue.details).slice(0, 5).join("; ")}`);
      }
      lesson.qualityIssues = (lesson.qualityIssues || []).filter((issue) => !/duplicate risk|too similar|topic|short passage|too short|passage/i.test(issue));
      lesson.qualityScore = Math.max(lesson.qualityScore || 0, lesson.qualityIssues.length ? 75 : 88);
      return { lesson, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(4000 * attempt);
    }
  }
  throw lastError;
}

type QuestionRef = {
  section: (typeof practiceSections)[number];
  localIndex: number;
  globalIndex: number;
  question: PracticeQuestionV2;
  reasons: string[];
};

function planItemRepairs(lesson: LessonV2): QuestionRef[] {
  const refs = questionRefs(lesson);
  const targets = new Map<number, QuestionRef>();
  const minWords = passageMinimum(lesson.gradeLevel);
  const targetWords = lesson.gradeLevel <= 5 ? "150-180" : "320-380";

  function add(ref: QuestionRef, reason: string) {
    const existing = targets.get(ref.globalIndex);
    if (existing) {
      existing.reasons.push(reason);
    } else {
      targets.set(ref.globalIndex, { ...ref, reasons: [reason] });
    }
  }

  for (const ref of refs) {
    if (ref.question.passage) {
      const count = wordCount(ref.question.passage);
      if (count < minWords) add(ref, `passage is ${count} words; expected at least ${minWords}`);
      for (const issue of validatePassageContent(ref.question.passage)) add(ref, issue);
    }
    if (ref.question.type === "hot-text-phrase") {
      const normalizedPassage = normalizeForDuplicate(ref.question.passage);
      for (const phrase of ref.question.selectablePhrases) {
        if (!normalizedPassage.includes(normalizeForDuplicate(phrase))) add(ref, `selectable phrase "${phrase}" is missing from passage`);
      }
    }
  }

  for (const cluster of duplicatePassageClusters(refs.map((ref) => ({ index: ref.globalIndex, passage: ref.question.passage || "" })).filter((entry) => entry.passage))) {
    for (const duplicate of cluster.slice(1)) {
      const ref = refs[duplicate.index];
      if (ref) add(ref, "passage duplicates another item in this lesson");
    }
  }

  const byTopic = new Map<string, QuestionRef[]>();
  for (const ref of refs) {
    const signature = topicSignature(questionContext(ref.question, ref.globalIndex).text, lesson.skill);
    if (!signature) continue;
    const bucket = byTopic.get(signature) || [];
    bucket.push(ref);
    byTopic.set(signature, bucket);
  }
  const topicCount = byTopic.size;
  if (topicCount < 6) {
    for (const bucket of Array.from(byTopic.values()).sort((a, b) => b.length - a.length)) {
      for (const ref of bucket.slice(1)) add(ref, `topic cluster is overused; lesson has only ${topicCount} distinct topics`);
      if (targets.size >= 6 - topicCount) break;
    }
  }

  return Array.from(targets.values()).sort((a, b) => a.globalIndex - b.globalIndex);
}

function questionRefs(lesson: LessonV2): QuestionRef[] {
  const refs: QuestionRef[] = [];
  let globalIndex = 0;
  for (const section of practiceSections) {
    lesson[section].forEach((question, localIndex) => {
      refs.push({ section, localIndex, globalIndex, question, reasons: [] });
      globalIndex += 1;
    });
  }
  return refs;
}

async function regeneratePracticeItem(openai: OpenAI, lesson: LessonV2, repair: QuestionRef, currentTopics: string[], domain: string): Promise<PracticeQuestionV2> {
  const minWords = passageMinimum(lesson.gradeLevel);
  const targetWords = lesson.gradeLevel <= 5 ? "150-180" : "240-300";
  const requiresFullPassage = Boolean(repair.question.passage) || ["hot-text-phrase", "evidence-mapping", "two-part-ebsr"].includes(repair.question.type);
  const system = [
    "You are repairing one practice item in a standards-based ELA V2 lesson.",
    "Return JSON only in the shape {\"item\": <practice item>}.",
    "Return a COMPLETE practice item, not a patch. Include every required field from the original item type: question, passage, rightAnswerRationale, coachHint, and all type-specific answer/scoring fields.",
    "Keep the same item type unless the original type is impossible to repair.",
    "The replacement must practice the same skill and grade level but use a completely different topic from the existing lesson topics.",
    "Use authentic student-facing prose only. Do not mention lessons, students, answer choices, rubrics, or how to use the passage inside the passage itself.",
    "Do not repeat any sentence. Do not pad with generic observation sentences.",
    "For hot-text-phrase, every selectable phrase and correct phrase must appear verbatim in the passage.",
    "For inline-dropdown, include exactly one [BLANK]. For hot-text-word, every bracket must be exactly [ X / Y ].",
  ].join("\n");
  const user = {
    gradeLevel: lesson.gradeLevel,
    standardCode: lesson.standardCode,
    standardLabel: lesson.standardLabel,
    skill: lesson.skill,
    currentLessonTopics: currentTopics,
    requiredNewDomain: domain,
    minimumPassageWords: minWords,
    targetPassageWords: targetWords,
    requireFullPassage: requiresFullPassage,
    repairReasons: repair.reasons,
    originalItem: repair.question,
    instruction: `If the item has a passage, write ${targetWords} words. Do not submit a passage near the minimum; it must comfortably exceed ${minWords} words and 650 characters.`,
  };

  let lastIssue = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ ...user, previousValidationIssue: lastIssue || undefined }) },
      ],
    });
    const raw = response.choices[0]?.message?.content || "{}";
    let candidate: unknown;
    try {
      candidate = JSON.parse(raw).item;
    } catch {
      lastIssue = "Response was not valid JSON.";
      continue;
    }
    const candidateObject = candidate && typeof candidate === "object" ? candidate as any : null;
    if (requiresFullPassage && typeof candidateObject?.passage !== "string") {
      lastIssue = "You omitted the required passage. Return a complete item with a new full passage.";
      continue;
    }
    if (requiresFullPassage && sameNormalizedText(candidateObject.passage, repair.question.passage || "")) {
      lastIssue = "You reused the original passage. Write a new passage on a different topic.";
      continue;
    }
    const mergedCandidate = normalizeMergedItem(mergeWithOriginalItem(repair.question, candidate));
    const parsed = practiceQuestionSchema.safeParse(mergedCandidate);
    if (!parsed.success) {
      lastIssue = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).slice(0, 5).join("; ");
      continue;
    }
    const item = parsed.data;
    if (item.passage && wordCount(item.passage) < minWords) {
      item.passage = await expandPassageOnly(openai, item, lesson, currentTopics, domain, minWords);
    }
    const issues = validateReplacementItem(item, lesson, currentTopics, minWords, requiresFullPassage);
    if (!issues.length) return item;
    lastIssue = issues.slice(0, 5).join("; ");
  }
  throw new Error(`Could not regenerate item ${repair.globalIndex + 1}: ${lastIssue || "unknown validation issue"}`);
}

async function expandPassageOnly(openai: OpenAI, item: PracticeQuestionV2, lesson: LessonV2, currentTopics: string[], domain: string, minWords: number) {
  const preservePhrases = item.type === "hot-text-phrase" ? [...item.selectablePhrases, ...item.correctPhrases] : [];
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "Expand one student-facing ELA practice passage using authentic prose.",
          "Return JSON only: {\"passage\":\"...\"}.",
          "Do not add teaching meta-language, rubric language, or repeated sentences.",
          "Keep the same item skill and answer context, but make the prose fuller and more natural.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          gradeLevel: lesson.gradeLevel,
          standardCode: lesson.standardCode,
          skill: lesson.skill,
          requiredDomain: domain,
          avoidTopics: currentTopics,
          minimumWords: minWords,
          targetWords: lesson.gradeLevel <= 5 ? "150-180" : "320-380",
          preserveTheseExactPhrases: preservePhrases,
          originalPassage: item.passage,
          itemQuestion: item.question,
          instruction: `Write comfortably above ${minWords} words. If exact phrases are listed, include them verbatim so hot-text selections still render.`,
        }),
      },
    ],
  });
  const raw = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  return typeof parsed.passage === "string" ? parsed.passage : item.passage || "";
}

function sameNormalizedText(a: string, b: string) {
  return normalizeForDuplicate(a) === normalizeForDuplicate(b);
}

function mergeWithOriginalItem(original: PracticeQuestionV2, candidate: unknown) {
  if (!candidate || typeof candidate !== "object") return candidate;
  const value = candidate as any;
  if (value.type && value.type !== original.type) return candidate;
  return { ...original, ...value, type: original.type };
}

function normalizeMergedItem(candidate: unknown) {
  const value = candidate as any;
  if (value?.type === "hot-text-sentence") {
    const markerCount = typeof value.paragraph === "string" ? (value.paragraph.match(/\(\s*\d+\s*\)/g)?.length || 0) : 0;
    value.sentenceCount = Math.max(3, markerCount, Number(value.sentenceCount) || 0);
    value.correctSentenceNumber = Math.max(1, Math.min(Number(value.correctSentenceNumber) || 1, value.sentenceCount));
  }
  return value;
}

function validateReplacementItem(item: PracticeQuestionV2, lesson: LessonV2, currentTopics: string[], minWords: number, requiresFullPassage: boolean) {
  const issues: string[] = [];
  if (requiresFullPassage && !item.passage) issues.push("Replacement must include a full passage.");
  if (item.passage) {
    const count = wordCount(item.passage);
    if (count < minWords) issues.push(`Replacement passage has ${count} words; expected at least ${minWords}.`);
    issues.push(...validatePassageContent(item.passage));
  }
  const newTopic = topicSignature(questionContext(item, 0).text, lesson.skill);
  if (newTopic && currentTopics.includes(newTopic)) issues.push(`Replacement topic "${newTopic}" is already used in this lesson.`);
  return issues;
}

function analyzeLesson(lesson: LessonV2) {
  const issues: VarietyIssue[] = [];
  const contexts = allPracticeQuestions(lesson).map((question, index) => questionContext(question, index));
  const topicSignatures = contexts.map((context) => topicSignature(context.text, lesson.skill)).filter(Boolean);
  const topics = Array.from(new Set(topicSignatures));

  if (topics.length < 6) {
    issues.push({
      reason: "topic_variety",
      details: `Only ${topics.length} distinct topic signature(s) detected; expected at least 6.`,
    });
  }

  const minWords = passageMinimum(lesson.gradeLevel);
  const passageEntries = allPracticeQuestions(lesson)
    .map((question, index) => ({ index, passage: question.passage || "" }))
    .filter((entry) => entry.passage.trim());
  for (const entry of passageEntries) {
    const count = wordCount(entry.passage);
    if (count < minWords) {
      issues.push({
        reason: "short_passage",
        details: `Question ${entry.index + 1} passage has ${count} words; expected at least ${minWords}.`,
      });
    }
    for (const issue of validatePassageContent(entry.passage)) {
      issues.push({
        reason: "passage_content",
        details: `Question ${entry.index + 1}: ${issue}`,
      });
    }
  }

  const duplicateClusters = duplicatePassageClusters(passageEntries);
  for (const cluster of duplicateClusters) {
    issues.push({
      reason: "duplicate_passage",
      details: `Same passage used in questions: ${cluster.map((entry) => entry.index + 1).join(", ")}.`,
    });
  }

  return { topics, issues };
}

function questionContext(question: PracticeQuestionV2, index: number) {
  const anyQuestion = question as any;
  const text = [
    question.passage,
    anyQuestion.paragraph,
    anyQuestion.sentence,
    question.question,
    Array.isArray(anyQuestion.choices) ? anyQuestion.choices.join(" ") : "",
    Array.isArray(anyQuestion.draggableItems) ? anyQuestion.draggableItems.join(" ") : "",
  ].filter(Boolean).join(" ");
  return { index, text };
}

function topicSignature(text: string, skill: string) {
  const skillWords = new Set(tokenize(skill));
  const tokens = tokenize(text)
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !skillWords.has(token))
    .filter((token) => token.length > 3);
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([token]) => token)
    .join(" ");
}

function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function duplicatePassageClusters(entries: Array<{ index: number; passage: string }>) {
  const byPassage = new Map<string, Array<{ index: number; passage: string }>>();
  for (const entry of entries) {
    const normalized = normalizeForDuplicate(entry.passage);
    if (!normalized || wordCount(normalized) < 20) continue;
    const bucket = byPassage.get(normalized) || [];
    bucket.push(entry);
    byPassage.set(normalized, bucket);
  }
  return Array.from(byPassage.values()).filter((bucket) => bucket.length > 1);
}

function normalizeForDuplicate(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function passageMinimum(gradeLevel: number) {
  return gradeLevel <= 5 ? 120 : 200;
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

async function replaceLessonContent(existing: LessonWithResource, lesson: LessonV2, regeneratedBy: string) {
  const contentSnapshot = lessonContentSnapshot(lesson);
  await db.$transaction(async (tx) => {
    await tx.learningLessonItem.deleteMany({ where: { lessonId: existing.id } });
    await tx.lessonReview.deleteMany({ where: { lessonId: existing.id } });
    await tx.learningLesson.update({
      where: { id: existing.id },
      data: {
        title: lesson.title,
        whyAssigned: lesson.whyAssigned,
        lessonExplanation: `${lesson.hook}\n\n${lesson.explanation}`,
        workedExample: lesson.workedExample,
        resourceTitle: lesson.resourceTitle,
        resourceUrl: lesson.resourceUrl,
        resourceProvider: lesson.resourceProvider,
        resourceDescription: lesson.resourceDescription,
        heroResourceLink: lesson.heroResourceLinkId ? { connect: { id: lesson.heroResourceLinkId } } : { disconnect: true },
        guidedPractice: lesson.guidedPractice as Prisma.InputJsonValue,
        independentPractice: lesson.independentPractice as Prisma.InputJsonValue,
        exitTicket: lesson.exitTicket as Prisma.InputJsonValue,
        masteryCheck: lesson.masteryCheck as Prisma.InputJsonValue,
        retestRecommendation: retestRecommendationForLesson(lesson),
        aiStatus: "COMPLETED",
        reviewStatus: "PENDING_REVIEW",
        qualityScore: lesson.qualityScore,
        qualityIssues: lesson.qualityIssues as Prisma.InputJsonValue,
        exemplarsUsed: lesson.exemplarsUsed,
        teiTypesUsed: lesson.teiTypesUsed,
        sourcePayload: {
          source: "lesson_generator_v2",
          regeneratedBy,
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

function writeSummary({
  scannedLessons,
  affectedLessons,
  targetedLessons,
  successes,
  failures,
  inProgress,
}: {
  scannedLessons: number;
  affectedLessons: number;
  targetedLessons: number;
  successes: RegenerationSuccess[];
  failures: RegenerationFailure[];
  inProgress: boolean;
}) {
  const summary = {
    generatedAt: new Date().toISOString(),
    inProgress,
    scannedLessons,
    affectedLessons,
    targetedLessons,
    successfulRegenerations: successes.length,
    failedRegenerations: failures.length,
    successes,
    failures,
  };
  writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
}

function readConcurrency() {
  const arg = process.argv.find((value) => value.startsWith("--concurrency="));
  if (!arg) return 1;
  const value = Number(arg.split("=")[1]);
  if (!Number.isInteger(value) || value < 1) throw new Error("--concurrency must be a positive integer.");
  return Math.min(value, 3);
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

const STOPWORDS = new Set([
  "about", "above", "after", "again", "against", "also", "because", "before", "between", "could", "every",
  "from", "have", "into", "more", "most", "only", "other", "over", "same", "should", "some", "than",
  "that", "their", "there", "these", "they", "this", "through", "under", "when", "where", "which",
  "while", "with", "would", "answer", "choice", "choices", "correct", "detail", "details", "evidence",
  "explain", "passage", "question", "student", "students", "support", "supports", "sentence", "sentences",
  "paragraph", "author", "reader", "text", "shows", "using", "write", "read", "skill", "lesson",
]);

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
