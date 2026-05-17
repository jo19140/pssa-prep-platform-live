import OpenAI from "openai";
import { db } from "@/lib/db";
import { allPracticeQuestions, lessonV2Schema, type LessonV2, type PracticeQuestionV2 } from "@/lib/lessonV2Schema";

export type LessonV2ValidationResult = {
  valid: boolean;
  issues: string[];
};

export async function validateLessonV2(lesson: LessonV2, openai?: OpenAI): Promise<LessonV2ValidationResult> {
  const issues: string[] = [];
  const parsed = lessonV2Schema.safeParse(lesson);
  if (!parsed.success) issues.push(...parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));

  assertWordCount("hook", lesson.hook, 50, 140, issues);
  assertWordCount("explanation", lesson.explanation, 280, 560, issues);
  assertWordCount("workedExample", lesson.workedExample, 140, 300, issues);

  const questions = allPracticeQuestions(lesson);
  const isReadingStrand = lesson.standardCode.startsWith("CC.1.2.") || lesson.standardCode.startsWith("CC.1.3.");
  const passages = uniquePassages(questions);
  if (isReadingStrand && passages.length < 2) {
    issues.push("Reading-strand lessons must include at least two full practice passages across the lesson.");
  }
  if (questions.some((question) => requiresPassage(question) && !question.passage)) {
    issues.push("Passage-dependent TEI questions must include a passage.");
  }

  for (const question of questions) {
    validatePracticeQuestion(question, lesson.gradeLevel, issues);
  }

  const teiTypes = new Set(questions.filter((question) => question.type !== "mc").map((question) => question.type));
  if (teiTypes.size < 2) issues.push(`Expected at least 2 distinct TEI types; found ${teiTypes.size}.`);

  for (const passage of passages) {
    const wc = wordCount(passage);
    const [min, max] = lesson.gradeLevel <= 5 ? [150, 400] : [250, 600];
    if (wc < min || wc > max) issues.push(`Practice passage word count ${wc} is outside grade-band range ${min}-${max}.`);
    const fk = fleschKincaidGrade(passage);
    if (Math.abs(fk - lesson.gradeLevel) > 1.5) issues.push(`Practice passage Flesch-Kincaid ${fk.toFixed(1)} is outside target grade ${lesson.gradeLevel} ±1.5.`);
  }

  if (openai && passages.length) {
    const duplicate = await hasDuplicateV2Passage(openai, passages);
    if (duplicate) issues.push("Practice passage appears too similar to an existing V2 passage.");
  }

  return { valid: issues.length === 0, issues };
}

function validatePracticeQuestion(question: PracticeQuestionV2, gradeLevel: number, issues: string[]) {
  switch (question.type) {
    case "mc": {
      const wrongChoices = question.choices.filter((choice) => choice !== question.correctAnswer);
      if (question.distractorRationale.length < wrongChoices.length) issues.push("MC item missing distractor rationale for all wrong choices.");
      for (const choice of wrongChoices) {
        if (!question.distractorRationale.some((entry) => entry.choice === choice)) issues.push(`MC item missing rationale for distractor "${choice}".`);
      }
      break;
    }
    case "inline-dropdown":
      if (!question.sentence.includes("[BLANK]")) issues.push("Inline-dropdown sentence must include [BLANK].");
      if (!question.dropdownOptions.includes(question.correctOption)) issues.push("Inline-dropdown correctOption must appear in dropdownOptions.");
      break;
    case "hot-text-word":
      for (const pair of question.bracketPairs) {
        if (!pair.options.includes(pair.correct)) issues.push("Hot-text-word correct answer must appear in its bracket pair options.");
        if (!question.sentence.includes(`[ ${pair.options[0]} / ${pair.options[1]} ]`) && !question.sentence.includes(`[${pair.options[0]} / ${pair.options[1]}]`)) {
          issues.push("Hot-text-word sentence should contain visible [ X / Y ] bracket pairs.");
        }
      }
      break;
    case "hot-text-phrase":
      if (question.correctPhrases.some((phrase) => !question.selectablePhrases.includes(phrase))) issues.push("Hot-text-phrase correctPhrases must be selectable.");
      if (question.minSelect > question.maxSelect) issues.push("Hot-text-phrase minSelect cannot exceed maxSelect.");
      break;
    case "hot-text-sentence":
      if (question.correctSentenceNumber > question.sentenceCount) issues.push("Hot-text-sentence correctSentenceNumber exceeds sentenceCount.");
      break;
    case "drag-drop-table":
      for (const item of question.draggableItems) {
        const mapping = question.correctMapping.find((entry) => entry.item === item);
        if (!mapping) issues.push(`Drag-drop-table item "${item}" has no mapping.`);
        if (mapping && !question.columns.includes(mapping.column)) issues.push(`Drag-drop-table item "${item}" maps to an unknown column.`);
      }
      break;
    case "drag-drop-order":
      if (question.correctOrder.length !== question.draggableItems.length) issues.push("Drag-drop-order correctOrder must include every draggable item.");
      break;
    case "evidence-mapping":
      for (const claim of question.claims) {
        if (!question.correctMapping.find((entry) => entry.claim === claim)?.evidenceItems.length) issues.push(`Evidence-mapping claim "${claim}" has no mapped evidence.`);
      }
      break;
    case "multi-select":
      if (question.correctAnswers.some((answer) => !question.choices.includes(answer))) issues.push("Multi-select correctAnswers must be in choices.");
      if (question.minSelect > question.maxSelect) issues.push("Multi-select minSelect cannot exceed maxSelect.");
      break;
    case "two-part-ebsr":
      if (!question.partA.choices.includes(question.partA.correctAnswer)) issues.push("EBSR Part A correct answer must be in choices.");
      if (question.partB.correctAnswers.some((answer) => !question.partB.choices.includes(answer))) issues.push("EBSR Part B correct answers must be in choices.");
      break;
  }
  for (const passage of [question.passage, question.type === "hot-text-phrase" || question.type === "evidence-mapping" ? question.passage : undefined]) {
    if (passage && wordCount(passage) < (gradeLevel <= 5 ? 120 : 200)) issues.push("A practice passage is likely too short for the target grade.");
  }
}

function requiresPassage(question: PracticeQuestionV2) {
  return ["hot-text-phrase", "evidence-mapping", "two-part-ebsr"].includes(question.type);
}

function assertWordCount(label: string, text: string, min: number, max: number, issues: string[]) {
  const count = wordCount(text);
  if (count < min) issues.push(`${label} is too short: ${count} words, expected at least ${min}.`);
  if (count > max) issues.push(`${label} is too long: ${count} words, expected at most ${max}.`);
}

function uniquePassages(questions: PracticeQuestionV2[]) {
  return Array.from(new Set(questions.map((question) => question.passage).filter((passage): passage is string => Boolean(passage && wordCount(passage) > 30))));
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function fleschKincaidGrade(text: string) {
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((sentence) => sentence.trim()).length);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / Math.max(1, words.length)) - 15.59;
}

function countSyllables(word: string) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 1;
  const groups = cleaned.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups?.length || 1);
}

async function hasDuplicateV2Passage(openai: OpenAI, passages: string[]) {
  const existing = await db.learningLesson.findMany({
    where: { generatorVersion: "V2" },
    select: { guidedPractice: true, independentPractice: true, exitTicket: true, masteryCheck: true },
    take: 500,
  });
  const existingPassages = existing.flatMap((lesson) => [
    ...extractPassages(lesson.guidedPractice),
    ...extractPassages(lesson.independentPractice),
    ...extractPassages(lesson.exitTicket),
    ...extractPassages(lesson.masteryCheck),
  ]);
  if (!existingPassages.length) return false;
  const embeddings = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: [...passages, ...existingPassages],
  });
  const vectors = embeddings.data.map((item) => item.embedding);
  const newVectors = vectors.slice(0, passages.length);
  const oldVectors = vectors.slice(passages.length);
  return newVectors.some((newVector) => oldVectors.some((oldVector) => cosine(newVector, oldVector) > 0.92));
}

function extractPassages(value: unknown) {
  const questions = Array.isArray(value) ? value : [];
  return questions.map((question: any) => question?.passage).filter((passage: unknown): passage is string => typeof passage === "string" && passage.length > 100);
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    aMag += a[index] * a[index];
    bMag += b[index] * b[index];
  }
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag) || 1);
}
