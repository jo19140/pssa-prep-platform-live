import { createHash } from "crypto";
import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import type { LearningPathItemInput } from "@/lib/learningPath";
import { logAiFailure } from "@/lib/aiTelemetry";
import { db } from "@/lib/db";
import { attachGeneratedImagesToLessons } from "@/lib/lessonImageGeneration";
import { evaluateLessonQuality, getLessonQualityBlueprint } from "@/lib/lessonQualityBlueprint";
import { buildLessonVisualMetadata } from "@/lib/lessonVisuals";
import { buildPrebuiltLessonSeeds } from "@/lib/prebuiltLessonLibrary";

type ResourceLike = {
  title: string;
  url: string;
  provider: string;
  description?: string | null;
};

type ResponseLike = {
  standardCode: string;
  standardLabel: string;
  skill: string;
  questionType: string;
  difficulty: number;
  isCorrect: boolean;
  errorPattern: string;
  answerPayload?: unknown;
};

export type LearningLessonBuild = {
  learningPathItemOrder: number;
  gradeLevel: number;
  standardCode: string;
  standardLabel: string;
  skill: string;
  priority: number;
  title: string;
  whyAssigned: string;
  lessonExplanation: string;
  workedExample: string;
  resourceTitle?: string | null;
  resourceUrl?: string | null;
  resourceProvider?: string | null;
  resourceDescription?: string | null;
  guidedPractice: PracticeQuestion[];
  independentPractice: PracticeQuestion[];
  exitTicket: PracticeQuestion[];
  masteryCheck: PracticeQuestion[];
  retestRecommendation: string;
  generatedBy: "DETERMINISTIC" | "AI_ENRICHED";
  aiStatus: "NOT_REQUESTED" | "PENDING" | "SKIPPED" | "COMPLETED" | "FAILED";
  sourcePayload: Record<string, unknown>;
  items: LessonSectionBuild[];
};

type LessonSectionBuild = {
  itemType: string;
  title: string;
  content: Record<string, unknown>;
  order: number;
};

export type PracticeQuestion = {
  question: string;
  choices?: string[];
  correctAnswer: string;
  explanation: string;
  passage?: string;
  coachHint?: string;
};

const RESOURCE_FALLBACK = {
  title: "Teacher resource needed",
  url: null,
  provider: "Teacher",
  description: "No curated video or resource has been added for this standard yet.",
};

export async function buildLearningLessons({
  gradeLevel,
  pathItems,
  responses,
  resourcesByStandard,
}: {
  gradeLevel: number;
  pathItems: LearningPathItemInput[];
  responses: ResponseLike[];
  resourcesByStandard: Map<string, ResourceLike>;
}) {
  const deterministic = buildDeterministicLearningLessons({ gradeLevel, pathItems, responses, resourcesByStandard });

  if (!deterministic.length) return attachGeneratedImagesToLessons(deterministic);

  const cacheHits = await readCachedLessons(deterministic);
  const lessonsNeedingAi = deterministic.filter((lesson) => !cacheHits.has(lesson.learningPathItemOrder));

  if (!process.env.OPENAI_API_KEY || !lessonsNeedingAi.length) {
    const lessons = deterministic.map((lesson) => cacheHits.get(lesson.learningPathItemOrder) || { ...lesson, aiStatus: "SKIPPED" as const });
    return attachGeneratedImagesToLessons(lessons);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_LESSON_MODEL || process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You write short, student-friendly ELA tutoring lessons. Return only JSON. Keep mastery/scoring decisions out of the content.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Improve these deterministic lessons for a Pennsylvania PSSA prep app. Keep standards, skill, priority, resource fields, and question answer keys. Adjust reading level for the grade.",
            gradeLevel,
            qualityBlueprint: "Every lesson must teach before practice, use original text, include scaffolded feedback, increase text complexity/evidence demand by grade, and move from guided practice to independent mastery.",
            schema: {
              lessons: [
                {
                  learningPathItemOrder: "number",
                  lessonExplanation: "string",
                  workedExample: "string",
                  guidedPractice: "array of 4 scaffolded practice questions with passage, coachHint, choices, correctAnswer, explanation",
                  independentPractice: "array of 5 practice questions with fresh passage or sentence context, choices, correctAnswer, explanation",
                  exitTicket: "array of 1 practice question",
                  masteryCheck: "array of 3 PSSA-style mastery questions with passage, choices, correctAnswer, explanation",
                  retestRecommendation: "string",
                },
              ],
            },
            lessons: lessonsNeedingAi,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { lessons?: Partial<LearningLessonBuild>[] };
    const byOrder = new Map((parsed.lessons || []).map((lesson) => [lesson.learningPathItemOrder, lesson]));

    const enrichedLessons = await Promise.all(lessonsNeedingAi.map(async (lesson) => {
      const aiLesson = byOrder.get(lesson.learningPathItemOrder);
      if (!aiLesson) return { ...lesson, aiStatus: "FAILED" as const };
      const merged = {
        ...lesson,
        lessonExplanation: safeString(aiLesson.lessonExplanation, lesson.lessonExplanation),
        workedExample: safeString(aiLesson.workedExample, lesson.workedExample),
        guidedPractice: safePractice(aiLesson.guidedPractice, lesson.guidedPractice, lesson),
        independentPractice: safePractice(aiLesson.independentPractice, lesson.independentPractice, lesson),
        exitTicket: safePractice(aiLesson.exitTicket, lesson.exitTicket, lesson),
        masteryCheck: safePractice(aiLesson.masteryCheck, lesson.masteryCheck, lesson),
        retestRecommendation: safeString(aiLesson.retestRecommendation, lesson.retestRecommendation),
        generatedBy: "AI_ENRICHED" as const,
        aiStatus: "COMPLETED" as const,
      };
      const withQuality = withQualityPayload({ ...merged, items: buildLessonSections(merged) });
      const moderated = await moderateLessonContent(openai, withQuality, lesson);
      await persistLessonCache(moderated);
      return moderated;
    }));
    const byOrderEnriched = new Map(enrichedLessons.map((lesson) => [lesson.learningPathItemOrder, lesson]));
    const lessons = deterministic.map((lesson) => cacheHits.get(lesson.learningPathItemOrder) || byOrderEnriched.get(lesson.learningPathItemOrder) || { ...lesson, aiStatus: "FAILED" as const });
    return attachGeneratedImagesToLessons(lessons);
  } catch (error) {
    logAiFailure({
      scope: "learningLessons.buildLearningLessons",
      error,
      context: { gradeLevel, lessonCount: deterministic.length },
    });
    const lessons = deterministic.map((lesson) => cacheHits.get(lesson.learningPathItemOrder) || { ...lesson, aiStatus: "FAILED" as const });
    return attachGeneratedImagesToLessons(lessons);
  }
}

export function buildDeterministicLearningLessons({
  gradeLevel,
  pathItems,
  responses,
  resourcesByStandard,
}: {
  gradeLevel: number;
  pathItems: LearningPathItemInput[];
  responses: ResponseLike[];
  resourcesByStandard: Map<string, ResourceLike>;
}) {
  return pathItems.map((item) => {
    const relatedResponses = responses.filter((response) => response.standardCode === item.standardCode);
    const missedResponses = relatedResponses.filter((response) => !response.isCorrect);
    const resource =
      resourcesByStandard.get(resourceKey(gradeLevel, item.standardCode, item.skill)) ||
      resourcesByStandard.get(resourceKey(gradeLevel, item.standardCode, "")) ||
      resourcesByStandard.get(resourceKey(0, item.standardCode, item.skill)) ||
      resourcesByStandard.get(resourceKey(0, item.standardCode, ""));
    return buildFallbackLesson({ gradeLevel, item, relatedResponses, missedResponses, resource });
  });
}

export function resourceKey(gradeLevel: number, standardCode: string, skill: string) {
  return `${gradeLevel || 0}:${standardCode}:${skill.toLowerCase()}`;
}

export function lessonCacheKey(lesson: Pick<LearningLessonBuild, "gradeLevel" | "standardCode" | "skill" | "sourcePayload">) {
  const commonError = typeof lesson.sourcePayload.commonError === "string" ? lesson.sourcePayload.commonError : "unknown";
  const librarySource = lesson.sourcePayload.librarySource === true ? "library" : "canned";
  return createHash("sha256")
    .update(`gradeLevel:${lesson.gradeLevel}:standardCode:${lesson.standardCode}:skill:${lesson.skill}:commonError:${commonError}:librarySource:${librarySource}`)
    .digest("hex");
}

async function readCachedLessons(lessons: LearningLessonBuild[]) {
  const hits = new Map<number, LearningLessonBuild>();
  if (process.env.LESSON_CACHE_DISABLED === "true") return hits;

  await Promise.all(
    lessons.map(async (lesson) => {
      try {
        const cacheKey = lessonCacheKey(lesson);
        const cached = await db.lessonCache.findUnique({ where: { cacheKey } });
        if (!cached) return;

        const payload = cached.payload as unknown as LearningLessonBuild;
        hits.set(lesson.learningPathItemOrder, { ...payload, aiStatus: "COMPLETED" });
        void db.lessonCache
          .update({
            where: { cacheKey },
            data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
          })
          .catch((error) =>
            logAiFailure({
              scope: "learningLessons.cacheHitUpdate",
              error,
              context: { cacheKey, standardCode: lesson.standardCode, skill: lesson.skill },
            }),
          );
      } catch (error) {
        logAiFailure({
          scope: "learningLessons.cacheRead",
          error,
          context: { standardCode: lesson.standardCode, skill: lesson.skill },
        });
      }
    }),
  );

  return hits;
}

async function persistLessonCache(lesson: LearningLessonBuild) {
  if (process.env.LESSON_CACHE_DISABLED === "true" || lesson.aiStatus !== "COMPLETED") return;

  const cacheKey = lessonCacheKey(lesson);
  const commonError = typeof lesson.sourcePayload.commonError === "string" ? lesson.sourcePayload.commonError : "unknown";

  try {
    await db.lessonCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        gradeLevel: lesson.gradeLevel,
        standardCode: lesson.standardCode,
        skill: lesson.skill,
        commonError,
        payload: lesson as unknown as Prisma.InputJsonValue,
        generatedBy: lesson.generatedBy,
        modelHint: process.env.OPENAI_LESSON_MODEL || process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      },
      update: {
        payload: lesson as unknown as Prisma.InputJsonValue,
        generatedBy: lesson.generatedBy,
        modelHint: process.env.OPENAI_LESSON_MODEL || process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
        lastUsedAt: new Date(),
      },
    });
  } catch (error) {
    logAiFailure({
      scope: "learningLessons.cacheWrite",
      error,
      context: { cacheKey, standardCode: lesson.standardCode, skill: lesson.skill },
    });
  }
}

async function moderateLessonContent(openai: OpenAI, lesson: LearningLessonBuild, deterministic: LearningLessonBuild): Promise<LearningLessonBuild> {
  try {
    const practiceTexts = [...lesson.guidedPractice, ...lesson.independentPractice, ...lesson.exitTicket, ...lesson.masteryCheck].flatMap((practice) =>
      [practice.passage, practice.question, practice.explanation].filter(Boolean),
    );
    const response = await openai.moderations.create({
      input: [lesson.lessonExplanation, lesson.workedExample, ...practiceTexts],
    });
    if (response.results.some((result) => result.flagged)) {
      console.warn("AI lesson moderation flagged content", {
        standardCode: lesson.standardCode,
        skill: lesson.skill,
        learningPathItemOrder: lesson.learningPathItemOrder,
      });
      return withQualityPayload({
        ...deterministic,
        generatedBy: "DETERMINISTIC",
        aiStatus: "FAILED",
        items: buildLessonSections(deterministic),
      });
    }
    return lesson;
  } catch (error) {
    logAiFailure({
      scope: "learningLessons.moderation",
      error,
      context: { standardCode: lesson.standardCode, skill: lesson.skill },
    });
    return withQualityPayload({
      ...deterministic,
      generatedBy: "DETERMINISTIC",
      aiStatus: "FAILED",
      items: buildLessonSections(deterministic),
    });
  }
}

export function findLibraryScenariosFor({
  gradeLevel,
  standardCode,
  skill,
}: {
  gradeLevel: number;
  standardCode: string;
  skill: string;
}): PracticeQuestion[] {
  const normalizedSkill = normalizeKey(skill);
  return buildPrebuiltLessonSeeds()
    .filter((seed) => seed.gradeLevel === gradeLevel && seed.standardCode === standardCode && normalizeKey(seed.skill) === normalizedSkill)
    .flatMap((seed) => [...seed.guidedPractice, ...seed.independentPractice, ...seed.exitTicket, ...seed.masteryCheck])
    .map((question) => ({
      passage: question.passage,
      question: question.question,
      choices: question.choices,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      coachHint: question.coachHint,
    }));
}

function buildFallbackLesson({
  gradeLevel,
  item,
  relatedResponses,
  missedResponses,
  resource,
}: {
  gradeLevel: number;
  item: LearningPathItemInput;
  relatedResponses: ResponseLike[];
  missedResponses: ResponseLike[];
  resource?: ResourceLike;
}): LearningLessonBuild {
  const weakFormat = mostCommon(missedResponses.map((response) => response.questionType)) || "PSSA-style";
  const whyAssigned = `This lesson was assigned because your score showed that ${item.skill} needs more practice for ${item.standardCode}.`;
  const lessonExplanation = explanationForSkill(item.skill, gradeLevel);
  const workedExample = workedExampleForSkill(item.skill, gradeLevel);
  const libraryScenarios = findLibraryScenariosFor({ gradeLevel, standardCode: item.standardCode, skill: item.skill });
  const librarySource = libraryScenarios.length > 0;
  const guidedPractice = buildPractice(item.skill, "guided", gradeLevel, gradeLevel >= 6 ? 4 : 3, libraryScenarios);
  const independentPractice = buildPractice(item.skill, "independent", gradeLevel, gradeLevel >= 6 ? 5 : 4, libraryScenarios);
  const exitTicket = buildPractice(item.skill, "exit ticket", gradeLevel, 1, libraryScenarios);
  const masteryCheck = buildPractice(item.skill, "mastery check", gradeLevel, gradeLevel >= 6 ? 3 : 2, libraryScenarios);
  const retestRecommendation = `After completing this lesson and scoring at least 80% on the mastery check, retake a short ${item.standardCode} practice set with ${weakFormat} items.`;
  const lesson = {
    learningPathItemOrder: item.order,
    gradeLevel,
    standardCode: item.standardCode,
    standardLabel: item.standardLabel,
    skill: item.skill,
    priority: item.priority,
    title: `${item.skill} Mini-Lesson`,
    whyAssigned,
    lessonExplanation,
    workedExample,
    resourceTitle: resource?.title || RESOURCE_FALLBACK.title,
    resourceUrl: resource?.url || RESOURCE_FALLBACK.url,
    resourceProvider: resource?.provider || RESOURCE_FALLBACK.provider,
    resourceDescription: resource?.description || RESOURCE_FALLBACK.description,
    guidedPractice,
    independentPractice,
    exitTicket,
    masteryCheck,
    retestRecommendation,
    generatedBy: "DETERMINISTIC" as const,
    aiStatus: "NOT_REQUESTED" as const,
    sourcePayload: {
      recommendation: item.recommendation,
      rationale: item.rationale,
      percentScore: item.sourcePayload.percentScore,
      relatedQuestionCount: relatedResponses.length,
      missedQuestionCount: missedResponses.length,
      weakFormat,
      commonError: item.sourcePayload.commonError,
      librarySource,
    },
  };
  return withQualityPayload({ ...lesson, items: buildLessonSections(lesson) });
}

function withQualityPayload<T extends LearningLessonBuild>(lesson: T): T {
  const qualityBlueprint = getLessonQualityBlueprint({
    gradeLevel: lesson.gradeLevel,
    skill: lesson.skill,
    domain: domainFromStandard(lesson.standardCode),
  });
  const qualityReview = evaluateLessonQuality(lesson);
  const visual = buildLessonVisualMetadata({
    title: lesson.title,
    text: `${lesson.lessonExplanation} ${lesson.workedExample}`,
    skill: lesson.skill,
    gradeLevel: lesson.gradeLevel,
  });
  return {
    ...lesson,
    sourcePayload: {
      ...lesson.sourcePayload,
      visualStandard: {
        version: 1,
        style: "rich-color-instructional",
        imagePolicy: "original-or-licensed-student-safe",
      },
      visual,
      imagePrompt: visual.imagePrompt,
      qualityBlueprint,
      qualityReview,
    },
  };
}

function buildLessonSections(lesson: Omit<LearningLessonBuild, "items">): LessonSectionBuild[] {
  return [
    { order: 1, itemType: "LESSON", title: "Lesson Explanation", content: { text: lesson.lessonExplanation } },
    { order: 2, itemType: "WORKED_EXAMPLE", title: "Worked Example", content: { text: lesson.workedExample } },
    { order: 3, itemType: "RESOURCE", title: "Video or Resource", content: { title: lesson.resourceTitle, url: lesson.resourceUrl, provider: lesson.resourceProvider, description: lesson.resourceDescription } },
    { order: 4, itemType: "GUIDED_PRACTICE", title: "Guided Practice", content: { questions: lesson.guidedPractice } },
    { order: 5, itemType: "INDEPENDENT_PRACTICE", title: "Independent Practice", content: { questions: lesson.independentPractice } },
    { order: 6, itemType: "EXIT_TICKET", title: "Exit Ticket", content: { questions: lesson.exitTicket } },
    { order: 7, itemType: "MASTERY_CHECK", title: "Mastery Check", content: { questions: lesson.masteryCheck } },
    { order: 8, itemType: "RETEST", title: "Retest Recommendation", content: { text: lesson.retestRecommendation } },
  ];
}

function explanationForSkill(skill: string, gradeLevel: number) {
  const lower = skill.toLowerCase();
  if (lower.includes("inference")) {
    if (gradeLevel <= 3) return `Inference means figuring out something the text does not say directly. In grade ${gradeLevel}, use clues from the text and ask, "What can I figure out from this?"`;
    if (gradeLevel <= 4) return `Inference means using details and examples to figure out an unstated idea. The text gives clues, and you explain what those clues help you understand.`;
    if (gradeLevel <= 5) return `Inference means reading between the lines and supporting your thinking with accurate text evidence. A strong inference is not a guess; it is proved by details from the passage.`;
    if (gradeLevel <= 6) return `Inference is a major PSSA skill. You make an inference, cite textual evidence, and explain how the evidence proves what the text implies but does not state directly.`;
    return `Advanced inference means analyzing deeper meaning, theme, author message, and multiple layers of evidence. Strong readers connect clues across the text and avoid unsupported guesses.`;
  }
  if (lower.includes("evidence")) return `Text evidence means using exact details from a passage to prove an answer. In grade ${gradeLevel}, strong readers do not just pick an answer that sounds right. They go back to the passage, find the sentence or detail that supports it, and explain how that evidence proves the idea.`;
  if (lower.includes("theme")) return `Theme is the message or lesson a story suggests. To find it, watch how the character changes, what conflict they face, and what the ending teaches. A theme is usually a complete idea, not one word.`;
  if (lower.includes("rising action") || lower.includes("raising action")) return `Rising action is the part of the plot where the conflict grows and events become more complicated before the climax. Track how each event creates tension, causes another event, or pushes the character toward an important decision.`;
  if (lower.includes("setting")) {
    if (gradeLevel <= 3) return `Setting is where and when a story happens. In grade ${gradeLevel}, identify the place, time, and important details that help you picture the story.`;
    if (gradeLevel <= 5) return `Setting includes the time, place, and environment of a story. Strong readers explain how the setting connects to events and how characters respond.`;
    if (gradeLevel <= 6) return `Setting impact means explaining how the time, place, or environment affects plot events and character choices. On PSSA-style questions, connect setting details to what happens next.`;
    if (gradeLevel <= 7) return `Setting analysis means explaining how setting, plot, and characters interact. Ask how the place, time, or environment shapes conflict, decisions, mood, and meaning.`;
    return `Advanced setting analysis asks how environment, historical or cultural context, time shifts, or location changes shape actions, outcomes, theme, and meaning.`;
  }
  if (lower.includes("plot")) {
    if (gradeLevel <= 3) return `Plot is what happens in a story. In grade ${gradeLevel}, focus on the beginning, middle, and end, the main problem, and how the problem gets solved.`;
    if (gradeLevel <= 5) return `Plot is the sequence of important story events. Strong readers track the conflict, how characters respond to events, and how those choices lead to the resolution.`;
    if (gradeLevel <= 6) return `Plot development means explaining how a story unfolds through episodes or events. For PSSA-style questions, notice the conflict, cause and effect, and how characters respond or change as the story moves forward.`;
    if (gradeLevel <= 7) return `Plot analysis means explaining how story elements interact. Ask how the setting, conflict, and character choices affect one another and move the action forward.`;
    return `Advanced plot analysis asks how specific dialogue or incidents propel the action, reveal character, or cause decisions. Strong answers explain the cause-and-effect chain in the story.`;
  }
  if (lower.includes("point of view") || lower === "pov") {
    if (gradeLevel <= 3) return `Point of view means who is telling the story or sharing the information. In grade ${gradeLevel}, look for clues like I, me, my, he, she, or they to decide whether the passage is first person or third person.`;
    if (gradeLevel <= 4) return `Point of view means the narrator's or author's perspective. In grade ${gradeLevel}, compare first-person and third-person narration by asking who is speaking and what that narrator knows or notices.`;
    if (gradeLevel <= 6) return `Point of view is how the author or narrator sees the events or topic. In grade ${gradeLevel}, strong readers explain how word choice, details, and what the narrator notices develop that point of view.`;
    return `Point of view includes perspective, bias, and reliability. In grade ${gradeLevel}, evaluate which details are emphasized, which viewpoints are missing, and whether the narrator or author may be limited or biased.`;
  }
  if (lower.includes("figurative")) {
    if (gradeLevel <= 3) return `Figurative language uses words in a nonliteral way. In grade ${gradeLevel}, start by noticing when a phrase does not mean exactly what it says, such as a simple simile or metaphor.`;
    if (gradeLevel <= 4) return `Figurative language includes similes, metaphors, and idioms. Use context clues to figure out what the phrase really means instead of taking it literally.`;
    if (gradeLevel <= 5) return `Figurative language creates meaning beyond the literal words. In grade ${gradeLevel}, explain what the phrase means in context and how it helps the reader understand an idea or feeling.`;
    if (gradeLevel <= 6) return `Figurative language includes simile, metaphor, personification, hyperbole, and idioms. For PSSA-style questions, identify the type, interpret the meaning, and explain the effect on tone, mood, or meaning.`;
    return `Advanced figurative language analysis asks how images, symbols, connotation, tone, mood, and author purpose work together to create deeper meaning.`;
  }
  if (lower.includes("flashback")) {
    if (gradeLevel <= 3) return `Flashback connects to sequence. In grade ${gradeLevel}, notice when a story moves from what is happening now to something that happened earlier.`;
    if (gradeLevel <= 4) return `Flashback is a shift to an earlier event. In grade ${gradeLevel}, look for time clues that show the story has moved from the present to the past.`;
    if (gradeLevel <= 5) return `Flashback is part of story structure. It helps readers understand a character, conflict, or important earlier event that affects the current story.`;
    if (gradeLevel <= 6) return `Flashback is a text structure choice. For PSSA-style questions, analyze why the author interrupts the current plot with an earlier event and how that flashback contributes to theme, setting, plot, or character development.`;
    return `Advanced flashback analysis asks how nonlinear structure affects meaning. Evaluate why the author chose a flashback and how the story would change if events were told only in chronological order.`;
  }
  if (lower.includes("convention") || lower.includes("grammar") || lower.includes("punctuation")) return `Conventions are the grammar, punctuation, capitalization, and sentence rules that make writing clear. Read the whole sentence first, then check whether the words and punctuation work together correctly.`;
  if (lower.includes("vocab")) return `Vocabulary questions ask you to use context clues. Read before and after the word, look for examples or contrasts, and choose the meaning that best fits the sentence.`;
  if (lower.includes("structure")) return `Text structure is how an author organizes ideas. Look for signal words that show cause and effect, problem and solution, compare and contrast, sequence, or description.`;
  return `Main idea is what a passage or section is mostly about. A strong main idea covers the whole section, not just one interesting detail. Details should support the main idea.`;
}

function workedExampleForSkill(skill: string, gradeLevel: number) {
  const lower = skill.toLowerCase();
  if (lower.includes("inference")) return `Question: What can be inferred about the character? Worked answer: First find clues in what the character says and does. If the character checks the sky, packs extra supplies, and warns a friend, you can infer the character is cautious. The evidence proves the inference because each action shows planning.`;
  if (lower.includes("evidence")) return `Question: Which sentence best supports the idea that the scientist was careful? Worked answer: Choose the detail that shows careful actions, such as checking notes twice or repeating an experiment. That evidence proves the idea because it shows the scientist did not rush.`;
  if (lower.includes("theme")) return `Question: What theme is shown when a character keeps practicing after failing? Worked answer: A possible theme is, "Perseverance helps people improve." The evidence is the character's repeated practice and the better result at the end.`;
  if (lower.includes("rising action") || lower.includes("raising action")) return `Question: Which event is part of the rising action? Worked answer: Choose the event that makes the conflict more difficult before the climax. If thunder gets closer and Nora must decide whether to protect the signs or leave, that builds tension and moves the plot toward the big decision.`;
  if (lower.includes("setting")) return `Question: How does the setting affect the story? Worked answer: First identify the time and place. Then explain the effect. If thunder begins while Nora is outside protecting garden signs, the stormy setting makes the conflict more urgent and pushes Nora to make a brave choice.`;
  if (lower.includes("plot")) return `Question: How does this event affect the plot? Worked answer: First identify the conflict. Then explain what the event causes next. If Nora decides to protect the garden signs during a storm, that choice moves the story forward because it creates action, reveals her responsibility, and leads toward the resolution.`;
  if (lower.includes("point of view") || lower === "pov") return `Question: How does the author develop point of view? Worked answer: Look at what the narrator notices and the words used to describe the event. If the narrator calls a task "a chance to prove responsibility," that wording shows the narrator sees the task as important, not annoying.`;
  if (lower.includes("figurative")) return `Question: What does "the problem sat like a stone in her pocket" suggest? Worked answer: The phrase does not mean there is a real stone. It means the problem feels heavy and hard to ignore. The simile creates a serious tone.`;
  if (lower.includes("flashback")) return `Question: Why does the author include the flashback? Worked answer: The earlier scene shows that the character once failed while speaking in front of others. That explains the character's fear in the present and helps develop the conflict.`;
  if (lower.includes("convention") || lower.includes("grammar") || lower.includes("punctuation")) return `Question: Which sentence is written correctly? Worked answer: Read each choice aloud and check subject-verb agreement, commas, capitalization, and pronouns. The correct choice is the one that follows all of those rules.`;
  if (lower.includes("vocab")) return `Question: What does "observe" mean in the passage? Worked answer: If nearby sentences say the students watched carefully and wrote notes, then "observe" means to watch closely.`;
  if (lower.includes("structure")) return `Question: Why does the author use headings? Worked answer: Headings divide the text into topics, which helps readers understand how each section adds to the central idea.`;
  return `Question: What is the main idea of the section? Worked answer: First ask, "What are most sentences about?" Then choose the answer that covers all key details, not just one fact.`;
}

function buildPractice(skill: string, mode: string, gradeLevel: number, count: number, libraryScenarios: PracticeQuestion[] = []): PracticeQuestion[] {
  const cannedScenarios = practiceScenarios(skill, gradeLevel);
  const librarySample = sampleWithoutReplacement(libraryScenarios, count, `${gradeLevel}:${skill}:${mode}`);
  const scenarios = [...librarySample, ...repeatToCount(cannedScenarios, Math.max(0, count - librarySample.length))];
  return Array.from({ length: count }, (_, index) => {
    const scenario = scenarios[index] || cannedScenarios[index % cannedScenarios.length];
    const modePrefix = mode === "guided" ? "Use the coach hint, then choose the strongest answer." : mode === "mastery check" ? "Choose independently." : "Choose the best answer.";
    return {
      passage: scenario.passage,
      question: `${modePrefix} ${scenario.question}`,
      choices: scenario.choices,
      correctAnswer: scenario.correctAnswer,
      explanation: scenario.explanation,
      coachHint: scenario.coachHint,
    };
  });
}

function sampleWithoutReplacement<T>(items: T[], count: number, seed: string): T[] {
  if (!items.length || count <= 0) return [];
  const offset = parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)].slice(0, count);
}

function repeatToCount<T>(items: T[], count: number): T[] {
  if (!items.length || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => items[index % items.length]);
}

function practiceScenarios(skill: string, gradeLevel: number): PracticeQuestion[] {
  const lower = skill.toLowerCase();
  if (lower.includes("evidence") || lower.includes("inference")) {
    return [
      {
        passage: `The robotics team had fifteen minutes left before judging. Lena checked the wire connection, reread the directions, and tested the wheels one more time. When the robot finally rolled across the tape line, she smiled but kept her notebook open.`,
        question: `Which answer is best supported by the passage?`,
        choices: [
          "Lena wants to leave the competition early.",
          "Lena is careful and wants the robot to work correctly.",
          "The robot cannot move without help.",
          "The judges gave Lena extra time.",
        ],
        correctAnswer: "Lena is careful and wants the robot to work correctly.",
        explanation: "Checking the wire, rereading directions, testing again, and keeping notes all support the idea that Lena is careful.",
        coachHint: "Look for repeated actions. One clue can help, but several clues together make stronger evidence.",
      },
      {
        passage: `After the cafeteria lights flickered, Marcus held up his book light so the table could keep reading the science article. He whispered, "We can still finish the question if everyone finds one detail."`,
        question: `Which detail best proves Marcus is helping the group stay focused?`,
        choices: [
          "The cafeteria lights flickered.",
          "Marcus held up his book light and told everyone to find one detail.",
          "The group was sitting at a table.",
          "The article was about science.",
        ],
        correctAnswer: "Marcus held up his book light and told everyone to find one detail.",
        explanation: "That detail directly shows Marcus taking action and guiding the group back to the reading task.",
        coachHint: "Pick the evidence that proves the idea, not a detail that only sets the scene.",
      },
    ];
  }

  if (lower.includes("plot") || lower.includes("setting") || lower.includes("flashback")) {
    return [
      {
        passage: `Rain began tapping against the gym roof just as the class lined up for the outdoor relay. Coach Rivera moved the cones inside, and the runners had to shorten their strides around the basketball court.`,
        question: `How does the setting affect the events?`,
        choices: [
          "The rain forces the relay to move indoors and changes how students run.",
          "The gym roof is louder than the students expected.",
          "Coach Rivera cancels the relay.",
          "The basketball court is not part of the school.",
        ],
        correctAnswer: "The rain forces the relay to move indoors and changes how students run.",
        explanation: "The weather and location change the action by moving the relay and affecting the runners' choices.",
        coachHint: "Setting matters when it changes what characters do next.",
      },
      {
        passage: `Jada stared at the cracked garden sign. Last spring, her brother had shown her how to paint each letter so neighbors could read it from the sidewalk. Remembering his careful brushstrokes, she picked up the paint and began repairing the sign.`,
        question: `Why does the author include the memory of last spring?`,
        choices: [
          "To explain why Jada knows how to fix the sign.",
          "To show that the garden is closed.",
          "To describe every plant in the garden.",
          "To prove Jada dislikes painting.",
        ],
        correctAnswer: "To explain why Jada knows how to fix the sign.",
        explanation: "The flashback gives background that explains Jada's present action.",
        coachHint: "A flashback usually helps explain a character, conflict, or choice in the present.",
      },
    ];
  }

  if (lower.includes("figurative") || lower.includes("connotation") || lower.includes("vocab")) {
    return [
      {
        passage: `The unfinished essay sat like a boulder in Nia's backpack. Every time she reached for her pencil, the blank conclusion seemed to grow heavier.`,
        question: `What does the figurative language suggest?`,
        choices: [
          "Nia's backpack contains a real rock.",
          "The essay feels stressful and difficult to finish.",
          "Nia finished her conclusion quickly.",
          "The pencil is too heavy to lift.",
        ],
        correctAnswer: "The essay feels stressful and difficult to finish.",
        explanation: "The comparison to a boulder shows the essay feels emotionally heavy, not physically heavy.",
        coachHint: "Ask what the comparison makes you feel or understand beyond the literal words.",
      },
      {
        passage: `The principal called the cleanup crew's work "meticulous" because every poster was straight, every table was wiped, and even the marker caps were sorted by color.`,
        question: `What does meticulous mean in the passage?`,
        choices: ["careless", "very careful", "quick", "surprised"],
        correctAnswer: "very careful",
        explanation: "The examples show careful attention to many small details.",
        coachHint: "Use nearby examples as context clues for unfamiliar words.",
      },
    ];
  }

  return [
    {
      passage: `Students at Brook School started a compost bin behind the cafeteria. Each lunch period, volunteers collect fruit peels and vegetable scraps. By spring, the compost is mixed into the garden soil to help new plants grow.`,
      question: `What is the main idea of the passage?`,
      choices: [
        "Brook School students use compost to reduce waste and help the garden.",
        "Students eat fruit during lunch.",
        "The cafeteria is behind the school garden.",
        "Spring is warmer than winter.",
      ],
      correctAnswer: "Brook School students use compost to reduce waste and help the garden.",
      explanation: "This answer covers the whole passage, while the other choices are only small details or unsupported ideas.",
      coachHint: "A main idea should cover most of the details, not just one sentence.",
    },
    {
      passage: `The article explains that bike lanes give riders a safer place to travel, help drivers predict where cyclists will be, and can reduce traffic near busy schools.`,
      question: `Which sentence best summarizes the article's central idea?`,
      choices: [
        "Bike lanes can make travel safer and more organized for a community.",
        "Cyclists should never ride near schools.",
        "Drivers do not need to watch for bicycles.",
        "Traffic only happens in the morning.",
      ],
      correctAnswer: "Bike lanes can make travel safer and more organized for a community.",
      explanation: "The correct answer combines the key points about safety, predictability, and traffic.",
      coachHint: "Summaries combine the important points without adding extreme claims.",
    },
  ];
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 20 ? value : fallback;
}

function safePractice(value: unknown, fallback: PracticeQuestion[], context: { standardCode: string; skill: string }) {
  if (!Array.isArray(value) || !value.length) return fallback;
  const filtered = value
    .filter((item) => item && typeof item.question === "string" && typeof item.correctAnswer === "string")
    .map((item) => {
      const choices = Array.isArray(item.choices) ? item.choices.map(String) : [];
      return {
        question: String(item.question),
        choices,
        correctAnswer: String(item.correctAnswer),
        explanation: typeof item.explanation === "string" ? item.explanation : "Review the explanation and cite evidence from the text.",
        passage: typeof item.passage === "string" ? item.passage : undefined,
        coachHint: typeof item.coachHint === "string" ? item.coachHint : undefined,
      };
    })
    .filter((item) => {
      const normalizedAnswer = normalizeKey(item.correctAnswer);
      const valid =
        item.question.trim().length >= 10 &&
        item.explanation.trim().length >= 20 &&
        item.choices.length >= 2 &&
        item.choices.some((choice) => normalizeKey(choice) === normalizedAnswer);
      if (!valid) {
        console.warn("Dropped invalid AI practice question", {
          standardCode: context.standardCode,
          skill: context.skill,
          questionLength: item.question.trim().length,
          explanationLength: item.explanation.trim().length,
          choiceCount: item.choices.length,
        });
      }
      return valid;
    });
  return filtered.length ? filtered : fallback;
}

function domainFromStandard(standardCode: string) {
  if (standardCode.includes("CC.1.4.")) return "Writing and Conventions";
  if (standardCode.includes("CC.1.3.")) return "Literary Text";
  if (standardCode.includes("CC.1.2.")) return "Informational Text";
  return "Reading";
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}
