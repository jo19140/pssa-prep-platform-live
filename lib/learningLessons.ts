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
import { pssaLessonExemplars } from "@/lib/pssaLessonExemplars";

type ResourceLike = {
  title: string;
  url: string;
  provider: string;
  description?: string | null;
};

type ResourceMatch = ResourceLike & {
  id: string;
  gradeLevel?: number | null;
  standardCode: string;
  skill: string;
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
  heroResourceLinkId?: string | null;
  heroResource?: ResourceLike | null;
  steps?: LessonStepBuild[];
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

export type LessonStepBuild = {
  order: number;
  stepType: "INTRO" | "EXPLANATION" | "MODEL" | "CHECK_QUESTION" | "WORKED_EXAMPLE" | "TRANSITION";
  title: string;
  bodyText: string;
  narrationScript: string;
  audioUrl?: string | null;
  imageUrl?: string | null;
  imagePrompt?: string | null;
  checkQuestion?: StepCheckQuestion | null;
};

export type StepCheckQuestion = {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export type PracticeQuestion = {
  question: string;
  choices?: string[];
  correctAnswer: string;
  explanation: string;
  passage?: string;
  coachHint?: string;
  interactionType?: string;
};

const RESOURCE_FALLBACK = {
  title: "Teacher resource needed",
  url: null,
  provider: "Teacher",
  description: "No curated video or resource has been added for this standard yet.",
};

const FORBIDDEN_LESSON_PHRASES = [
  "start ",
  "learn the skill",
  "get ready for",
  "you will learn",
  "watch one example",
  "welcome to",
];
const EXAMPLE_MARKERS = ["for example", "such as", "like when", "imagine", "consider", "? \""];
const CONVENTIONS_MISMATCH_TERMS = ["main idea", "inference", "evidence from the passage", "central idea"];
const CONVENTIONS_TERMS = ["grammar", "punctuation", "sentence", "verb", "subject", "agreement", "comma", "capitalization", "pronoun", "convention"];
const READING_TERMS = ["passage", "text", "author", "character", "paragraph", "detail", "theme", "inference", "main idea", "central idea", "figurative", "evidence"];
const GRAMMAR_TERMS = ["subject-verb", "verb", "punctuation", "comma", "grammar", "capitalization", "pronoun", "sentence structure"];

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
    const generationStartedAt = Date.now();
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_LESSON_MODEL || process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildLessonSystemPrompt(),
        },
        ...pssaLessonExemplars.flatMap((example) => [
          {
            role: "user" as const,
            content: JSON.stringify({
              gradeLevel: example.gradeLevel,
              standardCode: example.standardCode,
              strand: standardStrand(example.standardCode),
              skill: example.skill,
              deterministicLesson: {
                learningPathItemOrder: example.learningPathItemOrder,
                standardCode: example.standardCode,
                skill: example.skill,
                title: example.title,
              },
            }),
          },
          { role: "assistant" as const, content: JSON.stringify({ lessons: [example] }) },
        ]),
        {
          role: "user",
          content: JSON.stringify({
            task: "Improve these deterministic lessons for a Pennsylvania PSSA ELA module. Keep standards, skill, priority, resource fields, and question answer keys. Adjust reading level for the grade.",
            gradeLevel,
            pedagogy:
              "Create a 4-6 step teaching sequence following this pattern: (1) Hook/intro with a relatable scenario. (2) Explanation in student-friendly language. (3) Model with think-aloud reasoning. (4) Check question MCQ. (5) Worked example with explicit reasoning. (6) Transition into practice. Grade 3 should be shorter and simpler; grade 8 can be more abstract. Narration scripts should sound like a warm teacher speaking.",
            qualityBlueprint:
              "Every lesson must teach before practice, use original text, include scaffolded feedback, increase text complexity/evidence demand by grade, and move from guided practice to independent mastery.",
            standardStrands: lessonsNeedingAi.map((lesson) => ({
              learningPathItemOrder: lesson.learningPathItemOrder,
              standardCode: lesson.standardCode,
              strand: standardStrand(lesson.standardCode),
              skill: lesson.skill,
            })),
            schema: {
              lessons: [
                {
                  learningPathItemOrder: "number",
                  steps: [
                    {
                      order: "number, 1-indexed",
                      stepType: "INTRO | EXPLANATION | MODEL | CHECK_QUESTION | WORKED_EXAMPLE | TRANSITION",
                      title: "string, 4-8 words",
                      bodyText: "string, 50-120 words, what the student reads",
                      narrationScript: "string, 30-80 words, warm teacher voice",
                      imagePrompt: "string or null; only for intro/model/worked example when a visual helps",
                      checkQuestion: {
                        question: "string",
                        choices: ["four answer choices"],
                        correctIndex: "number from 0-3",
                        explanation: "string",
                      },
                    },
                  ],
                  guidedPractice: "array of 4 scaffolded practice questions with passage, coachHint, choices, correctAnswer, explanation",
                  independentPractice: "array of 5 practice questions with fresh passage or sentence context, choices, correctAnswer, explanation",
                  exitTicket: "array of 1 practice question",
                  masteryCheck: "array of 3 PSSA-style mastery questions with passage, choices, correctAnswer, explanation",
                  retestRecommendation: "string",
                },
              ],
            },
            exemplar: {
              learningPathItemOrder: 1,
              steps: [
                {
                  order: 1,
                  stepType: "INTRO",
                  title: "Why Evidence Matters",
                  bodyText:
                    "Imagine two friends disagree about what happened in a story. The stronger answer is not the louder one. It is the answer that points back to the text and explains why the detail matters.",
                  narrationScript:
                    "Today we are going to practice proving an answer with the text. Strong readers do not just guess. They show exactly where their thinking comes from.",
                  imagePrompt: "A student comparing two highlighted sentences in a colorful reading notebook, no text in image",
                  checkQuestion: null,
                },
                {
                  order: 2,
                  stepType: "CHECK_QUESTION",
                  title: "Quick Evidence Check",
                  bodyText:
                    "Before you practice, check the main idea: evidence should prove the answer, not just mention the same topic. Choose the detail that directly supports the claim.",
                  narrationScript: "Let us pause for one quick check. Which answer gives proof, not just a related detail?",
                  imagePrompt: null,
                  checkQuestion: {
                    question: "Which detail is strongest evidence that Maya is prepared?",
                    choices: ["Maya brought extra pencils.", "The room was quiet.", "The test was on Friday.", "Maya likes reading."],
                    correctIndex: 0,
                    explanation: "Bringing extra pencils directly shows preparation.",
                  },
                },
              ],
            },
            lessons: lessonsNeedingAi,
          }),
        },
      ],
    }, { timeout: 60_000 });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { lessons?: Partial<LearningLessonBuild>[] };
    const byOrder = new Map((parsed.lessons || []).map((lesson) => [lesson.learningPathItemOrder, lesson]));

    const enrichedLessons = await Promise.all(lessonsNeedingAi.map(async (lesson) => {
      const aiLesson = byOrder.get(lesson.learningPathItemOrder);
      if (!aiLesson) return { ...lesson, aiStatus: "FAILED" as const };
      const merged = {
        ...lesson,
        lessonExplanation: "",
        workedExample: "",
        steps: safeSteps(aiLesson.steps, lesson),
        guidedPractice: safePractice(aiLesson.guidedPractice, lesson.guidedPractice, lesson),
        independentPractice: safePractice(aiLesson.independentPractice, lesson.independentPractice, lesson),
        exitTicket: safePractice(aiLesson.exitTicket, lesson.exitTicket, lesson),
        masteryCheck: safePractice(aiLesson.masteryCheck, lesson.masteryCheck, lesson),
        retestRecommendation: safeString(aiLesson.retestRecommendation, lesson.retestRecommendation),
        generatedBy: "AI_ENRICHED" as const,
        aiStatus: "COMPLETED" as const,
      };
      const critiqued = await selfCritiqueLesson(openai, merged, lesson, generationStartedAt);
      const heroResource = await findHeroResourceForLesson(lesson);
      const withQuality = withQualityPayload({
        ...critiqued,
        heroResourceLinkId: heroResource?.id || null,
        heroResource: heroResource ? resourceFromDb(heroResource) : null,
        items: buildLessonSections(critiqued),
      });
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

async function findHeroResourceForLesson(lesson: Pick<LearningLessonBuild, "gradeLevel" | "standardCode" | "skill">): Promise<ResourceMatch | null> {
  const normalizedSkill = lesson.skill.trim();
  const candidates = await db.resourceLink.findMany({
    where: { standardCode: lesson.standardCode },
    orderBy: [{ gradeLevel: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });
  const exact = candidates.find((resource) => resource.gradeLevel === lesson.gradeLevel && normalizeKey(resource.skill) === normalizeKey(normalizedSkill));
  const gradeStandard = candidates.find((resource) => resource.gradeLevel === lesson.gradeLevel);
  const skillStandard = candidates.find((resource) => normalizeKey(resource.skill) === normalizeKey(normalizedSkill));
  const match = exact || gradeStandard || skillStandard || candidates[0] || null;
  if (!match) {
    logAiFailure({
      scope: "learningLessons.no_resource_link",
      error: new Error("No ResourceLink matched lesson hero video criteria."),
      context: { gradeLevel: lesson.gradeLevel, standardCode: lesson.standardCode, skill: lesson.skill },
    });
    return null;
  }
  return match;
}

function resourceFromDb(resource: ResourceMatch): ResourceLike {
  return {
    title: resource.title,
    url: resource.url,
    provider: resource.provider,
    description: resource.description,
  };
}

export function lessonCacheKey(lesson: Pick<LearningLessonBuild, "gradeLevel" | "standardCode" | "skill" | "sourcePayload">) {
  const commonError = typeof lesson.sourcePayload.commonError === "string" ? lesson.sourcePayload.commonError : "unknown";
  const librarySource = lesson.sourcePayload.librarySource === true ? "library" : "canned";
  return createHash("sha256")
    .update(`gradeLevel:${lesson.gradeLevel}:standardCode:${lesson.standardCode}:skill:${lesson.skill}:commonError:${commonError}:librarySource:${librarySource}`)
    .digest("hex");
}

function buildLessonSystemPrompt() {
  return [
    "You design concise, student-friendly ELA mini-lessons for a Pennsylvania PSSA ELA module. Return only JSON. Keep validated scoring decisions out of the content.",
    "Forbidden phrases: The following phrases are forbidden in step titles and body text: 'Start [skill]', 'Learn the skill', 'Get ready for', 'You will learn', 'Watch one example', 'Welcome to'. These are placeholder phrases that do not teach. Step titles must name the specific concept being taught, such as 'Identifying Subject-Verb Agreement Errors,' not 'Start Grammar.' Step body text must include at least one concrete example of the skill in action, not just an announcement that the skill will be taught.",
    "Step depth requirements: Each EXPLANATION step must include a one-sentence rule, at least one positive example, and at least one common-error example. Each MODEL or WORKED_EXAMPLE step must walk through specific reasoning, not just state an answer. CHECK_QUESTION steps must have all four answer choices that are plausible distractors, not throwaway options like 'I do not know.'",
    "Standard-strand alignment requirement: Each lesson includes a standardCode and strand. All practice content must use vocabulary appropriate to this strand. A conventions lesson (CC.1.4.x.y) must use grammar, punctuation, usage, or sentence-structure vocabulary, not main idea or inference vocabulary. Literary text lessons (CC.1.3.x.y) and informational text lessons (CC.1.2.x.y) must reference passage analysis, meaning, evidence, structure, vocabulary, or central ideas as appropriate. Cross-strand practice content will be rejected.",
    "The teaching sequence must follow this pattern: INTRO, EXPLANATION, MODEL, CHECK_QUESTION, WORKED_EXAMPLE, and optional TRANSITION. Narration scripts should sound like a warm teacher speaking.",
  ].join("\n\n");
}

async function selfCritiqueLesson(openai: OpenAI, lesson: LearningLessonBuild, deterministic: LearningLessonBuild, generationStartedAt: number): Promise<LearningLessonBuild> {
  if (!lesson.steps?.length || Date.now() - generationStartedAt > 50_000) return lesson;
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_LESSON_MODEL || process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You generated this lesson. Audit it against these criteria: (a) Does step 2 define the skill with a one-sentence rule plus at least one example? (b) Does any step use forbidden placeholder phrases like "Start X" or "Learn the skill"? (c) Does the practice content match the lesson standard strand? (d) Would a struggling student actually understand the worked example, or is it vague? For each failing criterion, return a revised version of that step only. If all criteria pass, return {"status":"approved"}. Return JSON only.',
        },
        {
          role: "user",
          content: JSON.stringify({
            standardCode: lesson.standardCode,
            strand: standardStrand(lesson.standardCode),
            skill: lesson.skill,
            steps: lesson.steps,
            practice: {
              guidedPractice: lesson.guidedPractice,
              independentPractice: lesson.independentPractice,
              exitTicket: lesson.exitTicket,
              masteryCheck: lesson.masteryCheck,
            },
          }),
        },
      ],
    }, { timeout: Math.max(5_000, 60_000 - (Date.now() - generationStartedAt)) });
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    if (parsed.status === "approved") return lesson;
    const revisions = Array.isArray(parsed.revisions) ? parsed.revisions : Array.isArray(parsed.steps) ? parsed.steps : [];
    if (!revisions.length) return lesson;
    const byOrder = new Map<number, Record<string, unknown>>(revisions.map((step: any) => [Number(step.order), step && typeof step === "object" ? step : {}]));
    const revisedSteps = (lesson.steps || []).map((step) => ({ ...step, ...(byOrder.get(step.order) || {}) }));
    return { ...lesson, steps: safeSteps(revisedSteps, deterministic) };
  } catch (error) {
    logAiFailure({
      scope: "learningLessons.self_critique",
      error,
      context: { standardCode: lesson.standardCode, skill: lesson.skill },
    });
    return lesson;
  }
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
        if (cached.reviewStatus !== "APPROVED") return;

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
    const cached = await db.lessonCache.upsert({
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
    if (cached.reviewStatus === "PENDING_REVIEW") {
      const existingReview = await db.lessonReview.findFirst({ where: { lessonCacheId: cached.id, status: "PENDING" }, select: { id: true } });
      if (existingReview) {
        await db.lessonReview.update({
          where: { id: existingReview.id },
          data: {
            aiOriginalContent: lesson as unknown as Prisma.InputJsonValue,
            currentContent: lesson as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        await db.lessonReview.create({
          data: {
            lessonCacheId: cached.id,
            status: "PENDING",
            aiOriginalContent: lesson as unknown as Prisma.InputJsonValue,
            currentContent: lesson as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
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
    const stepTexts = (lesson.steps || []).flatMap((step) => [step.title, step.bodyText, step.narrationScript, step.checkQuestion?.question, step.checkQuestion?.explanation].filter(Boolean));
    const response = await openai.moderations.create({
      input: [lesson.lessonExplanation, lesson.workedExample, ...stepTexts, ...practiceTexts],
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

export function buildFallbackLesson({
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
  const isSixActivityLesson =
    item.standardCode.startsWith("CC.1.4.") ||
    item.standardCode.startsWith("CC.1.3.") ||
    item.standardCode.startsWith("CC.1.2.") ||
    isConventionsSkill(item.skill.toLowerCase()) ||
    isLiterarySkill(item.skill.toLowerCase()) ||
    isInformationalSkill(item.skill.toLowerCase());
  const guidedPractice = buildPractice(item.skill, "guided", gradeLevel, isSixActivityLesson ? 6 : gradeLevel >= 6 ? 4 : 3, libraryScenarios, item.standardCode);
  const independentPractice = buildPractice(item.skill, "independent", gradeLevel, isSixActivityLesson ? 6 : gradeLevel >= 6 ? 5 : 4, libraryScenarios, item.standardCode);
  const exitTicket = buildPractice(item.skill, "exit ticket", gradeLevel, 1, libraryScenarios, item.standardCode);
  const masteryCheck = buildPractice(item.skill, "mastery check", gradeLevel, gradeLevel >= 6 ? 3 : 2, libraryScenarios, item.standardCode);
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
    heroResourceLinkId: null,
    heroResource: null,
    steps: buildDeterministicSteps({ skill: item.skill, gradeLevel, lessonExplanation, workedExample }),
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
  if (isConventionsSkill(lower)) {
    if (lower.includes("subject") && lower.includes("verb")) {
      return `Rule: the verb must match the subject in number, even when other words come between them. For example, "The box of pencils sits on the shelf" is correct because box is singular, so the verb is sits. A common error is "The box of pencils sit," where pencils tricks the writer into choosing the plural verb.`;
    }
    if (lower.includes("pronoun")) {
      return `Rule: a pronoun must match the noun it replaces and fit its job in the sentence. For example, "Maya and I presented the project" is correct because I is part of the subject. A common error is "Maya and me presented," because me is not the subject form.`;
    }
    if (lower.includes("comma") || lower.includes("dash") || lower.includes("parentheses") || lower.includes("punctuation")) {
      return `Rule: punctuation should make the sentence easier to read by showing pauses, lists, or extra information. For example, "The rain barrel, an inexpensive tool, collected runoff" uses commas to set off extra information. A common error is placing commas where they split the subject from its verb.`;
    }
    if (lower.includes("sentence") || lower.includes("pattern") || lower.includes("combining")) {
      return `Rule: sentence patterns should make ideas clear and varied without changing the meaning. For example, "After testing the bridge, the team recorded data" combines two related actions smoothly. A common error is combining ideas so awkwardly that the subject, verb, or sequence becomes unclear.`;
    }
    return `Rule: conventions are specific grammar, punctuation, capitalization, and sentence choices that make writing clear. For example, "The pages are torn" works because the plural subject pages matches are. A common error is choosing a verb or punctuation mark because a nearby word looks right instead of checking the sentence structure.`;
  }
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
  if (lower.includes("vocab")) return `Vocabulary questions ask you to use context clues. Read before and after the word, look for examples or contrasts, and choose the meaning that best fits the sentence.`;
  if (lower.includes("structure")) return `Text structure is how an author organizes ideas. Look for signal words that show cause and effect, problem and solution, compare and contrast, sequence, or description.`;
  return `Main idea is the complete point a passage or section makes about a topic. For example, "school gardens help students learn science and reduce waste" is a main idea, while "school gardens" is only a topic. Strong details should prove the full idea, not just mention something interesting.`;
}

function workedExampleForSkill(skill: string, gradeLevel: number) {
  const lower = skill.toLowerCase();
  if (isConventionsSkill(lower)) {
    if (lower.includes("subject") && lower.includes("verb")) {
      return `Question: Which sentence uses correct subject-verb agreement? Worked answer: In "The stack of notebooks is on the cart," the subject is stack, not notebooks. Stack is singular, so is agrees. The nearby plural word notebooks is only part of a phrase and should not control the verb.`;
    }
    if (lower.includes("pronoun")) {
      return `Question: Which pronoun is correct in the sentence? Worked answer: In "The teacher gave Carlos and me feedback," me is correct because the pronoun is receiving the action after gave. Use I for subjects, but use me for objects.`;
    }
    if (lower.includes("comma") || lower.includes("dash") || lower.includes("parentheses") || lower.includes("punctuation")) {
      return `Question: Which sentence punctuates extra information correctly? Worked answer: "The model, which used recycled cardboard, held the most weight" is correct because the commas set off information that adds detail but is not needed to identify the model.`;
    }
    if (lower.includes("sentence") || lower.includes("pattern") || lower.includes("combining")) {
      return `Question: Which revision improves sentence variety? Worked answer: "After the class collected data, they revised the graph" is stronger than two choppy sentences because it connects the time relationship clearly while keeping the subject and verb easy to follow.`;
    }
    return `Question: Which sentence follows standard English conventions? Worked answer: First find the subject and verb, then check punctuation. In "The pages in the notebook are wrinkled, but the cover is clean," pages agrees with are, cover agrees with is, and the comma before but joins two complete ideas.`;
  }
  if (lower.includes("inference")) return `Question: What can be inferred about the character? Worked answer: First find clues in what the character says and does. If the character checks the sky, packs extra supplies, and warns a friend, you can infer the character is cautious. The evidence proves the inference because each action shows planning.`;
  if (lower.includes("evidence")) return `Question: Which sentence best supports the idea that the scientist was careful? Worked answer: Choose the detail that shows careful actions, such as checking notes twice or repeating an experiment. That evidence proves the idea because it shows the scientist did not rush.`;
  if (lower.includes("theme")) return `Question: What theme is shown when a character keeps practicing after failing? Worked answer: A possible theme is, "Perseverance helps people improve." The evidence is the character's repeated practice and the better result at the end.`;
  if (lower.includes("rising action") || lower.includes("raising action")) return `Question: Which event is part of the rising action? Worked answer: Choose the event that makes the conflict more difficult before the climax. If thunder gets closer and Nora must decide whether to protect the signs or leave, that builds tension and moves the plot toward the big decision.`;
  if (lower.includes("setting")) return `Question: How does the setting affect the story? Worked answer: First identify the time and place. Then explain the effect. If thunder begins while Nora is outside protecting garden signs, the stormy setting makes the conflict more urgent and pushes Nora to make a brave choice.`;
  if (lower.includes("plot")) return `Question: How does this event affect the plot? Worked answer: First identify the conflict. Then explain what the event causes next. If Nora decides to protect the garden signs during a storm, that choice moves the story forward because it creates action, reveals her responsibility, and leads toward the resolution.`;
  if (lower.includes("point of view") || lower === "pov") return `Question: How does the author develop point of view? Worked answer: Look at what the narrator notices and the words used to describe the event. If the narrator calls a task "a chance to prove responsibility," that wording shows the narrator sees the task as important, not annoying.`;
  if (lower.includes("figurative")) return `Question: What does "the problem sat like a stone in her pocket" suggest? Worked answer: The phrase does not mean there is a real stone. It means the problem feels heavy and hard to ignore. The simile creates a serious tone.`;
  if (lower.includes("flashback")) return `Question: Why does the author include the flashback? Worked answer: The earlier scene shows that the character once failed while speaking in front of others. That explains the character's fear in the present and helps develop the conflict.`;
  if (lower.includes("vocab")) return `Question: What does "observe" mean in the passage? Worked answer: If nearby sentences say the students watched carefully and wrote notes, then "observe" means to watch closely.`;
  if (lower.includes("structure")) return `Question: Why does the author use headings? Worked answer: Headings divide the text into topics, which helps readers understand how each section adds to the central idea.`;
  return `Question: What is the main idea of the section? Worked answer: First ask, "What are most sentences about?" Then choose the answer that covers all key details, not just one fact.`;
}

function buildPractice(skill: string, mode: string, gradeLevel: number, count: number, libraryScenarios: PracticeQuestion[] = [], standardCode = ""): PracticeQuestion[] {
  const cannedScenarios = practiceScenarios(skill, gradeLevel, standardCode);
  const librarySample = sampleWithoutReplacement(libraryScenarios, count, `${gradeLevel}:${skill}:${mode}`);
  const preferCanned = standardCode.startsWith("CC.1.2.");
  const scenarios = preferCanned
    ? [...cannedScenarios.slice(0, count), ...librarySample].slice(0, count)
    : [...librarySample, ...repeatToCount(cannedScenarios, Math.max(0, count - librarySample.length))];
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
      interactionType: scenario.interactionType,
    };
  }).filter((question) => !isGenericTemplateLeak(question, standardCode));
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

function practiceScenarios(skill: string, gradeLevel: number, standardCode = ""): PracticeQuestion[] {
  const lower = skill.toLowerCase();
  if (standardCode.startsWith("CC.1.4.") || isConventionsSkill(lower)) {
    return conventionsPracticeScenarios(skill);
  }
  if (standardCode.startsWith("CC.1.2.") || isInformationalSkill(lower)) {
    return informationalPracticeScenarios(skill);
  }
  if (standardCode.startsWith("CC.1.3.") || isLiterarySkill(lower)) {
    return literaryPracticeScenarios(skill, standardCode);
  }
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

  return informationalPracticeScenarios("informational reading");
}

type LiteraryScenarioConfig = {
  skillName: string;
  clozeSentence: string;
  clozeChoices: string[];
  clozeAnswer: string;
  passage: string;
  question: string;
  answerChoices: string[];
  correctAnswer: string;
  strongEvidence: string[];
  weakEvidence: string[];
  explanation: string;
  coachHint: string;
  explainPrompt: string;
};

function informationalPracticeScenarios(skill: string): PracticeQuestion[] {
  const lower = skill.toLowerCase();
  if (lower.includes("main idea") || lower.includes("central idea")) {
    return readingScenarioSet({
      skillName: "central idea",
      passageType: "informational",
      clozeSentence: "A main idea covers ___ of the passage's details, not just one fact.",
      clozeChoices: ["most", "one", "none", "the title"],
      clozeAnswer: "most",
      passage: `Students at Brook School started a compost bin behind the cafeteria. Each lunch period, volunteers collect fruit peels and vegetable scraps instead of throwing them away. By spring, the compost is mixed into the garden soil, and the science club tracks how the richer soil helps new plants grow.`,
      question: "Which sentence best summarizes the central idea?",
      answerChoices: [
        "Brook School students use compost to reduce waste and support the school garden.",
        "Students collect fruit peels during lunch.",
        "The compost bin is located behind the cafeteria.",
        "Spring weather helps every garden grow faster.",
      ],
      correctAnswer: "Brook School students use compost to reduce waste and support the school garden.",
      strongEvidence: ["Strong support: Volunteers collect fruit peels and vegetable scraps instead of throwing them away.", "Strong support: The compost is mixed into garden soil to help new plants grow."],
      weakEvidence: ["Weak or off-topic: The bin is behind the cafeteria.", "Weak or off-topic: The science club tracks the garden."],
      explanation: "The central idea includes both reducing waste and helping the garden, which are supported by several details.",
      coachHint: "A central idea should cover most of the important details, not just one sentence.",
      explainPrompt: "What is the central idea of this passage? Explain how at least one supporting detail connects to it.",
    });
  }
  if (lower.includes("evidence") || lower.includes("cite")) {
    return readingScenarioSet({
      skillName: "informational evidence",
      passageType: "informational",
      clozeSentence: "Strong evidence from an informational text is ___ and directly supports the claim.",
      clozeChoices: ["specific", "general", "loud", "colorful"],
      clozeAnswer: "specific",
      passage: `The school garden became a busy outdoor classroom. In a spring survey, 82 percent of students said science felt easier to understand after planting seeds, measuring growth, and recording soil temperature. Teachers also reported that students asked more questions during garden lessons than during textbook-only lessons.`,
      question: "Which sentence best supports the claim that school gardens improve student engagement?",
      answerChoices: [
        "Teachers reported that students asked more questions during garden lessons.",
        "The school garden was busy in the spring.",
        "Students planted seeds in soil.",
        "The survey was given during science class.",
      ],
      correctAnswer: "Teachers reported that students asked more questions during garden lessons.",
      strongEvidence: ["Strong support: 82 percent of students said science felt easier to understand after garden activities.", "Strong support: Teachers reported that students asked more questions during garden lessons."],
      weakEvidence: ["Weak or off-topic: The garden was busy in the spring.", "Weak or off-topic: Students recorded soil temperature."],
      explanation: "The teacher report directly supports the engagement claim because asking more questions shows active participation.",
      coachHint: "Strong evidence should prove the claim, not just mention the same topic.",
      explainPrompt: "Which sentence in this passage best supports the author's main claim? Explain why it is the strongest evidence.",
    });
  }
  if (lower.includes("author's purpose") || lower.includes("purpose")) {
    return readingScenarioSet({
      skillName: "author's purpose",
      passageType: "informational",
      clozeSentence: "Authors of informational texts usually write to inform, explain, persuade, or ___.",
      clozeChoices: ["describe", "rhyme", "act", "decorate"],
      clozeAnswer: "describe",
      passage: `A rain barrel collects water from a roof and stores it for later use. The barrel connects to a downspout, and a screen keeps leaves out of the water. Many gardeners use the stored water during dry weeks instead of turning on a hose.`,
      question: "What is the author's main purpose?",
      answerChoices: [
        "To explain how a rain barrel works.",
        "To entertain readers with a funny story.",
        "To persuade readers that hoses should be banned.",
        "To describe a character's problem.",
      ],
      correctAnswer: "To explain how a rain barrel works.",
      strongEvidence: ["Strong support: The passage explains that a barrel connects to a downspout.", "Strong support: The passage describes how a screen keeps leaves out of the water."],
      weakEvidence: ["Weak or off-topic: Gardeners may use water during dry weeks.", "Weak or off-topic: The passage mentions roofs."],
      explanation: "The author explains the parts and function of a rain barrel, so the purpose is to explain.",
      coachHint: "Look at whether the text mostly teaches, explains, persuades, describes, or entertains.",
      explainPrompt: "What is this author's purpose? Explain using two specific words or phrases from the text that show that purpose.",
    });
  }
  if (lower.includes("structure") || lower.includes("cause") || lower.includes("sequence") || lower.includes("compare")) {
    return readingScenarioSet({
      skillName: "text structure",
      passageType: "informational",
      clozeSentence: "Cause-and-effect text structure uses signal words like 'because,' 'so,' and ___.",
      clozeChoices: ["therefore", "however", "first", "meanwhile"],
      clozeAnswer: "therefore",
      passage: `Because the city added bike lanes near two schools, riders had a marked place to travel. Drivers could predict where cyclists would be, so traffic moved more smoothly during arrival time. Therefore, the morning commute became safer and more organized.`,
      question: "Which text structure does the author use?",
      answerChoices: ["Cause and effect", "Compare and contrast", "Sequence", "Problem and solution"],
      correctAnswer: "Cause and effect",
      strongEvidence: ["Strong support: The passage uses the signal word because to show why bike lanes changed traffic.", "Strong support: The passage uses so and therefore to show effects."],
      weakEvidence: ["Weak or off-topic: The bike lanes are near schools.", "Weak or off-topic: The passage mentions morning arrival time."],
      explanation: "The passage explains causes and effects using signal words such as because, so, and therefore.",
      coachHint: "Signal words can reveal how an informational text is organized.",
      explainPrompt: "What text structure does this passage use? Identify one signal word and explain how it shows the structure.",
    });
  }
  if (lower.includes("point of view")) {
    return readingScenarioSet({
      skillName: "author's point of view",
      passageType: "informational",
      clozeSentence: "An author's point of view in informational text is shown through word choice, examples, and ___.",
      clozeChoices: ["tone", "font", "length", "title"],
      clozeAnswer: "tone",
      passage: `The new weekend bus route is a practical improvement for families. Instead of waiting for rides or paying for extra gas, students can reach the library, recreation center, and tutoring program with one low-cost pass.`,
      question: "What is the author's point of view on this topic?",
      answerChoices: [
        "The author supports the weekend bus route.",
        "The author believes buses are too noisy.",
        "The author thinks libraries should close on weekends.",
        "The author is unsure whether students need transportation.",
      ],
      correctAnswer: "The author supports the weekend bus route.",
      strongEvidence: ["Strong support: The author calls the route a practical improvement.", "Strong support: The author lists helpful places students can reach with one pass."],
      weakEvidence: ["Weak or off-topic: The route runs on weekends.", "Weak or off-topic: The passage mentions a library."],
      explanation: "Positive word choice and helpful examples show the author's supportive point of view.",
      coachHint: "Author point of view is often shown by loaded words, examples, and tone.",
      explainPrompt: "What is the author's point of view? Explain using one specific word choice or phrase from the text.",
    });
  }
  if (lower.includes("argument") || lower.includes("evaluate") || lower.includes("claim")) {
    return readingScenarioSet({
      skillName: "argument evaluation",
      passageType: "informational",
      clozeSentence: "A strong argument uses ___ that come from reliable sources, not just opinions.",
      clozeChoices: ["evidence", "feelings", "rumors", "slogans"],
      clozeAnswer: "evidence",
      passage: `The student council argues that water-bottle filling stations should replace two older fountains. Their survey found that 76 percent of students would refill bottles more often if stations were available, and the nurse reported fewer disposable bottles in schools that already added stations.`,
      question: "Which reason most strengthens the author's argument?",
      answerChoices: [
        "A survey found that 76 percent of students would refill bottles more often.",
        "Some students like the color of the new stations.",
        "The fountains are located in a hallway.",
        "A few students think disposable bottles look better.",
      ],
      correctAnswer: "A survey found that 76 percent of students would refill bottles more often.",
      strongEvidence: ["Strong support: The survey found that 76 percent of students would refill bottles more often.", "Strong support: The nurse reported fewer disposable bottles in schools with stations."],
      weakEvidence: ["Weak or off-topic: Some students like the color of the stations.", "Weak or off-topic: The fountains are in a hallway."],
      explanation: "The survey data strengthens the argument because it is specific evidence tied to student behavior.",
      coachHint: "A strong argument needs relevant evidence from reliable sources.",
      explainPrompt: "Is the author's argument strong or weak? Explain using one specific piece of evidence or lack of evidence from the passage.",
    });
  }
  if (lower.includes("summary") || lower.includes("summarize") || lower.includes("summariz")) {
    return readingScenarioSet({
      skillName: "summarizing informational text",
      passageType: "informational",
      clozeSentence: "A summary includes the most important ___ from the passage in your own words.",
      clozeChoices: ["ideas", "examples", "quotations", "opinions"],
      clozeAnswer: "ideas",
      passage: `The community center began lending tool kits to neighborhood volunteers. Each kit includes gloves, trash bags, small shovels, and safety vests. Volunteers use the kits to clean vacant lots and plant flowers near bus stops. Since the program began, twelve blocks have held cleanup days.`,
      question: "Which sentence is the best summary?",
      answerChoices: [
        "A community tool-kit program helps volunteers clean and improve neighborhood spaces.",
        "Each kit includes gloves and trash bags.",
        "The passage is about tools.",
        "The community center stopped all volunteer projects.",
      ],
      correctAnswer: "A community tool-kit program helps volunteers clean and improve neighborhood spaces.",
      strongEvidence: ["Strong support: Volunteers use the kits to clean vacant lots and plant flowers.", "Strong support: Twelve blocks have held cleanup days since the program began."],
      weakEvidence: ["Weak or off-topic: Each kit includes gloves.", "Weak or off-topic: Bus stops are mentioned in the passage."],
      explanation: "The best summary includes the program and its main effect, not just one detail.",
      coachHint: "A summary should include the central idea and key support without copying every detail.",
      explainPrompt: "Write a one-sentence summary of this passage. Include the main idea and one key supporting detail in your own words.",
    });
  }
  return readingScenarioSet({
    skillName: "informational reading",
    passageType: "informational",
    clozeSentence: "A strong informational answer connects the central idea to ___ from the passage.",
    clozeChoices: ["supporting details", "story characters", "guesses", "dialogue"],
    clozeAnswer: "supporting details",
    passage: `A neighborhood repair cafe opens once a month at the library. Volunteers help visitors fix torn clothing, wobbly chairs, and small appliances. The program keeps useful items out of landfills and teaches residents simple repair skills.`,
    question: "Which sentence best states the central idea?",
    answerChoices: [
      "The repair cafe helps people fix items while reducing waste.",
      "The repair cafe opens at the library.",
      "Some chairs become wobbly over time.",
      "Libraries should only lend books.",
    ],
    correctAnswer: "The repair cafe helps people fix items while reducing waste.",
    strongEvidence: ["Strong support: Volunteers help visitors fix torn clothing, chairs, and appliances.", "Strong support: The program keeps useful items out of landfills."],
    weakEvidence: ["Weak or off-topic: The cafe opens once a month.", "Weak or off-topic: The library hosts the program."],
    explanation: "The central idea is that the repair cafe teaches repair and reduces waste.",
    coachHint: "Connect a broad informational claim to the details that prove it.",
    explainPrompt: "What is the central idea of this informational passage? Explain using one supporting detail.",
  });
}

function literaryPracticeScenarios(skill: string, standardCode = ""): PracticeQuestion[] {
  const lower = skill.toLowerCase();
  if (lower.includes("inference") || (lower.includes("evidence") && !lower.includes("conventions"))) {
    return literaryScenarioSet({
      skillName: "inference and evidence",
      clozeSentence: "A strong inference uses ___ from the passage.",
      clozeChoices: ["text evidence", "opinions", "guesses", "summaries"],
      clozeAnswer: "text evidence",
      passage: `Mara erased the answer she had written, checked the chart one more time, and whispered the steps under her breath. When the teacher walked by, Mara covered her paper with one hand but kept working.`,
      question: "What can you infer about Mara?",
      answerChoices: [
        "Mara wants to be careful because she is unsure about her answer.",
        "Mara is trying to make another student laugh.",
        "Mara already knows every answer on the page.",
        "Mara wants to leave the room immediately.",
      ],
      correctAnswer: "Mara wants to be careful because she is unsure about her answer.",
      strongEvidence: ["Strong support: Mara erased her answer and checked the chart again.", "Strong support: Mara whispered the steps under her breath while she kept working."],
      weakEvidence: ["Weak or off-topic: The teacher walked by Mara's desk.", "Weak or off-topic: Mara used one hand to cover her paper."],
      explanation: "Rechecking the chart and whispering the steps show that Mara is uncertain but trying to be careful.",
      coachHint: "An inference must connect a character's actions to a reasonable idea about feelings or traits.",
      explainPrompt: "Read this passage carefully. What can you infer about Mara's feelings? Explain using one specific detail from the text.",
    });
  }
  if (lower.includes("theme") || lower.includes("central message")) {
    return literaryScenarioSet({
      skillName: "theme",
      clozeSentence: "A theme is the ___ a story suggests, not just the topic.",
      clozeChoices: ["message", "setting", "narrator", "title"],
      clozeAnswer: "message",
      passage: `Eli's first model bridge collapsed before the class could test it. He wanted to toss the pieces away, but he reread his notes, noticed where the supports had bent, and rebuilt the center with shorter strips. The second bridge held twice as much weight.`,
      question: "Which theme does this story develop?",
      answerChoices: [
        "Learning from mistakes can lead to improvement.",
        "Eli's bridge is made from short strips.",
        "The class tested a model bridge.",
        "Science class should always happen outside.",
      ],
      correctAnswer: "Learning from mistakes can lead to improvement.",
      strongEvidence: ["Strong support: Eli reread his notes after the first bridge collapsed.", "Strong support: The second bridge held twice as much weight after Eli rebuilt it."],
      weakEvidence: ["Weak or off-topic: The bridge was tested by the class.", "Weak or off-topic: Eli used shorter strips in the center."],
      explanation: "The story shows Eli improving because he studies the failure and tries again.",
      coachHint: "A theme should be a general message that fits the whole story, not just one plot detail.",
      explainPrompt: "Identify a theme from this passage and explain how a specific character action develops it.",
    });
  }
  if (lower.includes("character") && !lower.includes("setting")) {
    return literaryScenarioSet({
      skillName: "character analysis",
      clozeSentence: "A character's traits are revealed through their ___, words, and decisions.",
      clozeChoices: ["actions", "clothing", "name", "setting"],
      clozeAnswer: "actions",
      passage: `When Andre noticed that Lila had no colored pencils, he quietly slid half of his set across the table. Later, he stayed during recess to help her label the map even though his own project was finished.`,
      question: "What trait does Andre show?",
      answerChoices: ["Andre is considerate.", "Andre is impatient.", "Andre is careless.", "Andre is confused by maps."],
      correctAnswer: "Andre is considerate.",
      strongEvidence: ["Strong support: Andre quietly shared half of his colored pencils.", "Strong support: Andre stayed during recess to help Lila label the map."],
      weakEvidence: ["Weak or off-topic: Andre's own project was finished.", "Weak or off-topic: The students were labeling a map."],
      explanation: "Andre's actions show that he notices another student's need and chooses to help.",
      coachHint: "Character traits are proved by what the character does and says.",
      explainPrompt: "What character trait does Andre show? Explain using one specific action from the passage.",
    });
  }
  if (lower.includes("plot") || lower.includes("rising action") || lower.includes("conflict")) {
    return literaryScenarioSet({
      skillName: "plot development",
      clozeSentence: "Rising action is the part of the plot where the ___ grows toward a climax.",
      clozeChoices: ["conflict", "setting", "narrator", "title"],
      clozeAnswer: "conflict",
      passage: `The debate timer showed two minutes left when Nia realized her final evidence card was missing. Her partner searched the folder while the other team finished its argument. Nia took a breath and reached for the notes she had written in the margin.`,
      question: "Which event is part of the rising action?",
      answerChoices: [
        "Nia realizes her final evidence card is missing with two minutes left.",
        "The debate eventually ends after both teams speak.",
        "The classroom has a timer near the front.",
        "Nia wrote notes in the margin earlier.",
      ],
      correctAnswer: "Nia realizes her final evidence card is missing with two minutes left.",
      strongEvidence: ["Strong support: The timer showed two minutes left when Nia noticed the missing card.", "Strong support: Her partner searched while the other team finished its argument."],
      weakEvidence: ["Weak or off-topic: Nia had written notes in the margin.", "Weak or off-topic: The debate was held in a classroom."],
      explanation: "The missing card increases pressure and makes the conflict harder before Nia responds.",
      coachHint: "Rising action makes the problem more difficult before the climax or turning point.",
      explainPrompt: "Which event in this story builds the conflict? Explain why it moves the plot toward the climax.",
    });
  }
  if (lower.includes("setting")) {
    return literaryScenarioSet({
      skillName: "setting impact",
      clozeSentence: "Setting affects events when the time or place changes what characters ___.",
      clozeChoices: ["do", "look like", "name", "quote"],
      clozeAnswer: "do",
      passage: `The trail grew slick as freezing rain tapped against the leaves. Coach Rivera pointed to the darkening sky and turned the hiking group toward the visitor center instead of the overlook.`,
      question: "How does the setting affect the story?",
      answerChoices: [
        "The icy weather makes Coach Rivera change the group's plan.",
        "The visitor center is near the trail.",
        "The leaves are part of the forest setting.",
        "The hikers wanted to see an overlook.",
      ],
      correctAnswer: "The icy weather makes Coach Rivera change the group's plan.",
      strongEvidence: ["Strong support: Freezing rain made the trail slick.", "Strong support: Coach Rivera turned the group toward the visitor center."],
      weakEvidence: ["Weak or off-topic: The story mentions leaves on the trail.", "Weak or off-topic: The overlook is a place the group might have visited."],
      explanation: "The weather and trail conditions directly change what the characters decide to do.",
      coachHint: "Setting matters when it affects choices, conflict, mood, or events.",
      explainPrompt: "How does this setting change what happens in the story? Use one specific detail about the time or place.",
    });
  }
  if (lower.includes("point of view") || lower === "pov") {
    return literaryScenarioSet({
      skillName: "point of view",
      clozeSentence: "First-person point of view uses pronouns like ___ and 'my' to show the narrator's experience.",
      clozeChoices: ["I", "she", "they", "it"],
      clozeAnswer: "I",
      passage: `I tightened the ribbon on my science fair display and tried not to look at the judges. My hands shook, but I reminded myself that I knew every part of the experiment.`,
      question: "What is the point of view of this passage?",
      answerChoices: ["First person", "Third person limited", "Third person omniscient", "Second person"],
      correctAnswer: "First person",
      strongEvidence: ["Strong support: The narrator says, \"I tightened the ribbon.\"", "Strong support: The narrator uses the phrase \"my science fair display.\""],
      weakEvidence: ["Weak or off-topic: The passage mentions science fair judges.", "Weak or off-topic: The narrator knows the experiment."],
      explanation: "The narrator uses I and my, so the passage is told from first-person point of view.",
      coachHint: "Point of view clues often appear in pronouns and what the narrator can know.",
      explainPrompt: "What is the point of view in this passage? Explain how you know using a specific word or phrase from the text.",
    });
  }
  if (lower.includes("figurative") || lower.includes("simile") || lower.includes("metaphor") || lower.includes("personification") || lower.includes("connotation") || lower.includes("vocab")) {
    return literaryScenarioSet({
      skillName: "figurative language",
      clozeSentence: "A simile compares two unlike things using the word 'like' or ___.",
      clozeChoices: ["as", "the", "because", "however"],
      clozeAnswer: "as",
      passage: `Before the solo, Jonah's courage was a small flame cupped in his hands. Each friendly nod from the choir made it burn a little brighter.`,
      question: "What does the figurative language suggest?",
      answerChoices: [
        "Jonah's confidence is fragile but growing.",
        "Jonah is holding an actual flame.",
        "The choir is standing outside near a fire.",
        "Jonah forgot the words to the song.",
      ],
      correctAnswer: "Jonah's confidence is fragile but growing.",
      strongEvidence: ["Strong support: Jonah's courage is compared to a small flame.", "Strong support: Friendly nods make the flame burn brighter."],
      weakEvidence: ["Weak or off-topic: Jonah is singing a solo.", "Weak or off-topic: The choir gives friendly nods."],
      explanation: "The metaphor shows Jonah's courage as small but becoming stronger with support.",
      coachHint: "Interpret what the comparison suggests beyond the literal meaning.",
      explainPrompt: "What does the figurative phrase \"a small flame cupped in his hands\" suggest about Jonah? Explain the meaning beyond the literal words.",
    });
  }
  if (lower.includes("flashback") || (lower.includes("structure") && standardCode.startsWith("CC.1.3."))) {
    return literaryScenarioSet({
      skillName: "flashback and story structure",
      clozeSentence: "A flashback shows an event from the character's ___.",
      clozeChoices: ["past", "future", "imagination", "dreams"],
      clozeAnswer: "past",
      passage: `At the edge of the pool, Tessa froze. She remembered last summer, when she had slipped from the diving board and swallowed a mouthful of water. Now her coach waited quietly until Tessa nodded and stepped forward.`,
      question: "Why does the author include the flashback?",
      answerChoices: [
        "To explain why Tessa feels nervous before stepping forward.",
        "To describe every rule at the pool.",
        "To show that Tessa never learned to swim.",
        "To explain why the coach leaves the pool.",
      ],
      correctAnswer: "To explain why Tessa feels nervous before stepping forward.",
      strongEvidence: ["Strong support: Tessa remembers slipping from the diving board last summer.", "Strong support: Tessa freezes at the edge of the pool before stepping forward."],
      weakEvidence: ["Weak or off-topic: The coach waits quietly.", "Weak or off-topic: The story happens at a pool."],
      explanation: "The earlier memory explains Tessa's current hesitation and makes her choice more meaningful.",
      coachHint: "A flashback should help explain a present feeling, choice, or conflict.",
      explainPrompt: "Why does the author include this flashback? Explain how the earlier scene helps the reader understand a present-day choice or feeling.",
    });
  }
  return literaryScenarioSet({
    skillName: "literary reading",
    clozeSentence: "A strong literary answer connects a claim to ___ from the story.",
    clozeChoices: ["evidence", "opinions", "titles", "guesses"],
    clozeAnswer: "evidence",
    passage: `Sofia wanted to quit after the first rehearsal, but she stayed to help fold the curtains and listened while the director explained the scene again. By Friday, she knew everyone's entrance cues.`,
    question: "What does Sofia's behavior show?",
    answerChoices: ["Sofia becomes more committed through practice.", "Sofia dislikes every person in the play.", "Sofia wants the director to cancel rehearsal.", "Sofia already knows every scene at the start."],
    correctAnswer: "Sofia becomes more committed through practice.",
    strongEvidence: ["Strong support: Sofia stays after rehearsal to help fold the curtains.", "Strong support: By Friday, Sofia knows everyone's entrance cues."],
    weakEvidence: ["Weak or off-topic: The director explains a scene.", "Weak or off-topic: The play has curtains."],
    explanation: "Sofia's actions show growing commitment because she keeps helping and learning.",
    coachHint: "Use story details to support a claim about character, theme, plot, or meaning.",
    explainPrompt: "Make a claim about this literary passage and explain it using one specific detail from the story.",
  });
}

function literaryScenarioSet(config: LiteraryScenarioConfig): PracticeQuestion[] {
  return readingScenarioSet({ ...config, passageType: "literary" });
}

function readingScenarioSet(config: LiteraryScenarioConfig & { passageType?: "literary" | "informational" }): PracticeQuestion[] {
  const evidenceChoices = [...config.strongEvidence, ...config.weakEvidence].slice(0, 4);
  const sourceLabel = config.passageType === "informational" ? "passage" : "story";
  return [
    {
      passage: config.passage,
      question: config.question,
      choices: config.answerChoices,
      correctAnswer: config.correctAnswer,
      explanation: config.explanation,
      coachHint: config.coachHint,
      interactionType: "sentence-select",
    },
    {
      passage: `${config.clozeSentence} ${config.passage}`,
      question: config.clozeSentence,
      choices: config.clozeChoices,
      correctAnswer: config.clozeAnswer,
      explanation: `The word "${config.clozeAnswer}" correctly completes the ${config.skillName} rule.`,
      coachHint: config.coachHint,
      interactionType: "inline-cloze",
    },
    {
      passage: config.passage,
      question: `Which details strongly support the ${config.skillName} answer?`,
      choices: evidenceChoices,
      correctAnswer: config.strongEvidence[0],
      explanation: "Strong support is a detail that directly proves the answer; weak support is unrelated or too general.",
      coachHint: config.coachHint,
      interactionType: "evidence-match",
    },
    {
      passage: config.passage,
      question: `Sort the evidence by whether it supports the ${config.skillName} claim.`,
      choices: evidenceChoices,
      correctAnswer: config.strongEvidence[0],
      explanation: `Sort details by whether they directly support the ${sourceLabel} claim.`,
      coachHint: config.coachHint,
      interactionType: "evidence-sort",
    },
    {
      passage: config.clozeSentence,
      question: config.clozeSentence,
      choices: config.clozeChoices,
      correctAnswer: config.clozeAnswer,
      explanation: `This rule explains how to answer ${config.skillName} questions with precise evidence.`,
      coachHint: config.coachHint,
      interactionType: "word-cloze",
    },
    {
      passage: config.passage,
      question: config.explainPrompt,
      choices: [config.correctAnswer, config.strongEvidence[0]],
      correctAnswer: config.correctAnswer,
      explanation: config.explanation,
      coachHint: "Use your own words and include one exact detail from the passage.",
      interactionType: "short-response",
    },
  ];
}

function conventionsPracticeScenarios(skill: string): PracticeQuestion[] {
  const lower = skill.toLowerCase();
  if (lower.includes("pronoun")) return conventionScenarioSet("pronouns", "Use a ___ pronoun after a verb that takes an object.", ["subject", "object", "possessive", "reflexive"], "object", "The coach gave Maya and them feedback after practice.", "The coach gave Maya and they feedback after practice.", "Them is correct because it receives the action after gave.", "Ask whether the pronoun is doing the action or receiving it.");
  if (lower.includes("comma") || lower.includes("dash") || lower.includes("parentheses") || lower.includes("punctuation")) return conventionScenarioSet("commas", "Use commas to set off ___ information.", ["extra", "essential", "main", "missing"], "extra", "The book, which I borrowed from the library, was overdue.", "The book which I borrowed from the library was overdue.", "The commas set off extra information that is not needed to identify the book.", "Check whether commas clarify extra information without splitting the subject from the verb.");
  if (lower.includes("capital")) return conventionScenarioSet("capitalization", "Capitalize ___ nouns and important words in titles.", ["proper", "common", "plural", "action"], "proper", "On Tuesday, Maya visited the Franklin Institute.", "On tuesday, Maya visited the franklin institute.", "Tuesday and Franklin Institute are proper nouns, so they need capital letters.", "Look for names of days, people, places, organizations, and titles.");
  if (lower.includes("verb tense") || lower.includes("tense")) return conventionScenarioSet("verb tense", "Keep verb tense ___ unless the time clearly changes.", ["consistent", "plural", "possessive", "capitalized"], "consistent", "Yesterday, the team tested the bridge and recorded the results.", "Yesterday, the team tests the bridge and recorded the results.", "Tested and recorded are both past tense, so the time stays consistent.", "Use the time clue to decide whether the verbs should stay in past, present, or future tense.");
  if (lower.includes("apostrophe") || lower.includes("possessive")) return conventionScenarioSet("apostrophes", "Use an apostrophe to show ___ or to form a contraction.", ["possession", "comparison", "capitalization", "sequence"], "possession", "The student's notebook was full of careful observations.", "The students notebook was full of careful observations.", "Student's shows that the notebook belongs to one student.", "Ask who owns the item, then place the apostrophe correctly.");
  if (lower.includes("sentence") || lower.includes("pattern") || lower.includes("combining") || lower.includes("structure")) return conventionScenarioSet("sentence combining", "Combine related ideas when the new sentence stays ___ and complete.", ["clear", "louder", "shorter", "capital"], "clear", "After testing the paper bridge, the class recorded the results in a chart.", "Testing bridge class, recorded chart and results.", "The correct sentence combines related actions while keeping the meaning clear.", "The best revision should sound natural and keep the original meaning.");
  return conventionScenarioSet("subject-verb agreement", "A singular subject takes a ___ verb.", ["singular", "plural", "compound", "possessive"], "singular", "The stack of permission slips sits on the teacher's desk.", "The stack of permission slips sit on the teacher's desk.", "Stack is singular, so the verb sits agrees with it.", "Find the subject before choosing the verb. Do not let nearby plural words trick you.");
}

function conventionScenarioSet(skillName: string, clozeSentence: string, clozeChoices: string[], clozeAnswer: string, correctSentence: string, incorrectSentence: string, explanation: string, coachHint: string): PracticeQuestion[] {
  const needsFixing = `Needs fixing: ${incorrectSentence}`;
  const correctLabel = `Correct: ${correctSentence}`;
  return [
    {
      passage: `${correctSentence} ${incorrectSentence} Read each version and check the ${skillName} rule.`,
      question: `Which sentence uses ${skillName} correctly?`,
      choices: [correctSentence, incorrectSentence, incorrectSentence.replace(/\.$/, ",."), correctSentence.replace(/\.$/, "")],
      correctAnswer: correctSentence,
      explanation,
      coachHint,
      interactionType: "multiple-choice",
    },
    {
      passage: `${clozeSentence} The rule helps writers make sentence meaning clear.`,
      question: clozeSentence,
      choices: clozeChoices,
      correctAnswer: clozeAnswer,
      explanation: `The word "${clozeAnswer}" correctly completes the ${skillName} rule.`,
      coachHint,
      interactionType: "inline-cloze",
    },
    {
      passage: `${correctLabel}. ${needsFixing}. Correct: ${correctSentence.replace("The", "A")}. Needs fixing: ${incorrectSentence.replace("The", "A")}.`,
      question: `Classify each sentence as correctly written or needing a ${skillName} edit.`,
      choices: [correctLabel, needsFixing, `Correct: ${correctSentence.replace("The", "A")}`, `Needs fixing: ${incorrectSentence.replace("The", "A")}`],
      correctAnswer: correctLabel,
      explanation: `Correct sentences follow the ${skillName} rule; sentences marked needs fixing break that rule.`,
      coachHint,
      interactionType: "evidence-match",
    },
    {
      passage: `${correctSentence} ${incorrectSentence} ${correctSentence.replace(/\.$/, " today.")} ${incorrectSentence.replace(/\.$/, " today.")}`,
      question: `Sort the sentences by whether the ${skillName} choice is correct.`,
      choices: [correctSentence, incorrectSentence, correctSentence.replace(/\.$/, " today."), incorrectSentence.replace(/\.$/, " today.")],
      correctAnswer: correctSentence,
      explanation: `The correct examples follow the ${skillName} rule. The others need editing.`,
      coachHint,
      interactionType: "evidence-sort",
    },
    {
      passage: clozeSentence,
      question: clozeSentence,
      choices: clozeChoices,
      correctAnswer: clozeAnswer,
      explanation: `This cloze states the ${skillName} rule students should apply while editing.`,
      coachHint,
      interactionType: "word-cloze",
    },
    {
      passage: `Look at this sentence: "${correctSentence}" Compare it with this incorrect version: "${incorrectSentence}"`,
      question: `In your own words, explain why "${correctSentence}" is the correct ${skillName} choice.`,
      choices: [correctSentence, incorrectSentence],
      correctAnswer: correctSentence,
      explanation,
      coachHint: `Explain what the ${skillName} choice does and why it is needed.`,
      interactionType: "short-response",
    },
  ];
}

function isGenericTemplateLeak(question: PracticeQuestion, standardCode: string) {
  const isCheckedStrand = standardCode.startsWith("CC.1.4.") || standardCode.startsWith("CC.1.3.") || standardCode.startsWith("CC.1.2.");
  if (!isCheckedStrand) return false;
  const choices = new Set((question.choices || []).map((choice) => choice.trim().toLowerCase()));
  const genericReadingLeak = ["supported", "guessed", "copied", "unrelated"].every((choice) => choices.has(choice));
  const conventionsLabelLeak =
    (standardCode.startsWith("CC.1.3.") || standardCode.startsWith("CC.1.2.")) &&
    (Array.from(choices).some((choice) => choice.includes("correctly punctuated")) ||
      Array.from(choices).some((choice) => choice.includes("needs fixing")));
  const leaked = genericReadingLeak || conventionsLabelLeak;
  if (leaked) {
    logAiFailure({
      scope: "learningLessons.generic_template_leak",
      error: new Error(genericReadingLeak ? "Generic reading-strategy answer set leaked into strand-specific practice." : "Conventions label set leaked into literary practice."),
      context: { standardCode, question: question.question },
    });
  }
  return leaked;
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 20 ? value : fallback;
}

function safeSteps(value: unknown, fallback: LearningLessonBuild): LessonStepBuild[] {
  const deterministic = buildDeterministicSteps({
    skill: fallback.skill,
    gradeLevel: fallback.gradeLevel,
    lessonExplanation: fallback.lessonExplanation,
    workedExample: fallback.workedExample,
  });
  if (!Array.isArray(value)) return deterministic;

  const steps = value
    .map((raw, index) => normalizeStep(raw, index + 1, fallback))
    .filter((step): step is LessonStepBuild => Boolean(step))
    .sort((a, b) => a.order - b.order)
    .map((step, index) => ({ ...step, order: index + 1 }));

  if (steps.length < 3) {
    logAiFailure({
      scope: "learningLessons.invalid_step_dropped",
      error: new Error("Fewer than three valid lesson steps remained after validation."),
      context: { standardCode: fallback.standardCode, skill: fallback.skill, validStepCount: steps.length },
    });
    return deterministic;
  }

  return steps.slice(0, 6);
}

function normalizeStep(raw: unknown, fallbackOrder: number, context: { standardCode: string; skill: string }): LessonStepBuild | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const stepType = normalizeStepType(source.stepType);
  const title = stringInRange(source.title, 5, 100);
  const bodyText = stringInRange(source.bodyText, 50, 500);
  const narrationScript = stringInRange(source.narrationScript, 30, 300);
  const checkQuestion = stepType === "CHECK_QUESTION" ? normalizeCheckQuestion(source.checkQuestion) : null;

  if (!stepType || !title || !bodyText || !narrationScript || (stepType === "CHECK_QUESTION" && !checkQuestion)) {
    logAiFailure({
      scope: "learningLessons.invalid_step_dropped",
      error: new Error("Malformed AI lesson step."),
      context: { standardCode: context.standardCode, skill: context.skill, stepType: String(source.stepType || ""), fallbackOrder },
    });
    return null;
  }
  const qualityFailure = stepQualityFailure({ stepType, title, bodyText, narrationScript, standardCode: context.standardCode, skill: context.skill });
  if (qualityFailure) {
    logAiFailure({
      scope: qualityFailure.scope,
      error: new Error(qualityFailure.reason),
      context: { standardCode: context.standardCode, skill: context.skill, stepType, title },
    });
    return null;
  }

  return {
    order: Number(source.order) > 0 ? Number(source.order) : fallbackOrder,
    stepType,
    title,
    bodyText,
    narrationScript,
    imagePrompt: typeof source.imagePrompt === "string" && source.imagePrompt.trim() ? source.imagePrompt.trim().slice(0, 800) : null,
    checkQuestion,
  };
}

function stepQualityFailure({
  stepType,
  title,
  bodyText,
  narrationScript,
  standardCode,
}: {
  stepType: LessonStepBuild["stepType"];
  title: string;
  bodyText: string;
  narrationScript: string;
  standardCode: string;
  skill: string;
}) {
  const titleBody = `${title} ${bodyText}`.toLowerCase();
  const spoken = narrationScript.toLowerCase();
  const forbidden = FORBIDDEN_LESSON_PHRASES.find((phrase) => titleBody.includes(phrase) || spoken.includes(phrase));
  if (forbidden) return { scope: "learningLessons.forbidden_phrase", reason: `Forbidden lesson phrase: ${forbidden}` };
  if (bodyText.length < 80 || !hasConcreteExample(bodyText)) return { scope: "learningLessons.invalid_step_dropped", reason: "Step body is too thin or lacks a concrete example marker." };

  const isConventions = standardCode.startsWith("CC.1.4.");
  const isReading = standardCode.startsWith("CC.1.2.") || standardCode.startsWith("CC.1.3.");
  const hasConventionsMismatch = CONVENTIONS_MISMATCH_TERMS.some((term) => titleBody.includes(term));
  const hasConventionsTerm = CONVENTIONS_TERMS.some((term) => titleBody.includes(term));
  const hasGrammarTerm = GRAMMAR_TERMS.some((term) => titleBody.includes(term));
  const hasReadingTerm = READING_TERMS.some((term) => titleBody.includes(term));

  if (isConventions && hasConventionsMismatch && !hasConventionsTerm) return { scope: "learningLessons.strand_mismatch", reason: "Conventions step used reading-analysis vocabulary without conventions terminology." };
  if (isReading && hasGrammarTerm && !hasReadingTerm) return { scope: "learningLessons.strand_mismatch", reason: "Reading step used grammar vocabulary without passage-analysis terminology." };
  if (stepType === "EXPLANATION" && !hasConcreteExample(bodyText)) return { scope: "learningLessons.invalid_step_dropped", reason: "Explanation step lacks positive/common-error examples." };
  return null;
}

function hasConcreteExample(text: string) {
  const lower = text.toLowerCase();
  return EXAMPLE_MARKERS.some((marker) => lower.includes(marker)) || /"[^"]{3,}"/.test(text);
}

function standardStrand(standardCode: string) {
  if (standardCode.startsWith("CC.1.4.")) return "Conventions and Writing";
  if (standardCode.startsWith("CC.1.3.")) return "Literary Text";
  if (standardCode.startsWith("CC.1.2.")) return "Informational Text";
  return "ELA";
}

function buildDeterministicSteps({
  skill,
  gradeLevel,
  lessonExplanation,
  workedExample,
}: {
  skill: string;
  gradeLevel: number;
  lessonExplanation: string;
  workedExample: string;
}): LessonStepBuild[] {
  const titles = deterministicStepTitles(skill);
  return [
    {
      order: 1,
      stepType: "INTRO",
      title: titles.intro,
      bodyText: deterministicIntroForSkill(skill, gradeLevel),
      narrationScript: `This lesson zooms in on ${skill}. Watch for the exact clue, rule, or pattern that makes the answer work, then use that same move in practice.`,
      imagePrompt: `A student-friendly scene showing grade ${gradeLevel} learners applying ${skill}, no text in image`,
      checkQuestion: null,
    },
    {
      order: 2,
      stepType: "EXPLANATION",
      title: titles.explanation,
      bodyText: lessonExplanation,
      narrationScript: lessonExplanation.slice(0, 280),
      imagePrompt: null,
      checkQuestion: null,
    },
    {
      order: 3,
      stepType: "WORKED_EXAMPLE",
      title: titles.workedExample,
      bodyText: workedExample,
      narrationScript: workedExample.slice(0, 280),
      imagePrompt: `A clear classroom learning moment that supports ${skill}, no words or labels in the image`,
      checkQuestion: null,
    },
  ];
}

function deterministicStepTitles(skill: string) {
  const lower = skill.toLowerCase();
  if (isConventionsSkill(lower)) {
    if (lower.includes("subject") && lower.includes("verb")) {
      return {
        intro: "Finding The Sentence Subject",
        explanation: "Subject-Verb Agreement Rule",
        workedExample: "Avoiding Nearby Noun Traps",
      };
    }
    if (lower.includes("pronoun")) {
      return {
        intro: "Tracking Pronoun Jobs",
        explanation: "Pronoun Case And Agreement",
        workedExample: "Choosing Subject Or Object Pronouns",
      };
    }
    if (lower.includes("punctuation") || lower.includes("comma") || lower.includes("dash") || lower.includes("parentheses")) {
      return {
        intro: "Reading Punctuation Signals",
        explanation: "Punctuation That Clarifies Meaning",
        workedExample: "Setting Off Extra Information",
      };
    }
    return {
      intro: "Checking Sentence Structure",
      explanation: "Grammar Pattern And Example",
      workedExample: "Testing The Correct Revision",
    };
  }
  if (lower.includes("inference")) return { intro: "Connecting Clues To Ideas", explanation: "Inference Plus Evidence", workedExample: "Proving An Inference" };
  if (lower.includes("evidence")) return { intro: "Choosing Proof From Text", explanation: "Evidence That Supports A Claim", workedExample: "Linking Evidence To Reasoning" };
  if (lower.includes("theme")) return { intro: "Finding The Story Message", explanation: "Theme As A Complete Idea", workedExample: "Tracing Theme Through Events" };
  if (lower.includes("figurative")) return { intro: "Interpreting Nonliteral Language", explanation: "Figurative Meaning In Context", workedExample: "Explaining The Phrase Effect" };
  if (lower.includes("main") || lower.includes("central")) return { intro: "Topic Versus Main Idea", explanation: "Central Idea And Details", workedExample: "Testing Details Against The Idea" };
  return { intro: `Noticing ${skill}`.slice(0, 100), explanation: `${skill} Pattern And Example`.slice(0, 100), workedExample: `${skill} Reasoning In Action`.slice(0, 100) };
}

function deterministicIntroForSkill(skill: string, gradeLevel: number) {
  const lower = skill.toLowerCase();
  if (isConventionsSkill(lower)) {
    return `Imagine rereading a sentence and hearing that one part sounds off. In grade ${gradeLevel}, strong writers slow down and check the sentence structure. For example, in "The stack of books is heavy," stack is the subject, so the singular verb is is correct.`;
  }
  if (lower.includes("main") || lower.includes("central")) {
    return `A topic names what a text is about, but a main idea says the full point. For example, "school gardens" is a topic, while "school gardens help students learn science and reduce waste" is a main idea with a clear claim.`;
  }
  if (lower.includes("inference") || lower.includes("evidence")) {
    return `A strong reading answer connects a clue to a reasonable idea. For example, if a character checks the clock three times and taps a pencil, those actions can support the inference that the character feels impatient.`;
  }
  if (lower.includes("figurative")) {
    return `Figurative language asks you to read beyond the literal words. For example, "the question followed him home" does not mean a question walked; it means he kept thinking about the problem.`;
  }
  return `This ${skill} lesson begins with a concrete example, then shows the reasoning move that makes the answer work. For example, a strong response names the clue, applies the rule or pattern, and explains why that clue matters.`;
}

function normalizeStepType(value: unknown): LessonStepBuild["stepType"] | null {
  const text = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (["INTRO", "EXPLANATION", "MODEL", "CHECK_QUESTION", "WORKED_EXAMPLE", "TRANSITION"].includes(text)) return text as LessonStepBuild["stepType"];
  return null;
}

function normalizeCheckQuestion(value: unknown): StepCheckQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const question = stringInRange(source.question, 10, 500);
  const explanation = stringInRange(source.explanation, 20, 800);
  const choices = Array.isArray(source.choices) ? source.choices.map((choice) => String(choice).trim()).filter(Boolean).slice(0, 4) : [];
  const correctIndex = Number(source.correctIndex);
  if (!question || !explanation || choices.length !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) return null;
  return { question, choices, correctIndex, explanation };
}

function stringInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (text.length < min || text.length > max) return "";
  return text;
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

function isConventionsSkill(lowerSkill: string) {
  return (
    lowerSkill.includes("convention") ||
    lowerSkill.includes("grammar") ||
    lowerSkill.includes("punctuation") ||
    lowerSkill.includes("subject-verb") ||
    lowerSkill.includes("agreement") ||
    lowerSkill.includes("verb tense") ||
    lowerSkill.includes("tense") ||
    lowerSkill.includes("pronoun") ||
    lowerSkill.includes("comma") ||
    lowerSkill.includes("apostrophe") ||
    lowerSkill.includes("possessive") ||
    lowerSkill.includes("capital") ||
    lowerSkill.includes("combining") ||
    lowerSkill.includes("sentence pattern") ||
    lowerSkill.includes("sentence structure")
  );
}

function isLiterarySkill(lowerSkill: string) {
  return (
    lowerSkill.includes("inference") ||
    lowerSkill.includes("evidence") ||
    lowerSkill.includes("theme") ||
    lowerSkill.includes("central message") ||
    lowerSkill.includes("character") ||
    lowerSkill.includes("plot") ||
    lowerSkill.includes("rising action") ||
    lowerSkill.includes("conflict") ||
    lowerSkill.includes("setting") ||
    lowerSkill.includes("point of view") ||
    lowerSkill === "pov" ||
    lowerSkill.includes("figurative") ||
    lowerSkill.includes("simile") ||
    lowerSkill.includes("metaphor") ||
    lowerSkill.includes("personification") ||
    lowerSkill.includes("flashback")
  );
}

function isInformationalSkill(lowerSkill: string) {
  return (
    lowerSkill.includes("main idea") ||
    lowerSkill.includes("central idea") ||
    lowerSkill.includes("evidence") ||
    lowerSkill.includes("cite") ||
    lowerSkill.includes("author's purpose") ||
    lowerSkill.includes("purpose") ||
    lowerSkill.includes("structure") ||
    lowerSkill.includes("cause") ||
    lowerSkill.includes("sequence") ||
    lowerSkill.includes("compare") ||
    lowerSkill.includes("point of view") ||
    lowerSkill.includes("argument") ||
    lowerSkill.includes("evaluate") ||
    lowerSkill.includes("claim") ||
    lowerSkill.includes("summary") ||
    lowerSkill.includes("summarize")
  );
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}
