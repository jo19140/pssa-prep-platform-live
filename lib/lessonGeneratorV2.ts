import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { logAiFailure } from "@/lib/aiTelemetry";
import { db } from "@/lib/db";
import { findHeroResourceForLesson } from "@/lib/learningLessons";
import { critiqueLessonV2, type LessonV2CriticResult } from "@/lib/lessonV2Critic";
import { allPracticeQuestions, lessonV2Schema, lessonV2StructuredOutputSchema, practiceSections, type LessonV2, type PracticeQuestionV2 } from "@/lib/lessonV2Schema";
import { validateLessonV2, wordCount } from "@/lib/lessonV2Validators";
import { plannedTeiTypesForLesson, selectPssaExemplarsForLesson, type PssaLessonExemplars } from "@/lib/pssaExemplarLoader";

const PROMPT_TOKEN_BUDGET = 90_000;
const LESSON_V2_MAX_OUTPUT_TOKENS = 8_000;

export type GenerateLessonV2Input = {
  gradeLevel: number;
  standardCode: string;
  standardLabel: string;
  skill: string;
  commonError?: string;
  whyAssigned?: string;
  excludeLessonId?: string;
};

export type GenerateLessonV2Result = {
  lesson: LessonV2;
  critic: LessonV2CriticResult;
  validationIssues: string[];
  iterations: number;
};

type PromptBudgetBreakdown = {
  exemplarTokens: number;
  schemaTokens: number;
  instructionsTokens: number;
  criticHistoryTokens: number;
  requestTokens: number;
  totalPromptTokens: number;
  leanMode: boolean;
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

  for (let iteration = 1; iteration <= 5; iteration += 1) {
    const rawDraft = iteration >= 3 && lastLesson
      ? await withOpenAiRetry(() => regenerateTargetedDraft(openai, input, lastLesson!, revisionNotes))
      : await withOpenAiRetry(() => generateDraft(openai, input, exemplars, plannedTeiTypes, revisionNotes));
    const draft = repairLessonV2(rawDraft, input, plannedTeiTypes);
    const validation = await validateLessonV2(draft, openai, { excludeLessonId: input.excludeLessonId });
    const critic = await withOpenAiRetry(() => critiqueLessonV2(openai, draft, validation.issues));
    const heroResource = await findHeroResourceForLesson({ gradeLevel: input.gradeLevel, standardCode: input.standardCode, skill: input.skill });
    if (!heroResource) {
      const candidateCount = await db.resourceLink.count({ where: { standardCode: input.standardCode } });
      logAiFailure({
        scope: candidateCount > 0 ? "lessonGeneratorV2.no_hero_video" : "lessonGeneratorV2.no_hero_video_coverage",
        error: new Error(candidateCount > 0 ? "No confident hero ResourceLink match for V2 lesson." : "No ResourceLink coverage for V2 lesson standard."),
        context: { gradeLevel: input.gradeLevel, standardCode: input.standardCode, skill: input.skill },
      });
    }
    const qualityIssues = [
      ...validation.issues,
      ...(critic.revisions || [])
        .filter(isStructuralRevision)
        .map((revision) => `${revision.section}: ${revision.issue} (${revision.suggestion})`),
    ];
    lastLesson = {
      ...draft,
      heroResourceLinkId: heroResource?.id || null,
      resourceTitle: heroResource?.title || null,
      resourceUrl: heroResource?.url || null,
      resourceProvider: heroResource?.provider || null,
      resourceDescription: heroResource?.description || null,
      qualityScore: calculateQualityScore(critic, validation.issues),
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
  const hardIssues = lastValidationIssues.filter(isHardValidationIssue);
  if (hardIssues.length) {
    throw new Error(`Lesson V2 generation failed strict validation after 5 iterations: ${hardIssues.slice(0, 5).join("; ")}`);
  }
  return {
    lesson: {
      ...lastLesson,
      qualityIssues: lastLesson.qualityIssues.length ? lastLesson.qualityIssues : ["Critic requested revision after 3 iterations."],
    },
    critic: lastCritic,
    validationIssues: lastValidationIssues,
    iterations: 5,
  };
}

async function generateDraft(
  openai: OpenAI,
  input: GenerateLessonV2Input,
  exemplars: PssaLessonExemplars,
  plannedTeiTypes: string[],
  revisionNotes: string[],
): Promise<LessonV2> {
  const textFormat = zodTextFormat(lessonV2StructuredOutputSchema, "lesson_v2");
  let prompt = buildDraftPrompt(input, exemplars, plannedTeiTypes, revisionNotes, false, textFormat);
  if (prompt.breakdown.totalPromptTokens > PROMPT_TOKEN_BUDGET) {
    console.warn(`[lessonV2] prompt budget ${prompt.breakdown.totalPromptTokens} tokens exceeds ${PROMPT_TOKEN_BUDGET}; switching to lean prompt for ${input.gradeLevel} ${input.standardCode} ${input.skill}`);
    prompt = buildDraftPrompt(input, exemplars, plannedTeiTypes, revisionNotes, true, textFormat);
  }
  logPromptBudget("initial", input, prompt.breakdown);
  const response = await openai.responses.parse({
    model: process.env.LESSON_V2_MODEL || "gpt-4o",
    temperature: 0.2,
    max_output_tokens: LESSON_V2_MAX_OUTPUT_TOKENS,
    instructions: prompt.instructions,
    input: [
      {
        role: "user",
        content: prompt.content,
      },
    ],
    text: { format: textFormat },
  });
  const lesson = lessonV2StructuredOutputSchema.parse(response.output_parsed);
  return {
    ...lesson,
    gradeLevel: input.gradeLevel,
    standardCode: input.standardCode,
    standardLabel: input.standardLabel,
    skill: input.skill,
    whyAssigned: input.whyAssigned || lesson.whyAssigned,
    heroResourceLinkId: null,
    resourceTitle: null,
    resourceUrl: null,
    resourceProvider: null,
    resourceDescription: null,
    generatorVersion: "V2",
  };
}

async function regenerateTargetedDraft(
  openai: OpenAI,
  input: GenerateLessonV2Input,
  currentLesson: LessonV2,
  revisionNotes: string[],
): Promise<LessonV2> {
  const textFormat = zodTextFormat(lessonV2StructuredOutputSchema, "lesson_v2");
  const prompt = buildTargetedRevisionPrompt(input, currentLesson, revisionNotes, textFormat);
  logPromptBudget("targeted", input, prompt.breakdown);
  const response = await openai.responses.parse({
    model: process.env.LESSON_V2_MODEL || "gpt-4o",
    temperature: 0.1,
    max_output_tokens: LESSON_V2_MAX_OUTPUT_TOKENS,
    instructions: prompt.instructions,
    input: [
      {
        role: "user",
        content: prompt.content,
      },
    ],
    text: { format: textFormat },
  });
  return lessonV2StructuredOutputSchema.parse(response.output_parsed);
}

export function buildLessonV2PromptBudget(input: GenerateLessonV2Input) {
  const plannedTeiTypes = plannedTeiTypesForLesson(input.standardCode, input.skill);
  const exemplars = selectPssaExemplarsForLesson({
    gradeLevel: input.gradeLevel,
    standardCode: input.standardCode,
    skill: input.skill,
    plannedTeiTypes,
  });
  const textFormat = zodTextFormat(lessonV2StructuredOutputSchema, "lesson_v2");
  const normal = buildDraftPrompt(input, exemplars, plannedTeiTypes, [], false, textFormat).breakdown;
  const lean = buildDraftPrompt(input, exemplars, plannedTeiTypes, [], true, textFormat).breakdown;
  return {
    plannedTeiTypes,
    normal,
    lean,
    effective: normal.totalPromptTokens > PROMPT_TOKEN_BUDGET ? lean : normal,
  };
}

function buildDraftPrompt(
  input: GenerateLessonV2Input,
  exemplars: PssaLessonExemplars,
  plannedTeiTypes: string[],
  revisionNotes: string[],
  leanMode: boolean,
  textFormat: unknown,
) {
  const selectedExemplars = leanMode ? leanExemplars(input, exemplars) : exemplars;
  const instructions = buildSystemPrompt(input, plannedTeiTypes, leanMode);
  const exemplarPassages = [
    "<example_passages>",
    JSON.stringify(selectedExemplars.passages, null, 2),
    "</example_passages>",
  ].join("\n");
  const exemplarMcItems = [
    "<example_mc_items>",
    JSON.stringify(selectedExemplars.mcItems, null, 2),
    "</example_mc_items>",
  ].join("\n");
  const exemplarTeiItems = [
    "<example_tei_items>",
    JSON.stringify(selectedExemplars.techItems, null, 2),
    "</example_tei_items>",
  ].join("\n");
  const shapeExamples = [
    "<tei_shape_examples>",
    JSON.stringify(teiShapeExamples(), null, 2),
    "</tei_shape_examples>",
  ].join("\n");
  const exemplarTda = selectedExemplars.tdaPrompts.length ? `<example_tda>${JSON.stringify(selectedExemplars.tdaPrompts, null, 2)}</example_tda>` : "";
  const revisionHistory = revisionNotes.length ? `<revision_notes>${revisionNotes.slice(0, 8).join("\n")}</revision_notes>` : "";
  const request = [
    "<lesson_request>",
    JSON.stringify({
      gradeLevel: input.gradeLevel,
      standardCode: input.standardCode,
      standardLabel: input.standardLabel,
      skill: input.skill,
      commonError: input.commonError || "Students need more precise analysis and practice with the target standard.",
      whyAssigned: input.whyAssigned || `This mini-lesson targets ${input.skill} because the diagnostic showed a standards-aligned practice gap.`,
      plannedTeiTypes,
      exemplarIds: selectedExemplars.exemplarIds,
      leanPromptMode: leanMode,
    }, null, 2),
    "</lesson_request>",
  ].join("\n");
  const content = [
    exemplarPassages,
    exemplarMcItems,
    exemplarTeiItems,
    shapeExamples,
    exemplarTda,
    revisionHistory,
    request,
  ].filter(Boolean).join("\n");
  return {
    instructions,
    content,
    breakdown: promptBudgetBreakdown({
      instructions,
      exemplarSections: [exemplarPassages, exemplarMcItems, exemplarTeiItems, shapeExamples, exemplarTda],
      schema: JSON.stringify(textFormat),
      revisionHistory,
      request,
      total: `${instructions}\n${content}\n${JSON.stringify(textFormat)}`,
      leanMode,
    }),
  };
}

function buildTargetedRevisionPrompt(
  input: GenerateLessonV2Input,
  currentLesson: LessonV2,
  revisionNotes: string[],
  textFormat: unknown,
) {
  const instructions = [
    "You are revising a PSSA ELA V2 lesson. Return the full lesson JSON in the same schema.",
    "Preserve sections that are not mentioned in the revision notes. Regenerate only the flawed sections or practice items.",
    "Use only the most recent draft and the structured revision notes below; do not infer or recreate any earlier critic history.",
    "Pay special attention to exact structural fixes: inline-dropdown sentences must include [BLANK]; hot-text-word sentences must include [ word / word ]; passage-dependent TEIs must include a full passage; evidence-mapping must map every claim to at least one evidence item.",
    "inline-dropdown sentences must contain exactly one [BLANK] at the blank location and must not contain empty [ ] placeholders.",
    "hot-text-word is only for exactly two choices in each bracket. If a blank needs 3 or more options, change that item to inline-dropdown. Each hot-text-word bracket must contain exactly two options separated by a single /, and bracketPairs.length must equal the number of brackets in the sentence.",
    "If the notes mention TEI variety, replace one current item with a different appropriate TEI type.",
    "If the notes mention passage word count or FK grade, rewrite that passage on a different topic/scenario with simpler, natural sentences.",
  ].join("\n");
  const revisionHistory = JSON.stringify(revisionNotes.slice(0, 8));
  const request = JSON.stringify({
    lessonRequest: input,
    revisionNotes: revisionNotes.slice(0, 8),
    currentLesson,
  });
  return {
    instructions,
    content: request,
    breakdown: promptBudgetBreakdown({
      instructions,
      exemplarSections: [],
      schema: JSON.stringify(textFormat),
      revisionHistory,
      request,
      total: `${instructions}\n${request}\n${JSON.stringify(textFormat)}`,
      leanMode: false,
    }),
  };
}

function buildSystemPrompt(input: GenerateLessonV2Input, plannedTeiTypes: string[], leanMode = false) {
  return [
    "You are building a high-quality PSSA ELA V2 mini-lesson for standards-based mastery and intervention.",
    leanMode ? "LEAN PROMPT MODE: use the smaller exemplar set provided here and keep each generated passage near the lower end of the required word range." : "",
    "Generate original lesson content grounded in the provided released-item and DRC INSIGHT TEI examples. Do not copy passages verbatim except for short quoted evidence inside rationales.",
    "The lesson must match the schema exactly. Use generatorVersion V2. Set heroResourceLinkId, resourceTitle, resourceUrl, resourceProvider, and resourceDescription to null; the server attaches hero video fields after validation.",
    "Teaching section requirements: hook 50-100 words, explanation 320-500 words, workedExample 160-250 words. Include concrete examples, not placeholder announcements. Count conservatively and write enough detail to exceed the minimum.",
    "Practice mix requirements: guidedPractice has 3 items, independentPractice 4, exitTicket 2, masteryCheck 3. Every lesson must use at least 2 distinct non-MC TEI types across practice. Do not count mc as a TEI type. Do not generate all-MC lessons.",
    `Required TEI variety: include at least two of these non-MC item types in the lesson: ${plannedTeiTypes.slice(0, 3).join(", ")}. Use each selected TEI type at least twice across the practice sections.`,
    "Wrong-answer design: Each wrong answer must be a plausible misreading a real student would make, not an obviously absurd option.",
    "Rationales: For each wrong answer, explain why a student might pick it and why it is wrong. For reading items, cite the passage.",
    "Passage budget: include full passage text on only 2-3 practice questions total. For all other practice questions, set passage to null and make the item test the same skill without another full passage. Passage-dependent TEI types (hot-text-phrase, evidence-mapping, two-part-ebsr) must include a passage.",
    "CRITICAL: Practice passages must read like authentic encyclopedic, narrative, or expository prose. NEVER include meta-pedagogical phrases like 'this passage gives another clear detail,' 'students can use this detail,' 'compare choices,' 'explain why one choice is stronger,' or any other rubric/critic language. Passages are for students to read, not for teachers. If you find yourself writing about the lesson, stop and write only about the topic itself.",
    "Reading passages must be original, grade appropriate, and complete. Any item with a passage field must include a full standalone passage: 170-240 words for grades 3-5 or 275-360 words for grades 6-8. Use short, clear sentences for the grade level. Keep passages near the lower end of the range so the JSON response remains complete. Do not use 2-4 sentence mini-passages in passage fields. Never repeat the same sentence or near-identical sentence to meet word count; write genuinely new content instead.",
    "Mapping formats: for drag-drop-table, correctMapping is an array of { item, column } entries. For evidence-mapping, correctMapping is an array of { claim, evidenceItems } entries. Include one mapping entry for every draggable item or claim.",
    "TEI shape rule: inline-dropdown sentences must contain exactly one [BLANK] at the blank location and no empty [ ] placeholders. hot-text-word is ONLY for a bracket with exactly 2 choices, formatted like [ walks / walk ]. Each bracket must contain exactly two options separated by a single forward slash, and bracketPairs must have one entry per bracket. For blanks with 3 or more choices, use inline-dropdown instead. 3+ options -> inline-dropdown always.",
    "Hot-text-phrase integrity: every selectablePhrases entry must appear in the passage text after normal punctuation is removed. Do not invent labels, summaries, or paraphrases as selectable phrases. Use exact short phrases copied from the passage.",
    "TEI selection guidance:",
    "Conventions (CC.1.4.x.F/G): subject-verb agreement and verb tense -> inline-dropdown when choosing among 3+ verb forms, hot-text-word only for a 2-choice pair; spelling and word choice -> hot-text-word only for 2-choice pairs, inline-dropdown for 3+ options; sentence structure and fragments -> hot-text-sentence; capitalization and punctuation -> inline-dropdown or 2-choice hot-text-word.",
    "Comprehension (CC.1.2.x, CC.1.3.x): main/central idea -> evidence-mapping or drag-drop-table; theme/character -> MC or two-part-ebsr; author purpose/craft -> MC or hot-text-sentence; compare/contrast -> drag-drop-table; inference/evidence -> two-part-ebsr or evidence-mapping; vocabulary in context -> hot-text-phrase; plot sequencing -> drag-drop-order.",
    "Writing (CC.1.4.x): organization/transitions -> drag-drop-order; style/formality -> hot-text-sentence; supporting evidence -> multi-select or evidence-mapping; TDA prompts remain outside this practice generator.",
    `For this lesson, strongly consider these TEI types: ${plannedTeiTypes.join(", ")}.`,
    `Target: grade ${input.gradeLevel}, ${input.standardCode}, ${input.skill}.`,
  ].filter(Boolean).join("\n");
}

function leanExemplars(input: GenerateLessonV2Input, exemplars: PssaLessonExemplars): PssaLessonExemplars {
  const tdaPrompts = isTdaLesson(input) ? exemplars.tdaPrompts.slice(0, 1) : [];
  return {
    ...exemplars,
    passages: exemplars.passages.slice(0, 1),
    mcItems: exemplars.mcItems.slice(0, 2),
    tdaPrompts,
    techItems: exemplars.techItems.slice(0, 2),
    exemplarIds: [
      ...exemplars.passages.slice(0, 1).map((passage) => passage.id),
      ...exemplars.mcItems.slice(0, 2).map((item) => item.id),
      ...tdaPrompts.map((prompt) => prompt.id),
      ...exemplars.techItems.slice(0, 2).map((item) => item.id),
    ],
  };
}

function isTdaLesson(input: GenerateLessonV2Input) {
  return input.standardCode.startsWith("CC.1.4.") && /tda|text[-\s]?dependent/i.test(`${input.standardLabel} ${input.skill}`);
}

function promptBudgetBreakdown({
  instructions,
  exemplarSections,
  schema,
  revisionHistory,
  request,
  total,
  leanMode,
}: {
  instructions: string;
  exemplarSections: string[];
  schema: string;
  revisionHistory: string;
  request: string;
  total: string;
  leanMode: boolean;
}): PromptBudgetBreakdown {
  return {
    exemplarTokens: estimateTokens(exemplarSections.join("\n")),
    schemaTokens: estimateTokens(schema),
    instructionsTokens: estimateTokens(instructions),
    criticHistoryTokens: estimateTokens(revisionHistory),
    requestTokens: estimateTokens(request),
    totalPromptTokens: estimateTokens(total),
    leanMode,
  };
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

function logPromptBudget(stage: string, input: GenerateLessonV2Input, breakdown: PromptBudgetBreakdown) {
  if (process.env.LESSON_V2_TOKEN_DEBUG !== "1") return;
  console.log(`[lessonV2:${stage}:tokens] ${input.gradeLevel} ${input.standardCode} ${input.skill} ${JSON.stringify(breakdown)}`);
}

function teiShapeExamples() {
  return {
    hotTextWordTwoOptionOnly: {
      type: "hot-text-word",
      question: "Choose the verb that agrees with the subject.",
      passage: null,
      sentence: "The students [ walk / walks ] to the library after lunch.",
      bracketPairs: [{ options: ["walk", "walks"], correct: "walk" }],
      rightAnswerRationale: "Students is plural, so the verb should be walk.",
      coachHint: "Use hot-text-word only when each bracket has exactly two choices.",
    },
    inlineDropdownForThreeOrMoreOptions: {
      type: "inline-dropdown",
      question: "Choose the verb tense that best completes the sentence.",
      passage: null,
      sentence: "Yesterday, Maya [BLANK] her paragraph before turning it in.",
      dropdownOptions: ["revised", "revises", "will revise"],
      correctOption: "revised",
      distractorRationale: [
        { option: "revises", whyWrong: "Revises is present tense, but yesterday signals past tense." },
        { option: "will revise", whyWrong: "Will revise is future tense, but the sentence describes yesterday." },
      ],
      rightAnswerRationale: "Yesterday signals past tense, so revised is correct.",
      coachHint: "Use inline-dropdown for blanks with three or more choices.",
    },
  };
}

function practiceTeiTypes(lesson: LessonV2) {
  return ["guidedPractice", "independentPractice", "exitTicket", "masteryCheck"]
    .flatMap((section) => (lesson as any)[section] || [])
    .map((question: any) => question.type)
    .filter((type) => type && type !== "mc");
}

function repairLessonV2(lesson: LessonV2, input: GenerateLessonV2Input, plannedTeiTypes: string[]): LessonV2 {
  const repaired: LessonV2 = JSON.parse(JSON.stringify(lesson));
  repaired.hook = ensureWords(repaired.hook, 50, `For example, a student can use this skill while reading a test passage and checking which details truly answer the question about ${input.skill}.`);
  repaired.explanation = ensureWords(repaired.explanation, 290, `For example, students should name the exact clue, connect it to the question, and explain why it proves the answer. A common mistake is choosing a detail that sounds related but does not actually prove the idea. Strong work uses the standard's language and shows the reasoning step by step.`);
  repaired.workedExample = ensureWords(repaired.workedExample, 150, `This matters because the correct answer is not just a matching word or phrase. It is the choice that fits the whole question and can be defended with a specific detail. The reasoning should explain both what the evidence says and how it supports the answer.`);

  const seenTei = new Set<string>();
  for (const section of practiceSections) {
    repaired[section] = repaired[section].map((question) => repairQuestion(question));
    for (const question of repaired[section]) if (question.type !== "mc") seenTei.add(question.type);
  }
  if (seenTei.size < 2) {
    const replacementType = plannedTeiTypes.find((type) => !seenTei.has(type) && type !== "mc") || "inline-dropdown";
    repaired.exitTicket[0] = buildReplacementTei(replacementType, input);
  }
  repaired.teiTypesUsed = Array.from(new Set(practiceTeiTypes(repaired)));
  return repaired;
}

function repairQuestion(question: PracticeQuestionV2): PracticeQuestionV2 {
  const repaired: any = { ...question };
  if (typeof repaired.passage === "string") repaired.passage = fitPassageToSchema(cleanPassageText(repaired.passage));
  if (repaired.type === "mc") {
    const wrongChoices = repaired.choices.filter((choice: string) => choice !== repaired.correctAnswer);
    repaired.distractorRationale = wrongChoices.map((choice: string) => {
      const existing = repaired.distractorRationale?.find((entry: any) => entry.choice === choice);
      return existing?.whyWrong ? existing : { choice, whyWrong: `A student might choose this because it sounds related, but it does not fully answer the question or match the strongest evidence.` };
    });
  }
  if (repaired.type === "inline-dropdown" && !repaired.sentence.includes("[BLANK]")) {
    repaired.sentence = repaired.sentence.includes(repaired.correctOption)
      ? repaired.sentence.replace(repaired.correctOption, "[BLANK]")
      : `${repaired.sentence.replace(/[.?!]?$/, "")} [BLANK].`;
  }
  if (repaired.type === "inline-dropdown") {
    repaired.sentence = normalizeInlineDropdownSentence(repaired.sentence, repaired.correctOption);
  }
  if (repaired.type === "hot-text-word" && !/\[\s*[^/\]]+\s*\/\s*[^\]]+\]/.test(repaired.sentence)) {
    const pair = repaired.bracketPairs?.[0]?.options || ["is", "are"];
    repaired.sentence = `${repaired.sentence.replace(/[.?!]?$/, "")} [ ${pair[0]} / ${pair[1]} ].`;
  }
  if (repaired.type === "hot-text-sentence" && !/\(\s*1\s*\)/.test(repaired.paragraph)) {
    repaired.paragraph = `(1) ${repaired.paragraph} (2) A later sentence adds a concrete example connected to the same idea. (3) The final sentence shows how the idea changes the topic or character.`;
    repaired.sentenceCount = Math.max(3, repaired.sentenceCount || 3);
    repaired.correctSentenceNumber = Math.min(repaired.correctSentenceNumber || 1, repaired.sentenceCount);
  }
  if (repaired.type === "evidence-mapping") {
    repaired.passage = fitPassageToSchema(cleanPassageText(repaired.passage || ""));
    repaired.correctMapping = repaired.claims.map((claim: string) => {
      const existing = repaired.correctMapping?.find((entry: any) => entry.claim === claim);
      return existing?.evidenceItems?.length ? existing : { claim, evidenceItems: [repaired.evidenceItems[0]] };
    });
  }
  if (repaired.type === "hot-text-phrase" || repaired.type === "two-part-ebsr") {
    repaired.passage = fitPassageToSchema(cleanPassageText(repaired.passage || ""));
  }
  if (repaired.type === "hot-text-phrase") {
    repairHotTextPhrase(repaired);
  }
  return repaired;
}

function ensureWords(text: string, minWords: number, addition: string) {
  let result = text || "";
  while (wordCount(result) < minWords) result = `${result.trim()} ${addition}`;
  return result;
}

function cleanPassageText(text: string) {
  return text
    .replace(/The passage gives another clear detail in simple language\.?/gi, "")
    .replace(/Students can use this detail to check the answer, compare choices, and explain why one choice is stronger than another\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function repairHotTextPhrase(question: any) {
  const passage = question.passage || "";
  const desiredCount = Math.max(4, question.selectablePhrases?.length || 4);
  const candidates = extractPassagePhrases(passage, desiredCount + 3);
  const repairedSelectable: string[] = [];
  for (const phrase of question.selectablePhrases || []) {
    if (normalizedPhrase(passage).includes(normalizedPhrase(phrase))) repairedSelectable.push(phrase);
  }
  for (const phrase of candidates) {
    if (repairedSelectable.length >= desiredCount) break;
    if (!repairedSelectable.some((existing) => normalizedPhrase(existing) === normalizedPhrase(phrase))) {
      repairedSelectable.push(phrase);
    }
  }
  question.selectablePhrases = repairedSelectable.slice(0, desiredCount);
  const existingCorrect = (question.correctPhrases || []).filter((phrase: string) =>
    question.selectablePhrases.some((selectable: string) => normalizedPhrase(selectable) === normalizedPhrase(phrase)),
  );
  const correctCount = Math.max(1, Math.min(question.maxSelect || 2, question.selectablePhrases.length, existingCorrect.length || 2));
  question.correctPhrases = (existingCorrect.length ? existingCorrect : question.selectablePhrases).slice(0, correctCount);
  question.minSelect = Math.max(1, Math.min(question.minSelect || correctCount, question.correctPhrases.length));
  question.maxSelect = Math.max(question.minSelect, Math.min(question.maxSelect || question.correctPhrases.length, question.selectablePhrases.length));
}

function extractPassagePhrases(passage: string, limit: number) {
  const words = passage
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""))
    .filter((word) => word.length > 0);
  const phrases: string[] = [];
  for (let index = 0; index < words.length - 2 && phrases.length < limit; index += 3) {
    const phrase = words.slice(index, index + 3).join(" ");
    const normalized = normalizedPhrase(phrase);
    if (phrase.length >= 8 && normalizedPhrase(passage).includes(normalized) && !phrases.some((existing) => normalizedPhrase(existing) === normalized)) {
      phrases.push(phrase);
    }
  }
  return phrases;
}

function normalizedPhrase(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeInlineDropdownSentence(sentence: string, correctOption: string) {
  let result = sentence.trim();
  if (/\[\s*\]/.test(result)) {
    result = result.replace(/\[\s*\]/, "[BLANK]").replace(/\s*\[BLANK\](?=[.?!]?$)/, "");
  }
  const blanks = result.match(/\[BLANK\]/g)?.length || 0;
  if (blanks === 0 && result.includes(correctOption)) {
    result = result.replace(correctOption, "[BLANK]");
  } else if (blanks > 1) {
    let seen = 0;
    result = result.replace(/\[BLANK\]/g, () => {
      seen += 1;
      return seen === 1 ? "[BLANK]" : "";
    }).replace(/\s+([.?!])/g, "$1").replace(/\s{2,}/g, " ");
  }
  return result;
}

function fitPassageToSchema(text: string) {
  const compact = text.trim().replace(/\s+/g, " ");
  if (compact.length <= 2200) return compact;
  const clipped = compact.slice(0, 2180);
  const lastSentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
  return `${clipped.slice(0, lastSentenceEnd > 650 ? lastSentenceEnd + 1 : 2180).trim()}`;
}

function buildReplacementTei(type: string, input: GenerateLessonV2Input): PracticeQuestionV2 {
  if (type === "hot-text-word") {
    return {
      type: "hot-text-word",
      question: `Select the word choice that best fits ${input.skill}.`,
      passage: null,
      rightAnswerRationale: "The correct word follows the rule or meaning required by the sentence.",
      coachHint: "Read both choices inside the brackets and test which one makes the sentence correct.",
      sentence: "The student carefully [ checks / check ] the answer before turning in the assignment.",
      bracketPairs: [{ options: ["checks", "check"], correct: "checks" }],
    };
  }
  if (type === "hot-text-sentence") {
    return {
      type: "hot-text-sentence",
      question: `Which sentence best shows ${input.skill}?`,
      passage: null,
      rightAnswerRationale: "The correct sentence gives the clearest example of the target skill.",
      coachHint: "Read each numbered sentence and choose the one that directly shows the skill.",
      paragraph: "(1) The passage gives a general topic. (2) This sentence shows the target skill clearly. (3) The final sentence adds a related detail.",
      sentenceCount: 3,
      correctSentenceNumber: 2,
    };
  }
  return {
    type: "inline-dropdown",
    question: `Choose the option that best completes the sentence for ${input.skill}.`,
    passage: null,
    rightAnswerRationale: "The correct option completes the sentence accurately and follows the target skill.",
    coachHint: "Read the sentence before and after the blank before choosing.",
    sentence: "A strong answer uses [BLANK] to prove the idea.",
    dropdownOptions: ["specific evidence", "a random guess", "only the title"],
    correctOption: "specific evidence",
    distractorRationale: [
      { option: "a random guess", whyWrong: "A guess is not supported by the passage or the rule." },
      { option: "only the title", whyWrong: "A title may help, but it is not enough proof by itself." },
    ],
  };
}

function calculateQualityScore(critic: LessonV2CriticResult, validationIssues: string[]) {
  const structuralIssueCount = validationIssues.filter((issue) => !issue.includes("FK grade")).length;
  const validationBasedScore = Math.max(75, 92 - structuralIssueCount * 4);
  const score = validationIssues.length ? Math.min(critic.score, validationBasedScore) : critic.score;
  return Math.max(0, Math.min(100, score));
}

function isStructuralRevision(revision: { issue: string; suggestion: string }) {
  const text = `${revision.issue} ${revision.suggestion}`.toLowerCase();
  return /missing|\[blank\]|bracket|passage-dependent|evidence per claim|selectable|duplicate risk|tei variety|correct answer|mapping/.test(text);
}

function isHardValidationIssue(issue: string) {
  return /forbidden pedagogical meta-language|hot-text-phrase selectable phrase|duplicate risk/i.test(issue);
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
