import { readFileSync } from "fs";
import path from "path";

const EXTRACTED_DIR = path.join(process.cwd(), "reference", "pssa-released-items", "extracted");
const TECH_CATALOG_PATH = path.join(process.cwd(), "reference", "pssa-tech-items", "catalog.json");

export type SamplerPassage = {
  id: string;
  title: string;
  genre: "informational" | "literary" | "paired" | "argumentative";
  wordCount: number;
  text: string;
  sourceAttribution?: string;
};

export type SamplerMcItem = {
  id: string;
  passageId?: string | null;
  standardCode: string;
  standardLabel: string;
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  rationale?: string;
  depthOfKnowledge?: number;
};

export type SamplerTdaPrompt = {
  id: string;
  passageId: string;
  prompt: string;
  rubricVersion: string;
  scoredExemplars: Array<{ score: number; response: string; rationale: string }>;
};

export type GradeSampler = {
  grade: number;
  source: string;
  passages: SamplerPassage[];
  multipleChoiceItems: SamplerMcItem[];
  tdaPrompts: SamplerTdaPrompt[];
};

export type TechItemExample = {
  id: string;
  screenshotFile: string;
  grade: number;
  questionNumber?: number;
  itemType: string;
  standardCategory: string;
  standardCode?: string;
  instructions: string;
  practiceHint?: string;
  content: Record<string, unknown>;
  correctAnswer?: unknown;
  notes?: string;
};

export type PssaLessonExemplars = {
  sampler: GradeSampler;
  passages: SamplerPassage[];
  mcItems: SamplerMcItem[];
  tdaPrompts: SamplerTdaPrompt[];
  techItems: TechItemExample[];
  exemplarIds: string[];
};

export function loadGradeSampler(gradeLevel: number): GradeSampler {
  const samplerPath = path.join(EXTRACTED_DIR, `grade-${gradeLevel}`, "sampler.json");
  return JSON.parse(readFileSync(samplerPath, "utf8")) as GradeSampler;
}

export function loadTechCatalog(): { source: string; generated_at: string; items: TechItemExample[] } {
  return JSON.parse(readFileSync(TECH_CATALOG_PATH, "utf8"));
}

export function selectPssaExemplarsForLesson({
  gradeLevel,
  standardCode,
  skill,
  plannedTeiTypes,
}: {
  gradeLevel: number;
  standardCode: string;
  skill: string;
  plannedTeiTypes: string[];
}): PssaLessonExemplars {
  const sampler = loadGradeSampler(gradeLevel);
  const strand = strandFromStandard(standardCode);
  const passages = selectPassages(sampler, strand);
  const mcItems = selectMcItems(sampler, standardCode, skill);
  const tdaPrompts = standardCode.startsWith("CC.1.4.") ? sampler.tdaPrompts.slice(0, 1) : [];
  const techItems = selectTechItems({ gradeLevel, standardCode, skill, plannedTeiTypes });
  return {
    sampler,
    passages,
    mcItems,
    tdaPrompts,
    techItems,
    exemplarIds: [
      ...passages.map((passage) => passage.id),
      ...mcItems.map((item) => item.id),
      ...tdaPrompts.map((prompt) => prompt.id),
      ...techItems.map((item) => item.id),
    ],
  };
}

function selectPassages(sampler: GradeSampler, strand: string) {
  const desiredGenre = strand === "literary" ? "literary" : strand === "informational" ? "informational" : null;
  const matching = desiredGenre ? sampler.passages.filter((passage) => passage.genre === desiredGenre || passage.genre === "paired") : sampler.passages;
  return (matching.length ? matching : sampler.passages).slice(0, 2).map((passage) => ({
    ...passage,
    text: truncateWords(passage.text, 180),
  }));
}

function selectMcItems(sampler: GradeSampler, standardCode: string, skill: string) {
  const family = standardFamily(standardCode);
  const skillTokens = tokens(skill);
  const scored = sampler.multipleChoiceItems
    .map((item) => ({
      item,
      score:
        (item.standardCode === standardCode ? 10 : 0) +
        (standardFamily(item.standardCode) === family ? 5 : 0) +
        overlapScore(`${item.standardLabel} ${item.question}`, skillTokens),
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((entry) => ({
    ...entry.item,
    question: truncateWords(entry.item.question, 80),
    rationale: entry.item.rationale ? truncateWords(entry.item.rationale, 80) : entry.item.rationale,
  }));
}

function selectTechItems({
  gradeLevel,
  standardCode,
  skill,
  plannedTeiTypes,
}: {
  gradeLevel: number;
  standardCode: string;
  skill: string;
  plannedTeiTypes: string[];
}) {
  const catalog = loadTechCatalog();
  const category = categoryForStandard(standardCode, skill);
  const planned = new Set(plannedTeiTypes);
  const skillTokens = tokens(skill);
  return catalog.items
    .map((item) => ({
      item,
      score:
        (item.grade === gradeLevel ? 8 : Math.max(0, 5 - Math.abs(item.grade - gradeLevel))) +
        (planned.has(item.itemType) ? 8 : 0) +
        (item.standardCategory === category ? 5 : 0) +
        (item.standardCode && standardFamily(item.standardCode) === standardFamily(standardCode) ? 3 : 0) +
        overlapScore(`${item.instructions} ${JSON.stringify(item.content)}`, skillTokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => ({
      ...entry.item,
      instructions: truncateWords(entry.item.instructions, 60),
      practiceHint: entry.item.practiceHint ? truncateWords(entry.item.practiceHint, 35) : entry.item.practiceHint,
      content: trimTechContent(entry.item.content),
      notes: entry.item.notes ? truncateWords(entry.item.notes, 35) : entry.item.notes,
    }));
}

export function plannedTeiTypesForLesson(standardCode: string, skill: string): string[] {
  const lower = skill.toLowerCase();
  if (standardCode.startsWith("CC.1.4.")) {
    if (lower.includes("agreement") || lower.includes("verb tense") || lower.includes("tense")) return ["inline-dropdown", "hot-text-word", "hot-text-sentence"];
    if (lower.includes("spelling") || lower.includes("word choice")) return ["hot-text-word", "inline-dropdown", "multi-select"];
    if (lower.includes("structure") || lower.includes("fragment") || lower.includes("sentence")) return ["hot-text-sentence", "drag-drop-order", "inline-dropdown"];
    if (lower.includes("capital") || lower.includes("punctuation") || lower.includes("comma")) return ["inline-dropdown", "hot-text-word", "hot-text-sentence"];
    if (lower.includes("organization") || lower.includes("transition")) return ["drag-drop-order", "multi-select", "evidence-mapping"];
    if (lower.includes("evidence")) return ["multi-select", "evidence-mapping", "two-part-ebsr"];
    return ["inline-dropdown", "hot-text-word", "hot-text-sentence"];
  }
  if (lower.includes("main idea") || lower.includes("central idea")) return ["evidence-mapping", "drag-drop-table", "two-part-ebsr"];
  if (lower.includes("theme") || lower.includes("character")) return ["two-part-ebsr", "hot-text-sentence", "evidence-mapping"];
  if (lower.includes("purpose") || lower.includes("craft")) return ["hot-text-sentence", "two-part-ebsr", "multi-select"];
  if (lower.includes("compare") || lower.includes("contrast")) return ["drag-drop-table", "evidence-mapping", "multi-select"];
  if (lower.includes("inference") || lower.includes("evidence")) return ["two-part-ebsr", "evidence-mapping", "hot-text-phrase"];
  if (lower.includes("vocab") || lower.includes("context") || lower.includes("word")) return ["hot-text-phrase", "inline-dropdown", "multi-select"];
  if (lower.includes("plot") || lower.includes("sequence")) return ["drag-drop-order", "hot-text-sentence", "two-part-ebsr"];
  return ["two-part-ebsr", "evidence-mapping", "hot-text-phrase"];
}

function strandFromStandard(standardCode: string) {
  if (standardCode.startsWith("CC.1.3.")) return "literary";
  if (standardCode.startsWith("CC.1.2.")) return "informational";
  if (standardCode.startsWith("CC.1.4.")) return "writing";
  return "foundational";
}

function categoryForStandard(standardCode: string, skill: string) {
  const lower = skill.toLowerCase();
  if (standardCode.startsWith("CC.1.4.") && /punctuation|grammar|convention|verb|sentence|capital|comma|spelling/.test(lower)) return "conventions";
  if (/vocab|word|context|meaning|suffix|prefix|root/.test(lower)) return "vocabulary";
  if (standardCode.startsWith("CC.1.4.")) return "writing";
  return "comprehension";
}

function standardFamily(standardCode: string) {
  return standardCode.replace(/^((?:CC\.1\.[1-4]\.)[3-8])\./, "$1.");
}

function tokens(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 3);
}

function overlapScore(value: string, skillTokens: string[]) {
  const lower = value.toLowerCase();
  return skillTokens.reduce((score, token) => score + (lower.includes(token) ? 1 : 0), 0);
}

function truncateWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function trimTechContent(content: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(content).map(([key, value]) => {
    if (typeof value === "string") return [key, truncateWords(value, 70)];
    if (Array.isArray(value)) return [key, value.slice(0, 6)];
    if (value && typeof value === "object") return [key, value];
    return [key, value];
  }));
}
