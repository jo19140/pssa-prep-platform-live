import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { logAiFailure } from "@/lib/aiTelemetry";
import { findHeroResourceForLesson } from "@/lib/learningLessons";
import { critiqueLessonV2, type LessonV2CriticResult } from "@/lib/lessonV2Critic";
import { lessonV2Schema, type LessonV2 } from "@/lib/lessonV2Schema";
import { validateLessonV2 } from "@/lib/lessonV2Validators";
import { plannedTeiTypesForLesson, selectPssaExemplarsForLesson, type PssaLessonExemplars } from "@/lib/pssaExemplarLoader";

export type GenerateLessonV2Input = {
  gradeLevel: number;
  standardCode: string;
  standardLabel: string;
  skill: string;
  commonError?: string;
  whyAssigned?: string;
};

export type GenerateLessonV2Result = {
  lesson: LessonV2;
  critic: LessonV2CriticResult;
  validationIssues: string[];
  iterations: number;
};

export async function generateLessonV2(input: GenerateLessonV2Input): Promise<GenerateLessonV2Result> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const plannedTeiTypes = plannedTeiTypesForLesson(input.standardCode, input.skill);
  const exemplars = selectPssaExemplarsForLesson({
    gradeLevel: input.gradeLevel,
    standardCode: input.standardCode,
    skill: input.skill,
    plannedTeiTypes,
  });

  let revisionNotes: string[] = [];
  let lastLesson: LessonV2 | null = null;
  let lastCritic: LessonV2CriticResult = { status: "REVISE", score: 0, revisions: [] };
  let lastValidationIssues: string[] = [];

  for (let iteration = 1; iteration <= 3; iteration += 1) {
    const draft = await withOpenAiRetry(() => generateDraft(openai, input, exemplars, plannedTeiTypes, revisionNotes));
    const validation = await validateLessonV2(draft, openai);
    const critic = await withOpenAiRetry(() => critiqueLessonV2(openai, draft, validation.issues));
    const heroResource = await findHeroResourceForLesson({ gradeLevel: input.gradeLevel, standardCode: input.standardCode, skill: input.skill });
    if (!heroResource) {
      logAiFailure({
        scope: "lessonGeneratorV2.no_hero_video",
        error: new Error("No confident hero ResourceLink match for V2 lesson."),
        context: { gradeLevel: input.gradeLevel, standardCode: input.standardCode, skill: input.skill },
      });
    }
    const qualityIssues = [
      ...validation.issues,
      ...(critic.revisions || []).map((revision) => `${revision.section}: ${revision.issue} (${revision.suggestion})`),
    ];
    lastLesson = {
      ...draft,
      heroResourceLinkId: heroResource?.id || null,
      qualityScore: Math.max(0, Math.min(100, critic.score - Math.min(10, validation.issues.length * 2))),
      qualityIssues,
      teiTypesUsed: Array.from(new Set(practiceTeiTypes(draft))),
      exemplarsUsed: Array.from(new Set([...draft.exemplarsUsed, ...exemplars.exemplarIds])),
      generatorVersion: "V2",
    };
    lastCritic = critic;
    lastValidationIssues = validation.issues;
    if (validation.valid && critic.status === "PASS" && critic.score >= 85) {
      return { lesson: lastLesson, critic, validationIssues: validation.issues, iterations: iteration };
    }
    revisionNotes = [
      ...validation.issues.map((issue) => `Validation: ${issue}`),
      ...(critic.revisions || []).map((revision) => `${revision.section}: ${revision.issue}. ${revision.suggestion}`),
    ];
  }

  if (!lastLesson) throw new Error("Lesson V2 generation failed before producing a draft.");
  return {
    lesson: {
      ...lastLesson,
      qualityIssues: lastLesson.qualityIssues.length ? lastLesson.qualityIssues : ["Critic requested revision after 3 iterations."],
    },
    critic: lastCritic,
    validationIssues: lastValidationIssues,
    iterations: 3,
  };
}

async function generateDraft(
  openai: OpenAI,
  input: GenerateLessonV2Input,
  exemplars: PssaLessonExemplars,
  plannedTeiTypes: string[],
  revisionNotes: string[],
): Promise<LessonV2> {
  const response = await openai.responses.parse({
    model: process.env.LESSON_V2_MODEL || "gpt-4o",
    temperature: 0.2,
    max_output_tokens: 28000,
    instructions: buildSystemPrompt(input, plannedTeiTypes),
    input: [
      {
        role: "user",
        content: [
          "<example_passages>",
          JSON.stringify(exemplars.passages, null, 2),
          "</example_passages>",
          "<example_mc_items>",
          JSON.stringify(exemplars.mcItems, null, 2),
          "</example_mc_items>",
          "<example_tei_items>",
          JSON.stringify(exemplars.techItems, null, 2),
          "</example_tei_items>",
          exemplars.tdaPrompts.length ? `<example_tda>${JSON.stringify(exemplars.tdaPrompts, null, 2)}</example_tda>` : "",
          revisionNotes.length ? `<revision_notes>${revisionNotes.join("\n")}</revision_notes>` : "",
          "<lesson_request>",
          JSON.stringify({
            gradeLevel: input.gradeLevel,
            standardCode: input.standardCode,
            standardLabel: input.standardLabel,
            skill: input.skill,
            commonError: input.commonError || "Students need more precise analysis and practice with the target standard.",
            whyAssigned: input.whyAssigned || `This mini-lesson targets ${input.skill} because the diagnostic showed a standards-aligned practice gap.`,
            plannedTeiTypes,
            exemplarIds: exemplars.exemplarIds,
          }, null, 2),
          "</lesson_request>",
        ].filter(Boolean).join("\n"),
      },
    ],
    text: { format: zodTextFormat(lessonV2Schema, "lesson_v2") },
  });
  const lesson = lessonV2Schema.parse(response.output_parsed);
  return {
    ...lesson,
    gradeLevel: input.gradeLevel,
    standardCode: input.standardCode,
    standardLabel: input.standardLabel,
    skill: input.skill,
    whyAssigned: input.whyAssigned || lesson.whyAssigned,
    heroResourceLinkId: null,
    generatorVersion: "V2",
  };
}

function buildSystemPrompt(input: GenerateLessonV2Input, plannedTeiTypes: string[]) {
  return [
    "You are building a high-quality PSSA ELA V2 mini-lesson for standards-based mastery and intervention.",
    "Generate original lesson content grounded in the provided released-item and DRC INSIGHT TEI examples. Do not copy passages verbatim except for short quoted evidence inside rationales.",
    "The lesson must match the schema exactly. Use generatorVersion V2. Set heroResourceLinkId to null; the server attaches it after validation.",
    "Teaching section requirements: hook 50-100 words, explanation 320-500 words, workedExample 160-250 words. Include concrete examples, not placeholder announcements. Count conservatively and write enough detail to exceed the minimum.",
    "Practice mix requirements: guidedPractice has 3 items, independentPractice 4, exitTicket 2, masteryCheck 3. Every lesson must use at least 2 distinct non-MC TEI types across practice. Do not count mc as a TEI type. Do not generate all-MC lessons.",
    `Required TEI variety: include at least two of these non-MC item types in the lesson: ${plannedTeiTypes.slice(0, 3).join(", ")}. Use each selected TEI type at least twice across the practice sections.`,
    "Wrong-answer design: Each wrong answer must be a plausible misreading a real student would make, not an obviously absurd option.",
    "Rationales: For each wrong answer, explain why a student might pick it and why it is wrong. For reading items, cite the passage.",
    "Reading passages must be original, grade appropriate, and complete. Any item with a passage field must include a full standalone passage: 170-400 words for grades 3-5 or 275-600 words for grades 6-8. Use short, clear sentences for the grade level. Do not use 2-4 sentence mini-passages in passage fields.",
    "Mapping formats: for drag-drop-table, correctMapping is an array of { item, column } entries. For evidence-mapping, correctMapping is an array of { claim, evidenceItems } entries. Include one mapping entry for every draggable item or claim.",
    "TEI selection guidance:",
    "Conventions (CC.1.4.x.F/G): subject-verb agreement and verb tense -> inline-dropdown; spelling and word choice -> hot-text-word; sentence structure and fragments -> hot-text-sentence; capitalization and punctuation -> inline-dropdown or hot-text-word.",
    "Comprehension (CC.1.2.x, CC.1.3.x): main/central idea -> evidence-mapping or drag-drop-table; theme/character -> MC or two-part-ebsr; author purpose/craft -> MC or hot-text-sentence; compare/contrast -> drag-drop-table; inference/evidence -> two-part-ebsr or evidence-mapping; vocabulary in context -> hot-text-phrase; plot sequencing -> drag-drop-order.",
    "Writing (CC.1.4.x): organization/transitions -> drag-drop-order; style/formality -> hot-text-sentence; supporting evidence -> multi-select or evidence-mapping; TDA prompts remain outside this practice generator.",
    `For this lesson, strongly consider these TEI types: ${plannedTeiTypes.join(", ")}.`,
    `Target: grade ${input.gradeLevel}, ${input.standardCode}, ${input.skill}.`,
  ].join("\n");
}

function practiceTeiTypes(lesson: LessonV2) {
  return ["guidedPractice", "independentPractice", "exitTicket", "masteryCheck"]
    .flatMap((section) => (lesson as any)[section] || [])
    .map((question: any) => question.type)
    .filter((type) => type && type !== "mc");
}

async function withOpenAiRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.code;
      if (status !== 429 && status !== "rate_limit_exceeded") throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000 * (attempt + 1)));
    }
  }
  throw lastError;
}
