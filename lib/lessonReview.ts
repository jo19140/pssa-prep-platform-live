import { Prisma } from "@prisma/client";
import type { LearningLessonBuild, LessonStepBuild, PracticeQuestion } from "@/lib/learningLessons";

export const TEXT_SECTION_TYPES = new Set(["LESSON_EXPLANATION", "WORKED_EXAMPLE", "RETEST_RECOMMENDATION"]);
export const QUESTION_SECTION_TYPES = new Set(["GUIDED_PRACTICE_ITEM", "INDEPENDENT_PRACTICE_ITEM", "EXIT_TICKET_ITEM", "MASTERY_CHECK_ITEM"]);
export const STEP_SECTION_TYPES = new Set(["STEP_TITLE", "STEP_BODY", "STEP_NARRATION", "STEP_CHECK_QUESTION"]);

export type ReviewContent = LearningLessonBuild;

export function normalizeReviewContent(value: unknown): ReviewContent {
  return value as ReviewContent;
}

export function lessonToReviewContent(lesson: any): ReviewContent {
  return {
    learningPathItemOrder: lesson.learningPathItem?.order || lesson.priority,
    gradeLevel: lesson.gradeLevel,
    standardCode: lesson.standardCode,
    standardLabel: lesson.standardLabel,
    skill: lesson.skill,
    priority: lesson.priority,
    title: lesson.title,
    whyAssigned: lesson.whyAssigned,
    lessonExplanation: lesson.lessonExplanation,
    workedExample: lesson.workedExample,
    resourceTitle: lesson.resourceTitle,
    resourceUrl: lesson.resourceUrl,
    resourceProvider: lesson.resourceProvider,
    resourceDescription: lesson.resourceDescription,
    heroResourceLinkId: lesson.heroResourceLinkId || null,
    heroResource: lesson.heroResourceLink
      ? {
          title: lesson.heroResourceLink.title,
          url: lesson.heroResourceLink.url,
          provider: lesson.heroResourceLink.provider,
          description: lesson.heroResourceLink.description,
        }
      : null,
    steps: (lesson.steps || []).map((step: any) => ({
      id: step.id,
      order: step.order,
      stepType: step.stepType as LessonStepBuild["stepType"],
      title: step.title,
      bodyText: step.bodyText,
      narrationScript: step.narrationScript,
      audioUrl: step.audioUrl,
      imageUrl: step.imageUrl,
      imagePrompt: step.imagePrompt,
      checkQuestion: step.checkQuestion,
    })),
    guidedPractice: lesson.guidedPractice || [],
    independentPractice: lesson.independentPractice || [],
    exitTicket: lesson.exitTicket || [],
    masteryCheck: lesson.masteryCheck || [],
    retestRecommendation: lesson.retestRecommendation,
    generatedBy: lesson.generatedBy,
    aiStatus: lesson.aiStatus,
    sourcePayload: lesson.sourcePayload || {},
    items: lesson.items || [],
  };
}

export function getSection(content: ReviewContent, sectionType: string, sectionIndex?: number | null) {
  if (sectionType === "LESSON_EXPLANATION") return content.lessonExplanation;
  if (sectionType === "WORKED_EXAMPLE") return content.workedExample;
  if (sectionType === "RETEST_RECOMMENDATION") return content.retestRecommendation;
  if (sectionType === "GUIDED_PRACTICE_ITEM") return content.guidedPractice[sectionIndex ?? -1];
  if (sectionType === "INDEPENDENT_PRACTICE_ITEM") return content.independentPractice[sectionIndex ?? -1];
  if (sectionType === "EXIT_TICKET_ITEM") return content.exitTicket[sectionIndex ?? -1];
  if (sectionType === "MASTERY_CHECK_ITEM") return content.masteryCheck[sectionIndex ?? -1];
  if (STEP_SECTION_TYPES.has(sectionType)) return getStepSection(content, sectionType, sectionIndex);
  return undefined;
}

export function updateSection(content: ReviewContent, sectionType: string, sectionIndex: number | null | undefined, newContent: unknown): ReviewContent {
  const next = structuredClone(content);
  if (sectionType === "LESSON_EXPLANATION") next.lessonExplanation = validateTextContent(newContent);
  else if (sectionType === "WORKED_EXAMPLE") next.workedExample = validateTextContent(newContent);
  else if (sectionType === "RETEST_RECOMMENDATION") next.retestRecommendation = validateTextContent(newContent);
  else if (sectionType === "GUIDED_PRACTICE_ITEM") next.guidedPractice = updateQuestionArray(next.guidedPractice, sectionIndex, newContent);
  else if (sectionType === "INDEPENDENT_PRACTICE_ITEM") next.independentPractice = updateQuestionArray(next.independentPractice, sectionIndex, newContent);
  else if (sectionType === "EXIT_TICKET_ITEM") next.exitTicket = updateQuestionArray(next.exitTicket, sectionIndex, newContent);
  else if (sectionType === "MASTERY_CHECK_ITEM") next.masteryCheck = updateQuestionArray(next.masteryCheck, sectionIndex, newContent);
  else if (STEP_SECTION_TYPES.has(sectionType)) next.steps = updateStepArray(next.steps || [], sectionType, sectionIndex, newContent);
  else if (sectionType === "NEW_PRACTICE_QUESTION") {
    const payload = newContent as { practiceSection?: string; question?: unknown };
    const question = validatePracticeQuestion(payload.question);
    if (payload.practiceSection === "GUIDED") next.guidedPractice.push(question);
    else if (payload.practiceSection === "INDEPENDENT") next.independentPractice.push(question);
    else if (payload.practiceSection === "EXIT_TICKET") next.exitTicket.push(question);
    else if (payload.practiceSection === "MASTERY_CHECK") next.masteryCheck.push(question);
    else throw new Error("Invalid practice section.");
  } else {
    throw new Error("Unsupported section type.");
  }
  next.items = buildLessonSections(next);
  return next;
}

export function learningLessonUpdateDataFromContent(content: ReviewContent) {
  return {
    title: content.title,
    whyAssigned: content.whyAssigned,
    lessonExplanation: content.lessonExplanation,
    workedExample: content.workedExample,
    resourceTitle: content.resourceTitle,
    resourceUrl: content.resourceUrl,
    resourceProvider: content.resourceProvider,
    resourceDescription: content.resourceDescription,
    heroResourceLink: content.heroResourceLinkId ? { connect: { id: content.heroResourceLinkId } } : { disconnect: true },
    guidedPractice: content.guidedPractice as unknown as Prisma.InputJsonValue,
    independentPractice: content.independentPractice as unknown as Prisma.InputJsonValue,
    exitTicket: content.exitTicket as unknown as Prisma.InputJsonValue,
    masteryCheck: content.masteryCheck as unknown as Prisma.InputJsonValue,
    retestRecommendation: content.retestRecommendation,
    generatedBy: content.generatedBy,
    aiStatus: content.aiStatus,
    sourcePayload: content.sourcePayload as Prisma.InputJsonValue,
    steps: {
      deleteMany: {},
      create: (content.steps || []).map((step) => ({
        order: step.order,
        stepType: step.stepType,
        title: step.title,
        bodyText: step.bodyText,
        narrationScript: step.narrationScript,
        audioUrl: step.audioUrl || null,
        imageUrl: step.imageUrl || null,
        imagePrompt: step.imagePrompt || null,
        checkQuestion: step.checkQuestion ? (step.checkQuestion as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      })),
    },
    items: {
      deleteMany: {},
      create: buildLessonSections(content).map((item) => ({
        itemType: item.itemType,
        title: item.title,
        content: item.content as Prisma.InputJsonValue,
        order: item.order,
      })),
    },
  };
}

export function validateSectionContent(sectionType: string, newContent: unknown) {
  if (TEXT_SECTION_TYPES.has(sectionType)) return validateTextContent(newContent);
  if (QUESTION_SECTION_TYPES.has(sectionType)) return validatePracticeQuestion(newContent);
  if (STEP_SECTION_TYPES.has(sectionType)) return validateStepSection(sectionType, newContent);
  throw new Error("Unsupported section type.");
}

export function validateTextContent(value: unknown) {
  if (typeof value !== "string" || value.trim().length < 10 || value.length > 6000) throw new Error("Text section must be 10-6000 characters.");
  return value.trim();
}

export function validatePracticeQuestion(value: unknown): PracticeQuestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Practice question must be an object.");
  const source = value as Record<string, unknown>;
  const question = stringField(source.question, "question", 10, 2000);
  const correctAnswer = stringField(source.correctAnswer, "correctAnswer", 1, 500);
  const explanation = stringField(source.explanation, "explanation", 20, 2000);
  const choices = Array.isArray(source.choices) ? source.choices.map((choice) => String(choice).trim()).filter(Boolean).slice(0, 6) : [];
  if (choices.length < 2) throw new Error("Practice question choices must include at least 2 options.");
  if (!choices.some((choice) => normalize(choice) === normalize(correctAnswer))) throw new Error("correctAnswer must match one of the choices.");
  return {
    question,
    choices,
    correctAnswer,
    explanation,
    passage: typeof source.passage === "string" ? source.passage.trim() : undefined,
    coachHint: typeof source.coachHint === "string" ? source.coachHint.trim() : undefined,
  };
}

export function validateStepSection(sectionType: string, value: unknown) {
  if (sectionType === "STEP_TITLE") return stringField(value, "title", 5, 100);
  if (sectionType === "STEP_BODY") return stringField(value, "bodyText", 50, 500);
  if (sectionType === "STEP_NARRATION") return stringField(value, "narrationScript", 30, 300);
  if (sectionType === "STEP_CHECK_QUESTION") return validateStepCheckQuestion(value);
  throw new Error("Unsupported step section.");
}

export function practiceSectionToSectionType(practiceSection: string) {
  if (practiceSection === "GUIDED") return "GUIDED_PRACTICE_ITEM";
  if (practiceSection === "INDEPENDENT") return "INDEPENDENT_PRACTICE_ITEM";
  if (practiceSection === "EXIT_TICKET") return "EXIT_TICKET_ITEM";
  if (practiceSection === "MASTERY_CHECK") return "MASTERY_CHECK_ITEM";
  throw new Error("Invalid practice section.");
}

function updateQuestionArray(items: PracticeQuestion[], sectionIndex: number | null | undefined, value: unknown) {
  const question = validatePracticeQuestion(value);
  const next = [...items];
  if (sectionIndex == null) next.push(question);
  else {
    if (sectionIndex < 0 || sectionIndex >= next.length) throw new Error("Invalid section index.");
    next[sectionIndex] = question;
  }
  return next;
}

function getStepSection(content: ReviewContent, sectionType: string, sectionIndex?: number | null) {
  const step = content.steps?.[sectionIndex ?? -1];
  if (!step) return undefined;
  if (sectionType === "STEP_TITLE") return step.title;
  if (sectionType === "STEP_BODY") return step.bodyText;
  if (sectionType === "STEP_NARRATION") return step.narrationScript;
  if (sectionType === "STEP_CHECK_QUESTION") return step.checkQuestion;
  return undefined;
}

function updateStepArray(items: LessonStepBuild[], sectionType: string, sectionIndex: number | null | undefined, value: unknown) {
  const index = sectionIndex ?? -1;
  if (index < 0 || index >= items.length) throw new Error("Invalid step index.");
  const next = [...items];
  const step = { ...next[index] };
  if (sectionType === "STEP_TITLE") step.title = validateStepSection(sectionType, value) as string;
  else if (sectionType === "STEP_BODY") step.bodyText = validateStepSection(sectionType, value) as string;
  else if (sectionType === "STEP_NARRATION") step.narrationScript = validateStepSection(sectionType, value) as string;
  else if (sectionType === "STEP_CHECK_QUESTION") step.checkQuestion = validateStepSection(sectionType, value) as LessonStepBuild["checkQuestion"];
  else throw new Error("Unsupported step section.");
  next[index] = step;
  return next;
}

function validateStepCheckQuestion(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Check question must be an object.");
  const source = value as Record<string, unknown>;
  const question = stringField(source.question, "question", 10, 500);
  const explanation = stringField(source.explanation, "explanation", 20, 800);
  const choices = Array.isArray(source.choices) ? source.choices.map((choice) => String(choice).trim()).filter(Boolean).slice(0, 4) : [];
  const correctIndex = Number(source.correctIndex);
  if (choices.length !== 4) throw new Error("Check question must include exactly 4 choices.");
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) throw new Error("correctIndex must point to a valid choice.");
  return { question, choices, correctIndex, explanation };
}

function buildLessonSections(lesson: Omit<LearningLessonBuild, "items">) {
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

function stringField(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== "string") throw new Error(`${name} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new Error(`${name} must be ${min}-${max} characters.`);
  return trimmed;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
