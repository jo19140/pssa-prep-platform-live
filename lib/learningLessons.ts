import OpenAI from "openai";
import type { LearningPathItemInput } from "@/lib/learningPath";

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
  aiStatus: "NOT_REQUESTED" | "SKIPPED" | "COMPLETED" | "FAILED";
  sourcePayload: Record<string, unknown>;
  items: LessonSectionBuild[];
};

type LessonSectionBuild = {
  itemType: string;
  title: string;
  content: Record<string, unknown>;
  order: number;
};

type PracticeQuestion = {
  question: string;
  choices?: string[];
  correctAnswer: string;
  explanation: string;
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
  const deterministic = pathItems.map((item) => {
    const relatedResponses = responses.filter((response) => response.standardCode === item.standardCode);
    const missedResponses = relatedResponses.filter((response) => !response.isCorrect);
    const resource =
      resourcesByStandard.get(resourceKey(gradeLevel, item.standardCode, item.skill)) ||
      resourcesByStandard.get(resourceKey(gradeLevel, item.standardCode, "")) ||
      resourcesByStandard.get(resourceKey(0, item.standardCode, item.skill)) ||
      resourcesByStandard.get(resourceKey(0, item.standardCode, ""));
    return buildFallbackLesson({ gradeLevel, item, relatedResponses, missedResponses, resource });
  });

  if (!process.env.OPENAI_API_KEY || !deterministic.length) {
    return deterministic.map((lesson) => ({ ...lesson, aiStatus: "SKIPPED" as const }));
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
            schema: {
              lessons: [
                {
                  learningPathItemOrder: "number",
                  lessonExplanation: "string",
                  workedExample: "string",
                  guidedPractice: "array of 2 practice questions with choices, correctAnswer, explanation",
                  independentPractice: "array of 3 practice questions with choices, correctAnswer, explanation",
                  exitTicket: "array of 1 practice question",
                  masteryCheck: "array of 2 practice questions",
                  retestRecommendation: "string",
                },
              ],
            },
            lessons: deterministic,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { lessons?: Partial<LearningLessonBuild>[] };
    const byOrder = new Map((parsed.lessons || []).map((lesson) => [lesson.learningPathItemOrder, lesson]));

    return deterministic.map((lesson) => {
      const aiLesson = byOrder.get(lesson.learningPathItemOrder);
      if (!aiLesson) return { ...lesson, aiStatus: "FAILED" as const };
      const merged = {
        ...lesson,
        lessonExplanation: safeString(aiLesson.lessonExplanation, lesson.lessonExplanation),
        workedExample: safeString(aiLesson.workedExample, lesson.workedExample),
        guidedPractice: safePractice(aiLesson.guidedPractice, lesson.guidedPractice),
        independentPractice: safePractice(aiLesson.independentPractice, lesson.independentPractice),
        exitTicket: safePractice(aiLesson.exitTicket, lesson.exitTicket),
        masteryCheck: safePractice(aiLesson.masteryCheck, lesson.masteryCheck),
        retestRecommendation: safeString(aiLesson.retestRecommendation, lesson.retestRecommendation),
        generatedBy: "AI_ENRICHED" as const,
        aiStatus: "COMPLETED" as const,
      };
      return { ...merged, items: buildLessonSections(merged) };
    });
  } catch (error) {
    console.error("Learning lesson AI generation failed:", error);
    return deterministic.map((lesson) => ({ ...lesson, aiStatus: "FAILED" as const }));
  }
}

export function resourceKey(gradeLevel: number, standardCode: string, skill: string) {
  return `${gradeLevel || 0}:${standardCode}:${skill.toLowerCase()}`;
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
  const guidedPractice = buildPractice(item.skill, "guided", gradeLevel, 2);
  const independentPractice = buildPractice(item.skill, "independent", gradeLevel, 3);
  const exitTicket = buildPractice(item.skill, "exit ticket", gradeLevel, 1);
  const masteryCheck = buildPractice(item.skill, "mastery check", gradeLevel, 2);
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
    },
  };
  return { ...lesson, items: buildLessonSections(lesson) };
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
  if (lower.includes("point of view") || lower === "pov") return `Question: How does the author develop point of view? Worked answer: Look at what the narrator notices and the words used to describe the event. If the narrator calls a task "a chance to prove responsibility," that wording shows the narrator sees the task as important, not annoying.`;
  if (lower.includes("figurative")) return `Question: What does "the problem sat like a stone in her pocket" suggest? Worked answer: The phrase does not mean there is a real stone. It means the problem feels heavy and hard to ignore. The simile creates a serious tone.`;
  if (lower.includes("flashback")) return `Question: Why does the author include the flashback? Worked answer: The earlier scene shows that the character once failed while speaking in front of others. That explains the character's fear in the present and helps develop the conflict.`;
  if (lower.includes("convention") || lower.includes("grammar") || lower.includes("punctuation")) return `Question: Which sentence is written correctly? Worked answer: Read each choice aloud and check subject-verb agreement, commas, capitalization, and pronouns. The correct choice is the one that follows all of those rules.`;
  if (lower.includes("vocab")) return `Question: What does "observe" mean in the passage? Worked answer: If nearby sentences say the students watched carefully and wrote notes, then "observe" means to watch closely.`;
  if (lower.includes("structure")) return `Question: Why does the author use headings? Worked answer: Headings divide the text into topics, which helps readers understand how each section adds to the central idea.`;
  return `Question: What is the main idea of the section? Worked answer: First ask, "What are most sentences about?" Then choose the answer that covers all key details, not just one fact.`;
}

function buildPractice(skill: string, mode: string, gradeLevel: number, count: number): PracticeQuestion[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      question: `${mode === "guided" ? "With help: " : ""}Read a short grade ${gradeLevel} passage section. Which answer best shows ${skill.toLowerCase()}? (${mode} ${number})`,
      choices: [
        "A detail that only appears once",
        `An answer supported by multiple details about ${skill.toLowerCase()}`,
        "A sentence from a different topic",
        "An opinion that is not supported by the text",
      ],
      correctAnswer: `An answer supported by multiple details about ${skill.toLowerCase()}`,
      explanation: `The best answer must match the skill and be supported by details from the text.`,
    };
  });
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 20 ? value : fallback;
}

function safePractice(value: unknown, fallback: PracticeQuestion[]) {
  if (!Array.isArray(value) || !value.length) return fallback;
  return value
    .filter((item) => item && typeof item.question === "string" && typeof item.correctAnswer === "string")
    .map((item) => ({
      question: String(item.question),
      choices: Array.isArray(item.choices) ? item.choices.map(String) : undefined,
      correctAnswer: String(item.correctAnswer),
      explanation: typeof item.explanation === "string" ? item.explanation : "Review the explanation and cite evidence from the text.",
    }));
}
