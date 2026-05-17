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
  dropdownOptions: z.array(shortText).min(3).max(4),
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
  if (item.type === "inline-dropdown" && !item.sentence.includes("[BLANK]")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "inline-dropdown sentence must contain [BLANK] placeholder", path: ["sentence"] });
  }
  if (item.type === "hot-text-word" && (item.bracketPairs.length < 1 || !/\[\s*[^/\]]+\s*\/\s*[^\]]+\]/.test(item.sentence))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hot-text-word requires bracket pairs and matching sentence syntax", path: ["sentence"] });
  }
  if (item.type === "hot-text-phrase" && !item.passage) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hot-text-phrase requires a passage", path: ["passage"] });
  }
  if (item.type === "evidence-mapping" && (!item.passage || item.correctMapping.some((entry) => entry.evidenceItems.length < 1))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "evidence-mapping requires passage and at least 1 evidence per claim", path: ["correctMapping"] });
  }
  if (item.type === "hot-text-sentence" && (!item.paragraph || item.sentenceCount < 3 || !/\(\s*1\s*\)/.test(item.paragraph))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "hot-text-sentence requires a paragraph with >=3 numbered sentences", path: ["paragraph"] });
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
