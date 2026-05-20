import { z } from "zod";

const shortText = z.string().min(1).max(240);
const mediumText = z.string().min(1).max(700);
const passageText = z.string().min(650).max(2200);

const rationalePairSchema = z.object({
  choice: shortText,
  whyWrong: mediumText,
});

const optionRationaleSchema = z.object({
  option: shortText,
  whyWrong: mediumText,
});

export const hotTextWordBracketPattern = /\[\s*([^/\]]+)\s*\/\s*([^/\]]+)\s*\]/g;

export function parseHotTextWordBrackets(sentence: string) {
  return Array.from(sentence.matchAll(hotTextWordBracketPattern)).map((match) => ({
    raw: match[0],
    options: [match[1].trim(), match[2].trim()] as [string, string],
  }));
}

function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function sameText(a: string, b: string) {
  return normalized(a) === normalized(b);
}

function normalizedPhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, "\"")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const baseItemSchema = z.object({
  question: mediumText,
  passage: passageText.nullable(),
  rightAnswerRationale: mediumText,
  coachHint: mediumText,
});

export const multipleChoiceItemSchema = baseItemSchema.extend({
  type: z.literal("mc"),
  choices: z.array(shortText).length(4),
  correctAnswer: shortText,
  distractorRationale: z.array(rationalePairSchema).min(3),
});

export const inlineDropdownItemSchema = baseItemSchema.extend({
  type: z.literal("inline-dropdown"),
  sentence: mediumText,
  dropdownOptions: z.array(shortText).min(2).max(4),
  correctOption: shortText,
  distractorRationale: z.array(optionRationaleSchema).min(2),
});

export const hotTextWordItemSchema = baseItemSchema.extend({
  type: z.literal("hot-text-word"),
  sentence: mediumText,
  bracketPairs: z.array(z.object({
    options: z.array(shortText).length(2),
    correct: shortText,
  })).min(1),
});

export const hotTextPhraseItemSchema = baseItemSchema.extend({
  type: z.literal("hot-text-phrase"),
  passage: passageText,
  selectablePhrases: z.array(shortText).min(2),
  correctPhrases: z.array(shortText).min(1),
  minSelect: z.number().int().positive(),
  maxSelect: z.number().int().positive(),
});

export const hotTextSentenceItemSchema = baseItemSchema.extend({
  type: z.literal("hot-text-sentence"),
  paragraph: z.string().min(1).max(1600),
  sentenceCount: z.number().int().positive(),
  correctSentenceNumber: z.number().int().positive(),
});

export const dragDropTableItemSchema = baseItemSchema.extend({
  type: z.literal("drag-drop-table"),
  draggableItems: z.array(shortText).min(2),
  columns: z.array(shortText).min(2),
  correctMapping: z.array(z.object({
    item: shortText,
    column: shortText,
  })).min(1),
});

export const dragDropOrderItemSchema = baseItemSchema.extend({
  type: z.literal("drag-drop-order"),
  draggableItems: z.array(shortText).min(2),
  correctOrder: z.array(shortText).min(2),
});

export const evidenceMappingItemSchema = baseItemSchema.extend({
  type: z.literal("evidence-mapping"),
  passage: passageText,
  claims: z.array(shortText).min(1),
  evidenceItems: z.array(shortText).min(2),
  correctMapping: z.array(z.object({
    claim: shortText,
    evidenceItems: z.array(shortText).min(1),
  })).min(1),
});

export const multiSelectItemSchema = baseItemSchema.extend({
  type: z.literal("multi-select"),
  choices: z.array(shortText).min(3),
  correctAnswers: z.array(shortText).min(1),
  minSelect: z.number().int().positive(),
  maxSelect: z.number().int().positive(),
  partialCreditRule: z.enum(["all-or-nothing", "per-correct"]),
});

export const twoPartEbsrItemSchema = baseItemSchema.extend({
  type: z.literal("two-part-ebsr"),
  partA: z.object({
    question: mediumText,
    choices: z.array(shortText).min(2),
    correctAnswer: shortText,
  }),
  partB: z.object({
    question: mediumText,
    choices: z.array(shortText).min(2),
    correctAnswers: z.array(shortText).min(1),
  }),
  scoringRule: z.enum(["B-counts-only-if-A-correct", "independent"]),
});

export const practiceQuestionStructuredOutputSchema = z.discriminatedUnion("type", [
  multipleChoiceItemSchema,
  inlineDropdownItemSchema,
  hotTextWordItemSchema,
  hotTextPhraseItemSchema,
  hotTextSentenceItemSchema,
  dragDropTableItemSchema,
  dragDropOrderItemSchema,
  evidenceMappingItemSchema,
  multiSelectItemSchema,
  twoPartEbsrItemSchema,
]);

export const practiceQuestionSchema = practiceQuestionStructuredOutputSchema.superRefine((item, ctx) => {
  if (item.type === "mc") {
    const wrongChoices = item.choices.filter((choice) => choice !== item.correctAnswer);
    for (const choice of wrongChoices) {
      const rationale = item.distractorRationale.find((entry) => entry.choice === choice);
      if (!rationale?.whyWrong?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `multiple-choice distractorRationale must include choice and whyWrong for "${choice}"`,
          path: ["distractorRationale"],
        });
      }
    }
  }
  if (item.type === "inline-dropdown") {
    const blankCount = item.sentence.match(/\[BLANK\]/g)?.length || 0;
    if (blankCount !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "inline-dropdown sentence must contain exactly one [BLANK] placeholder", path: ["sentence"] });
    }
    if (/\[\s*\]/.test(item.sentence)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "inline-dropdown sentence must not contain empty [ ] placeholders; use [BLANK] at the blank location", path: ["sentence"] });
    }
    if (!item.dropdownOptions.some((option) => sameText(option, item.correctOption))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "inline-dropdown correctOption must appear in dropdownOptions", path: ["correctOption"] });
    }
    for (const option of item.dropdownOptions.filter((option) => !sameText(option, item.correctOption))) {
      const rationale = item.distractorRationale.find((entry) => sameText(entry.option, option));
      if (!rationale?.whyWrong?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `inline-dropdown distractorRationale must include option and whyWrong for "${option}"`,
          path: ["distractorRationale"],
        });
      }
    }
  }
  if (item.type === "hot-text-word") {
    const parsedBrackets = parseHotTextWordBrackets(item.sentence);
    const bracketBlockCount = item.sentence.match(/\[[^\]]+\]/g)?.length || 0;
    if (bracketBlockCount !== parsedBrackets.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "hot-text-word brackets must each contain exactly 2 options separated by a single /",
        path: ["sentence"],
      });
    }
    if (parsedBrackets.length < 1 || parsedBrackets.length !== item.bracketPairs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "hot-text-word bracketPairs length must equal the number of [ X / Y ] brackets in sentence",
        path: ["bracketPairs"],
      });
    }
    parsedBrackets.forEach((bracket, index) => {
      const pair = item.bracketPairs[index];
      if (!pair) return;
      const pairOptions = pair.options.map(normalized);
      const bracketOptions = bracket.options.map(normalized);
      if (pairOptions.length !== 2 || pairOptions[0] !== bracketOptions[0] || pairOptions[1] !== bracketOptions[1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `hot-text-word bracketPairs[${index}].options must match sentence bracket ${bracket.raw}`,
          path: ["bracketPairs", index, "options"],
        });
      }
      if (!pair.options.some((option) => sameText(option, pair.correct))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `hot-text-word bracketPairs[${index}].correct must be one of its two options`,
          path: ["bracketPairs", index, "correct"],
        });
      }
    });
  }
  if (item.type === "hot-text-phrase") {
    if (!item.passage) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hot-text-phrase requires a passage", path: ["passage"] });
    }
    const normalizedPassage = normalizedPhrase(item.passage || "");
    for (const phrase of item.selectablePhrases) {
      if (!normalizedPassage.includes(normalizedPhrase(phrase))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `hot-text-phrase selectable phrase "${phrase}" must appear in the passage after punctuation normalization`,
          path: ["selectablePhrases"],
        });
      }
    }
    for (const phrase of item.correctPhrases) {
      if (!item.selectablePhrases.some((selectable) => sameText(selectable, phrase))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `hot-text-phrase correct phrase "${phrase}" must appear in selectablePhrases`, path: ["correctPhrases"] });
      }
    }
    if (item.minSelect > item.maxSelect || item.maxSelect > item.selectablePhrases.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hot-text-phrase selection bounds must fit selectablePhrases", path: ["maxSelect"] });
    }
  }
  if (item.type === "evidence-mapping") {
    if (!item.passage || item.correctMapping.some((entry) => entry.evidenceItems.length < 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "evidence-mapping requires passage and at least 1 evidence per claim", path: ["correctMapping"] });
    }
    for (const entry of item.correctMapping) {
      if (!item.claims.some((claim) => sameText(claim, entry.claim))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `evidence-mapping correctMapping claim "${entry.claim}" must exist in claims`, path: ["correctMapping"] });
      }
      for (const evidence of entry.evidenceItems) {
        if (!item.evidenceItems.some((candidate) => sameText(candidate, evidence))) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `evidence-mapping evidence "${evidence}" must exist in evidenceItems`, path: ["correctMapping"] });
        }
      }
    }
  }
  if (item.type === "hot-text-sentence") {
    if (!item.paragraph || item.sentenceCount < 3 || !/\(\s*1\s*\)/.test(item.paragraph)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hot-text-sentence requires a paragraph with >=3 numbered sentences", path: ["paragraph"] });
    }
    if (item.correctSentenceNumber < 1 || item.correctSentenceNumber > item.sentenceCount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hot-text-sentence correctSentenceNumber must be between 1 and sentenceCount", path: ["correctSentenceNumber"] });
    }
  }
  if (item.type === "drag-drop-table") {
    for (const draggable of item.draggableItems) {
      const mapping = item.correctMapping.find((entry) => sameText(entry.item, draggable));
      if (!mapping) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `drag-drop-table item "${draggable}" must have a correctMapping entry`, path: ["correctMapping"] });
      } else if (!item.columns.some((column) => sameText(column, mapping.column))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `drag-drop-table mapping for "${draggable}" must use an existing column`, path: ["correctMapping"] });
      }
    }
    for (const mapping of item.correctMapping) {
      if (!item.draggableItems.some((draggable) => sameText(draggable, mapping.item))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `drag-drop-table mapped item "${mapping.item}" must exist in draggableItems`, path: ["correctMapping"] });
      }
    }
  }
});

const lessonV2Shape = {
  gradeLevel: z.number().int().min(3).max(8),
  standardCode: z.string().regex(/^CC\.1\.[1-4]\.[3-8]\.[A-Z][A-Z0-9]?$/),
  standardLabel: shortText,
  skill: shortText,
  title: shortText,
  whyAssigned: mediumText,
  hook: z.string().min(220).max(800),
  explanation: z.string().min(1250).max(2600),
  workedExample: z.string().min(620).max(1400),
  commonErrors: z.array(mediumText).min(3).max(5),
  sentenceFrames: z.array(mediumText).min(3).max(5),
  successCriteria: z.array(mediumText).min(3).max(5),
  guidedPractice: z.array(practiceQuestionStructuredOutputSchema).length(3),
  independentPractice: z.array(practiceQuestionStructuredOutputSchema).length(4),
  exitTicket: z.array(practiceQuestionStructuredOutputSchema).length(2),
  masteryCheck: z.array(practiceQuestionStructuredOutputSchema).length(3),
  heroResourceLinkId: z.string().nullable(),
  resourceTitle: z.string().nullable(),
  resourceUrl: z.string().nullable(),
  resourceProvider: z.string().nullable(),
  resourceDescription: z.string().nullable(),
  exemplarsUsed: z.array(shortText),
  teiTypesUsed: z.array(shortText),
  generatorVersion: z.literal("V2"),
  qualityScore: z.number().int().min(0).max(100),
  qualityIssues: z.array(z.string()),
};

export const lessonV2StructuredOutputSchema = z.object(lessonV2Shape);

export const lessonV2Schema = lessonV2StructuredOutputSchema.extend({
  guidedPractice: z.array(practiceQuestionSchema).length(3),
  independentPractice: z.array(practiceQuestionSchema).length(4),
  exitTicket: z.array(practiceQuestionSchema).length(2),
  masteryCheck: z.array(practiceQuestionSchema).length(3),
});

export type PracticeQuestionV2 = z.infer<typeof practiceQuestionSchema>;
export type LessonV2 = z.infer<typeof lessonV2Schema>;

export const practiceSections = ["guidedPractice", "independentPractice", "exitTicket", "masteryCheck"] as const;

export function allPracticeQuestions(lesson: Pick<LessonV2, (typeof practiceSections)[number]>): PracticeQuestionV2[] {
  return practiceSections.flatMap((section) => lesson[section]);
}
