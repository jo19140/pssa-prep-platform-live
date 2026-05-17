import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import OpenAI from "openai";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";

const RAW_DIR = path.join(process.cwd(), "reference", "pssa-released-items", "raw");
const EXTRACTED_DIR = path.join(process.cwd(), "reference", "pssa-released-items", "extracted");
const MODEL = process.env.PSSA_SAMPLER_EXTRACT_MODEL || "gpt-4o";
const MAX_OUTPUT_TOKENS = Number(process.env.PSSA_SAMPLER_MAX_OUTPUT_TOKENS || 8000);
const PAGES_PER_CHUNK = Number(process.env.PSSA_SAMPLER_PAGES_PER_CHUNK || 20);
const KEEP_RAW = process.env.PSSA_SAMPLER_KEEP_RAW === "true";

const choiceSchema = z.object({
  A: z.string().min(1),
  B: z.string().min(1),
  C: z.string().min(1),
  D: z.string().min(1),
});

const standardCodeSchema = z.string().regex(/^CC\.1\.[1-4]\.[3-8]\.[A-Z][A-Z0-9]?$/);

const scoredExemplarSchema = z.object({
  score: z.number().int().min(1).max(4),
  response: z.string().min(1),
  rationale: z.string().min(1),
});

const gradeSamplerSchema = z.object({
  grade: z.number().int().min(3).max(8),
  source: z.string().min(1),
  passages: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    genre: z.enum(["informational", "literary", "paired", "argumentative"]),
    wordCount: z.number().int().nonnegative(),
    text: z.string().min(1),
    sourceAttribution: z.string().optional(),
  })).min(1),
  multipleChoiceItems: z.array(z.object({
    id: z.string().min(1),
    passageId: z.string().nullable().optional(),
    standardCode: standardCodeSchema,
    standardLabel: z.string().min(1),
    question: z.string().min(1),
    choices: choiceSchema,
    correctAnswer: z.enum(["A", "B", "C", "D"]),
    rationale: z.string().optional(),
    depthOfKnowledge: z.number().int().min(1).max(4).optional(),
  })),
  tdaPrompts: z.array(z.object({
    id: z.string().min(1),
    passageId: z.string().min(1),
    prompt: z.string().min(1),
    rubricVersion: z.string().min(1),
    scoredExemplars: z.array(scoredExemplarSchema).min(4),
  })),
});

type GradeSampler = z.infer<typeof gradeSamplerSchema>;
type RawSampler = Omit<GradeSampler, "passages" | "multipleChoiceItems" | "tdaPrompts"> & {
  passages: Array<Partial<GradeSampler["passages"][number]> & { wordCount?: number | null }>;
  multipleChoiceItems: Array<Partial<GradeSampler["multipleChoiceItems"][number]> & { standardCode?: string | null; choices?: Partial<Record<"A" | "B" | "C" | "D", string>> }>;
  tdaPrompts: Array<Partial<GradeSampler["tdaPrompts"][number]> & { scoredExemplars?: Array<Partial<GradeSampler["tdaPrompts"][number]["scoredExemplars"][number]>> }>;
};

type ExistingTda = {
  grade: number;
  source: string;
  passage: { title: string; content: string };
  prompt: string;
  rubric_version: string;
  exemplars: Array<{ score: number; response: string; rationale: string }>;
};

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["grade", "source", "passages", "multipleChoiceItems", "tdaPrompts"],
  properties: {
    grade: { type: "integer", minimum: 3, maximum: 8 },
    source: { type: "string" },
    passages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "genre", "wordCount", "text"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          genre: { type: "string", enum: ["informational", "literary", "paired", "argumentative"] },
          wordCount: { type: "integer", minimum: 0 },
          text: { type: "string" },
          sourceAttribution: { type: "string" },
        },
      },
    },
    multipleChoiceItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "standardCode", "standardLabel", "question", "choices", "correctAnswer"],
        properties: {
          id: { type: "string" },
          passageId: { type: ["string", "null"] },
          standardCode: { type: "string" },
          standardLabel: { type: "string" },
          question: { type: "string" },
          choices: {
            type: "object",
            additionalProperties: false,
            required: ["A", "B", "C", "D"],
            properties: {
              A: { type: "string" },
              B: { type: "string" },
              C: { type: "string" },
              D: { type: "string" },
            },
          },
          correctAnswer: { type: "string", enum: ["A", "B", "C", "D"] },
          rationale: { type: "string" },
          depthOfKnowledge: { type: "integer", minimum: 1, maximum: 4 },
        },
      },
    },
    tdaPrompts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "passageId", "prompt", "rubricVersion", "scoredExemplars"],
        properties: {
          id: { type: "string" },
          passageId: { type: "string" },
          prompt: { type: "string" },
          rubricVersion: { type: "string" },
          scoredExemplars: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["score", "response", "rationale"],
              properties: {
                score: { type: "integer", minimum: 1, maximum: 4 },
                response: { type: "string" },
                rationale: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

async function main() {
  const args = new Set(process.argv.slice(2));
  const validateOnly = args.has("--validate-only");
  const force = args.has("--force");
  const grades = [3, 4, 5, 6, 7, 8];

  if (validateOnly) {
    validateSamplers(grades);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required to extract sampler PDFs.");
  const openai = new OpenAI({ apiKey });

  for (const grade of grades) {
    const pdfPath = path.join(RAW_DIR, `2024-pssa-ela-grade-${grade}-item-sampler.pdf`);
    if (!existsSync(pdfPath)) throw new Error(`Missing sampler PDF: ${pdfPath}`);
    const outputPath = path.join(EXTRACTED_DIR, `grade-${grade}`, "sampler.json");
    if (!force && existsSync(outputPath)) {
      gradeSamplerSchema.parse(JSON.parse(readFileSync(outputPath, "utf8")));
      console.log(`\nSkipping grade ${grade}; existing sampler.json validates. Use --force to regenerate.`);
      continue;
    }
    console.log(`\nExtracting grade ${grade} from ${path.relative(process.cwd(), pdfPath)} with ${MODEL}...`);
    const sampler = await extractGradeSampler(openai, grade, pdfPath);
    const withPreservedTda = preserveExistingTdaExemplars(sampler);
    const parsed = gradeSamplerSchema.parse(withPreservedTda);
    const outputDir = path.join(EXTRACTED_DIR, `grade-${grade}`);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`);
    console.log(`  Wrote ${path.relative(process.cwd(), outputPath)} (${parsed.passages.length} passages, ${parsed.multipleChoiceItems.length} MC, ${parsed.tdaPrompts.length} TDA)`);
  }

  validateSamplers(grades);
}

async function extractGradeSampler(openai: OpenAI, grade: number, pdfPath: string): Promise<GradeSampler> {
  const pdf = await PDFDocument.load(readFileSync(pdfPath));
  const pageCount = pdf.getPageCount();
  const chunks: RawSampler[] = [];

  for (let startPage = 1; startPage <= pageCount; startPage += PAGES_PER_CHUNK) {
    const endPage = Math.min(pageCount, startPage + PAGES_PER_CHUNK - 1);
    console.log(`  Extracting pages ${startPage}-${endPage} of ${pageCount}...`);
    chunks.push(await extractGradeSamplerChunk(openai, grade, pdfPath, pdf, startPage, endPage));
  }

  const merged = mergeRawSamplers(chunks, grade);
  if (KEEP_RAW) {
    const rawOutputPath = path.join(EXTRACTED_DIR, `grade-${grade}`, "sampler.raw.json");
    mkdirSync(path.dirname(rawOutputPath), { recursive: true });
    writeFileSync(rawOutputPath, `${JSON.stringify(merged, null, 2)}\n`);
  }
  return gradeSamplerSchema.parse(normalizeSampler(merged, grade));
}

async function extractGradeSamplerChunk(
  openai: OpenAI,
  grade: number,
  pdfPath: string,
  pdf: PDFDocument,
  startPage: number,
  endPage: number,
): Promise<RawSampler> {
  const chunk = await PDFDocument.create();
  const pageIndexes = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage - 1 + index);
  const pages = await chunk.copyPages(pdf, pageIndexes);
  for (const page of pages) chunk.addPage(page);
  const chunkBytes = await chunk.save();
  const fileData = `data:application/pdf;base64,${Buffer.from(chunkBytes).toString("base64")}`;
  const response = await openai.responses.create({
    model: MODEL,
    temperature: 0,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    instructions: buildInstructions(grade, startPage, endPage),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Extract pages ${startPage}-${endPage} of the 2024 PSSA ELA Grade ${grade} Item Sampler into the required JSON schema. Use only content visible in this page range. It is okay for passages, multipleChoiceItems, or tdaPrompts to be empty when the page range does not contain that content. Return only JSON.`,
          },
          {
            type: "input_file",
            filename: `${path.basename(pdfPath, ".pdf")}-pages-${startPage}-${endPage}.pdf`,
            file_data: fileData,
            detail: "high",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "pssa_grade_sampler",
        strict: false,
        schema: responseJsonSchema,
      },
    },
  });

  const outputText = response.output_text;
  if (!outputText) throw new Error(`No JSON returned for grade ${grade}, pages ${startPage}-${endPage}. Response id: ${response.id}`);
  if (KEEP_RAW) {
    const chunkOutputPath = path.join(EXTRACTED_DIR, `grade-${grade}`, `sampler.pages-${startPage}-${endPage}.raw.json`);
    mkdirSync(path.dirname(chunkOutputPath), { recursive: true });
    writeFileSync(chunkOutputPath, `${outputText.trim()}\n`);
  }
  return JSON.parse(outputText) as RawSampler;
}

function buildInstructions(grade: number, startPage?: number, endPage?: number) {
  return [
    "You are extracting released assessment content into structured JSON for curriculum research and lesson exemplar generation.",
    "Use only the attached PDF. Do not invent item text, standards, answers, rationales, passages, or scored responses.",
    `The output grade must be ${grade}. Source must be \"2024 PSSA ELA Grade ${grade} Item Sampler\".`,
    startPage && endPage ? `This is a page-range extraction for pages ${startPage}-${endPage}. Extract only content present in this range.` : "",
    "Include every passage needed by extracted items. Preserve passage text as continuous readable prose; remove page headers/footers and line numbers.",
    "Extract multiple-choice items across all PA Core strands: CC.1.1 foundational skills, CC.1.2 informational reading, CC.1.3 literary reading, and CC.1.4 writing/conventions.",
    "For each item, use the answer key/scoring guide to populate correctAnswer, standardCode, standardLabel, rationale, and depthOfKnowledge when available.",
    "The PDF may list PSSA assessment anchors such as E03.A, E03.B, E03.C, or E03.D. Convert those to PA Core standard codes in CC format. Use CC.1.3 for literary text, CC.1.2 for informational text, CC.1.4 for writing/conventions, and CC.1.1 for foundational skills.",
    "For standalone vocabulary or conventions questions with no passage, omit passageId or set it to null.",
    "Extract TDA prompts and all four scored student exemplars when present, including official rationales. Use rubricVersion \"PSSA 1-4 TDA\" unless the PDF names a more specific version.",
    "Use stable IDs: g{grade}-p1, g{grade}-mc-1, g{grade}-tda-1. passageId values must refer to ids in passages.",
    "Standard codes must match CC.1.{1|2|3|4}.{grade}.{letter}, for example CC.1.2.6.B.",
  ].filter(Boolean).join("\n");
}

function mergeRawSamplers(chunks: RawSampler[], grade: number): RawSampler {
  const passages = dedupeByText(chunks.flatMap((chunk) => chunk.passages || []), (passage) => `${passage.title || ""}:${firstWords(passage.text || "", 20)}`);
  const multipleChoiceItems = dedupeByText(chunks.flatMap((chunk) => chunk.multipleChoiceItems || []), (item) => `${item.question || ""}:${item.correctAnswer || ""}`);
  const tdaPrompts = dedupeByText(chunks.flatMap((chunk) => chunk.tdaPrompts || []), (prompt) => `${prompt.prompt || ""}:${prompt.passageId || ""}`);
  return {
    grade,
    source: `2024 PSSA ELA Grade ${grade} Item Sampler`,
    passages,
    multipleChoiceItems,
    tdaPrompts,
  };
}

function dedupeByText<T>(items: T[], keyFor: (item: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = normalize(keyFor(item));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function firstWords(text: string, count: number) {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}

function normalizeSampler(raw: RawSampler, grade: number): GradeSampler {
  const passages = (raw.passages || []).map((passage, index) => ({
    id: nonEmpty(passage.id, `g${grade}-p${index + 1}`),
    title: nonEmpty(passage.title, `Grade ${grade} Passage ${index + 1}`),
    genre: normalizeGenre(passage.genre),
    wordCount: typeof passage.wordCount === "number" && passage.wordCount >= 0 ? Math.round(passage.wordCount) : wordCount(passage.text || ""),
    text: nonEmpty(passage.text, ""),
    sourceAttribution: passage.sourceAttribution || undefined,
  }));

  const multipleChoiceItems = (raw.multipleChoiceItems || []).map((item, index) => {
    const question = nonEmpty(item.question, "");
    const standardLabel = nonEmpty(item.standardLabel, inferStandardLabel(item.standardCode || "", question));
    return {
      id: nonEmpty(item.id, `g${grade}-mc-${index + 1}`),
      passageId: item.passageId || undefined,
      standardCode: normalizeStandardCode(item.standardCode || "", standardLabel, question, grade),
      standardLabel,
      question,
      choices: {
        A: nonEmpty(item.choices?.A, ""),
        B: nonEmpty(item.choices?.B, ""),
        C: nonEmpty(item.choices?.C, ""),
        D: nonEmpty(item.choices?.D, ""),
      },
      correctAnswer: normalizeAnswer(item.correctAnswer),
      rationale: item.rationale || undefined,
      depthOfKnowledge: normalizeDok(item.depthOfKnowledge),
    };
  });

  const tdaPrompts = (raw.tdaPrompts || [])
    .map((prompt, index) => ({
      id: nonEmpty(prompt.id, `g${grade}-tda-${index + 1}`),
      passageId: nonEmpty(prompt.passageId, passages[0]?.id || `g${grade}-p1`),
      prompt: nonEmpty(prompt.prompt, ""),
      rubricVersion: nonEmpty(prompt.rubricVersion, "PSSA 1-4 TDA"),
      scoredExemplars: (prompt.scoredExemplars || []).map((exemplar) => ({
        score: Math.min(4, Math.max(1, Math.round(Number(exemplar.score) || 1))),
        response: nonEmpty(exemplar.response, ""),
        rationale: nonEmpty(exemplar.rationale, ""),
      })),
    }))
    .filter((prompt) => prompt.prompt && prompt.scoredExemplars.length >= 4);

  return {
    grade,
    source: nonEmpty(raw.source, `2024 PSSA ELA Grade ${grade} Item Sampler`),
    passages,
    multipleChoiceItems,
    tdaPrompts,
  };
}

function normalizeGenre(value: unknown): GradeSampler["passages"][number]["genre"] {
  const lower = String(value || "").toLowerCase();
  if (lower.includes("paired")) return "paired";
  if (lower.includes("argument")) return "argumentative";
  if (lower.includes("liter") || lower.includes("fiction") || lower.includes("poem") || lower.includes("story")) return "literary";
  return "informational";
}

function normalizeAnswer(value: unknown): "A" | "B" | "C" | "D" {
  const answer = String(value || "").trim().toUpperCase().slice(0, 1);
  return answer === "A" || answer === "B" || answer === "C" || answer === "D" ? answer : "A";
}

function normalizeDok(value: unknown) {
  const dok = Math.round(Number(value));
  return dok >= 1 && dok <= 4 ? dok : undefined;
}

function normalizeStandardCode(rawCode: string, label: string, question: string, grade: number) {
  const existing = rawCode.match(/CC\.1\.[1-4]\.[3-8]\.[A-Z][A-Z0-9]?/i)?.[0];
  if (existing) return existing.toUpperCase();
  const haystack = `${rawCode} ${label} ${question}`.toLowerCase();
  const letter = inferStandardLetter(haystack);
  if (haystack.includes(".d") || haystack.includes("writing") || haystack.includes("convention") || haystack.includes("grammar") || haystack.includes("punctuation") || haystack.includes("sentence")) {
    return `CC.1.4.${grade}.${letter === "A" ? "F" : letter}`;
  }
  if (haystack.includes(".a") || haystack.includes("literary") || haystack.includes("story") || haystack.includes("poem") || haystack.includes("theme") || haystack.includes("character")) {
    return `CC.1.3.${grade}.${letter}`;
  }
  if (haystack.includes(".c") || haystack.includes("vocab") || haystack.includes("word meaning") || haystack.includes("context clue") || haystack.includes("figurative")) {
    return `CC.1.2.${grade}.F`;
  }
  if (haystack.includes(".b") || haystack.includes("informational") || haystack.includes("main idea") || haystack.includes("central idea") || haystack.includes("claim")) {
    return `CC.1.2.${grade}.${letter}`;
  }
  if (haystack.includes("phonics") || haystack.includes("fluency") || haystack.includes("foundational")) {
    return `CC.1.1.${grade}.E`;
  }
  return `CC.1.2.${grade}.${letter}`;
}

function inferStandardLetter(haystack: string) {
  if (haystack.includes("main idea") || haystack.includes("central idea") || haystack.includes("theme")) return "A";
  if (haystack.includes("evidence") || haystack.includes("inference") || haystack.includes("infer") || haystack.includes("claim")) return "B";
  if (haystack.includes("structure") || haystack.includes("sequence") || haystack.includes("cause") || haystack.includes("compare")) return "E";
  if (haystack.includes("vocab") || haystack.includes("word") || haystack.includes("figurative") || haystack.includes("context")) return "F";
  if (haystack.includes("point of view") || haystack.includes("purpose")) return "D";
  return "B";
}

function inferStandardLabel(rawCode: string, question: string) {
  const haystack = `${rawCode} ${question}`.toLowerCase();
  if (haystack.includes("theme")) return "Theme and central message";
  if (haystack.includes("main idea") || haystack.includes("central idea")) return "Main idea and supporting details";
  if (haystack.includes("vocab") || haystack.includes("word") || haystack.includes("context")) return "Vocabulary and context clues";
  if (haystack.includes("convention") || haystack.includes("punctuation") || haystack.includes("sentence")) return "Writing conventions";
  if (haystack.includes("structure")) return "Text structure";
  return "Text analysis and evidence";
}

function nonEmpty(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function preserveExistingTdaExemplars(sampler: GradeSampler): GradeSampler {
  const existing = loadExistingTda(sampler.grade);
  if (!existing) return sampler;
  const passageId = findMatchingPassageId(sampler, existing.passage.title) || `g${sampler.grade}-tda-passage`;
  const passages = sampler.passages.some((passage) => passage.id === passageId)
    ? sampler.passages.map((passage) => passage.id === passageId
      ? { ...passage, title: existing.passage.title, genre: passage.genre || "literary", wordCount: wordCount(existing.passage.content), text: existing.passage.content }
      : passage)
    : [
        ...sampler.passages,
        {
          id: passageId,
          title: existing.passage.title,
          genre: "literary" as const,
          wordCount: wordCount(existing.passage.content),
          text: existing.passage.content,
        },
      ];
  return {
    ...sampler,
    passages,
    tdaPrompts: [
      {
        id: `g${sampler.grade}-tda-1`,
        passageId,
        prompt: existing.prompt,
        rubricVersion: existing.rubric_version,
        scoredExemplars: existing.exemplars,
      },
      ...sampler.tdaPrompts.filter((prompt) => normalize(prompt.prompt) !== normalize(existing.prompt)),
    ],
  };
}

function loadExistingTda(grade: number): ExistingTda | null {
  const existingPath = path.join(EXTRACTED_DIR, `grade-${grade}`, "tda-rubric-exemplars.json");
  if (!existsSync(existingPath)) return null;
  return JSON.parse(readFileSync(existingPath, "utf8")) as ExistingTda;
}

function findMatchingPassageId(sampler: GradeSampler, title: string) {
  const normalizedTitle = normalize(title);
  return sampler.passages.find((passage) => normalize(passage.title) === normalizedTitle)?.id;
}

function validateSamplers(grades: number[]) {
  let totalMc = 0;
  let totalTda = 0;
  let totalPassages = 0;
  const malformedStandards: Array<{ grade: number; id: string; standardCode: string }> = [];

  for (const grade of grades) {
    const samplerPath = path.join(EXTRACTED_DIR, `grade-${grade}`, "sampler.json");
    if (!existsSync(samplerPath)) throw new Error(`Missing sampler JSON: ${samplerPath}`);
    const sampler = gradeSamplerSchema.parse(JSON.parse(readFileSync(samplerPath, "utf8")));
    totalMc += sampler.multipleChoiceItems.length;
    totalTda += sampler.tdaPrompts.length;
    totalPassages += sampler.passages.length;
    for (const item of sampler.multipleChoiceItems) {
      if (!standardCodeSchema.safeParse(item.standardCode).success) {
        malformedStandards.push({ grade, id: item.id, standardCode: item.standardCode });
      }
    }
    console.log(`Validated grade ${grade}: ${sampler.passages.length} passages, ${sampler.multipleChoiceItems.length} MC, ${sampler.tdaPrompts.length} TDA`);
  }

  if (malformedStandards.length) {
    console.warn("Malformed standard codes:", malformedStandards);
  }
  if (totalMc < 40 || totalTda < 6 || totalPassages < 6) {
    throw new Error(`Corpus too small: ${totalMc} MC, ${totalTda} TDA, ${totalPassages} passages.`);
  }
  console.log(`Corpus totals: ${totalPassages} passages, ${totalMc} MC items, ${totalTda} TDA prompts.`);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
