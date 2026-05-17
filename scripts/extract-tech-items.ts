import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import OpenAI from "openai";
import { z } from "zod";

const SCREENSHOT_DIR = process.env.PSSA_TECH_SCREENSHOT_DIR || "/Users/diaz/Desktop/Tech Questions";
const OUTPUT_PATH = path.join(process.cwd(), "reference", "pssa-tech-items", "catalog.json");
const SOURCE = "DRC INSIGHT Online Tools Training (OTT) — 2026" as const;
const MODEL = process.env.PSSA_TECH_EXTRACT_MODEL || "gpt-4o";

const itemTypes = [
  "inline-dropdown",
  "hot-text-word",
  "hot-text-sentence",
  "hot-text-phrase",
  "drag-drop-table",
  "drag-drop-order",
  "drag-drop-sort",
  "multi-select",
  "two-part-ebsr",
  "evidence-mapping",
  "constructed-response",
  "other",
] as const;

const standardCategories = ["conventions", "vocabulary", "comprehension", "writing", "tda", "unknown"] as const;

const contentSchema = z.object({
  passage: z.string().optional(),
  sentence: z.string().optional(),
  paragraph: z.string().optional(),
  bracketPairs: z.array(z.tuple([z.string(), z.string()])).optional(),
  dropdownOptions: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  targetLabel: z.string().optional(),
  choices: z.array(z.string()).optional(),
  partA: z.object({ question: z.string(), choices: z.array(z.string()) }).optional(),
  partB: z.object({ question: z.string(), choices: z.array(z.string()) }).optional(),
});

const techItemSchema = z.object({
  id: z.string().min(1),
  screenshotFile: z.string().min(1),
  grade: z.number().int().min(3).max(8),
  questionNumber: z.number().int().positive().optional(),
  itemType: z.enum(itemTypes),
  standardCategory: z.enum(standardCategories),
  standardCode: z.string().regex(/^CC\.1\.[1-4]\.[3-8]\.[A-Z][A-Z0-9]?$/).optional(),
  instructions: z.string().min(1),
  practiceHint: z.string().optional(),
  content: contentSchema,
  correctAnswer: z.unknown().optional(),
  notes: z.string().optional(),
});

const catalogSchema = z.object({
  source: z.literal(SOURCE),
  generated_at: z.string().datetime(),
  items: z.array(techItemSchema).min(1),
});

type TechItem = z.infer<typeof techItemSchema>;

type RawTechItem = Omit<Partial<TechItem>, "content"> & {
  content?: Partial<z.infer<typeof contentSchema>> | null;
};

const itemJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["grade", "itemType", "standardCategory", "instructions", "content"],
  properties: {
    grade: { type: "integer", minimum: 3, maximum: 8 },
    questionNumber: { type: ["integer", "null"], minimum: 1 },
    itemType: { type: "string", enum: itemTypes },
    standardCategory: { type: "string", enum: standardCategories },
    standardCode: { type: ["string", "null"] },
    instructions: { type: "string" },
    practiceHint: { type: ["string", "null"] },
    content: {
      type: "object",
      additionalProperties: false,
      properties: {
        passage: { type: ["string", "null"] },
        sentence: { type: ["string", "null"] },
        paragraph: { type: ["string", "null"] },
        bracketPairs: {
          type: ["array", "null"],
          items: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 2,
          },
        },
        dropdownOptions: { type: ["array", "null"], items: { type: "string" } },
        sources: { type: ["array", "null"], items: { type: "string" } },
        targetLabel: { type: ["string", "null"] },
        choices: { type: ["array", "null"], items: { type: "string" } },
        partA: {
          type: ["object", "null"],
          additionalProperties: false,
          required: ["question", "choices"],
          properties: {
            question: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
          },
        },
        partB: {
          type: ["object", "null"],
          additionalProperties: false,
          required: ["question", "choices"],
          properties: {
            question: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    correctAnswer: {},
    notes: { type: ["string", "null"] },
  },
};

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--validate-only")) {
    validateCatalog();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required to extract screenshot content.");
  const openai = new OpenAI({ apiKey });
  const files = listScreenshotFiles();
  if (files.length !== 53) console.warn(`Expected 53 PNG screenshots, found ${files.length}. Continuing with discovered PNGs.`);

  const extracted: RawTechItem[] = [];
  for (const [index, screenshotFile] of files.entries()) {
    console.log(`Extracting ${index + 1}/${files.length}: ${screenshotFile}`);
    extracted.push(await extractScreenshot(openai, screenshotFile));
  }

  const items = assignIds(extracted.map((item, index) => normalizeItem(item, files[index])));
  const catalog = catalogSchema.parse({
    source: SOURCE,
    generated_at: new Date().toISOString(),
    items,
  });

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`\nWrote ${path.relative(process.cwd(), OUTPUT_PATH)} with ${catalog.items.length} items.`);
  printSummary(catalog.items);
}

function listScreenshotFiles() {
  return readdirSync(SCREENSHOT_DIR)
    .filter((file) => file.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function extractScreenshot(openai: OpenAI, screenshotFile: string): Promise<RawTechItem> {
  const absolutePath = path.join(SCREENSHOT_DIR, screenshotFile);
  const image = readFileSync(absolutePath);
  const response = await openai.responses.create({
    model: MODEL,
    temperature: 0,
    max_output_tokens: 2500,
    instructions: [
      "You extract structured examples of PSSA technology-enhanced ELA items from DRC INSIGHT Online Tools Training screenshots.",
      "Use only visible text and UI structure in the screenshot. Do not invent answer keys. If a correct answer is not visibly derivable, set correctAnswer to null or omit it.",
      "Read the top-left header to determine grade, usually formatted like ELA Grade X OTT.",
      "Read the Question dropdown for questionNumber when visible.",
      "Choose itemType from the controlled vocabulary. Use inline-dropdown for blanks with dropdown menus, hot-text-* for selectable text, drag-drop-* for moveable tiles/ordering/sorting/table interactions, two-part-ebsr for Part A/Part B evidence items, constructed-response for open writing responses, and other only when none fit.",
      "standardCategory should be based on content: conventions for grammar/spelling/punctuation/capitalization, vocabulary for word meaning/context, comprehension for reading/inference/main idea/evidence, writing for revision/organization, tda for text-dependent analysis essays, unknown if unclear.",
      "Transcribe instructions and practiceHint as exactly as possible. The practiceHint is usually italicized in parentheses.",
      "For bracketed hot-text word items, put visible word-pair alternatives in bracketPairs. For drag/drop items, put draggable source text in sources and the visible target label in targetLabel. For EBSR items, split Part A and Part B.",
      "If a PA Core standard is inferable, use CC.1.x.grade.letter format; otherwise omit standardCode.",
    ].join("\n"),
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: `Extract this screenshot into the schema. Filename: ${screenshotFile}` },
          {
            type: "input_image",
            image_url: `data:image/png;base64,${image.toString("base64")}`,
            detail: "high",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "pssa_tech_item",
        strict: false,
        schema: itemJsonSchema,
      },
    },
  });
  if (!response.output_text) throw new Error(`No JSON returned for ${screenshotFile}. Response id: ${response.id}`);
  return JSON.parse(response.output_text) as RawTechItem;
}

function normalizeItem(raw: RawTechItem, screenshotFile: string): TechItem {
  const grade = normalizeGrade(raw.grade);
  const content = cleanContent(raw.content || {});
  const standardCode = normalizeStandardCode(raw.standardCode, grade);
  return techItemSchema.parse({
    id: "pending",
    screenshotFile,
    grade,
    questionNumber: normalizePositiveInt(raw.questionNumber),
    itemType: itemTypes.includes(raw.itemType as any) ? raw.itemType : "other",
    standardCategory: standardCategories.includes(raw.standardCategory as any) ? raw.standardCategory : "unknown",
    standardCode,
    instructions: cleanString(raw.instructions) || "Instructions not visible in screenshot.",
    practiceHint: cleanString(raw.practiceHint),
    content,
    correctAnswer: raw.correctAnswer ?? undefined,
    notes: cleanString(raw.notes),
  });
}

function assignIds(items: TechItem[]) {
  const counts = new Map<number, number>();
  return items.map((item) => {
    const next = (counts.get(item.grade) || 0) + 1;
    counts.set(item.grade, next);
    return { ...item, id: `g${item.grade}-tei-${next}` };
  });
}

function cleanContent(content: Partial<z.infer<typeof contentSchema>>) {
  const cleaned: Record<string, unknown> = {};
  for (const key of ["passage", "sentence", "paragraph", "targetLabel"] as const) {
    const value = cleanString(content[key]);
    if (value) cleaned[key] = value;
  }
  for (const key of ["dropdownOptions", "sources", "choices"] as const) {
    const values = cleanStringArray(content[key]);
    if (values.length) cleaned[key] = values;
  }
  const bracketPairs = Array.isArray(content.bracketPairs)
    ? content.bracketPairs
        .map((pair) => Array.isArray(pair) ? [cleanString(pair[0]), cleanString(pair[1])] as [string, string] : null)
        .filter((pair): pair is [string, string] => Boolean(pair?.[0] && pair?.[1]))
    : [];
  if (bracketPairs.length) cleaned.bracketPairs = bracketPairs;
  if (content.partA?.question) cleaned.partA = { question: cleanString(content.partA.question), choices: cleanStringArray(content.partA.choices) };
  if (content.partB?.question) cleaned.partB = { question: cleanString(content.partB.question), choices: cleanStringArray(content.partB.choices) };
  return cleaned;
}

function normalizeGrade(value: unknown) {
  const grade = Math.round(Number(value));
  return grade >= 3 && grade <= 8 ? grade : 3;
}

function normalizePositiveInt(value: unknown) {
  const number = Math.round(Number(value));
  return number > 0 ? number : undefined;
}

function normalizeStandardCode(value: unknown, grade: number) {
  const text = cleanString(value);
  if (!text) return undefined;
  const match = text.match(/^CC\.1\.[1-4]\.[3-8]\.[A-Z][A-Z0-9]?$/i);
  if (!match) return undefined;
  return text.replace(/CC\.1\.([1-4])\.[3-8]\./i, `CC.1.$1.${grade}.`).toUpperCase();
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

function validateCatalog() {
  const catalog = catalogSchema.parse(JSON.parse(readFileSync(OUTPUT_PATH, "utf8")));
  printSummary(catalog.items);
  const itemTypesFound = new Set(catalog.items.map((item) => item.itemType));
  const gradesFound = new Set(catalog.items.map((item) => item.grade));
  if (itemTypesFound.size < 6) throw new Error(`Expected at least 6 distinct item types, found ${itemTypesFound.size}.`);
  for (const grade of [3, 5, 7]) {
    if (!gradesFound.has(grade)) throw new Error(`Expected grade distribution to include grade ${grade}.`);
  }
}

function printSummary(items: TechItem[]) {
  console.log("\n=== Count per item type ===");
  printCounts(items.map((item) => item.itemType));
  console.log("\n=== Count per grade ===");
  printCounts(items.map((item) => `Grade ${item.grade}`));
}

function printCounts(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  for (const [value, count] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log(`  ${value}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
