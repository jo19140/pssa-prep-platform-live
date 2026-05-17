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

export const practiceQuestionSchema = z.discriminatedUnion("type", [
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

export const lessonV2Schema = z.object({
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
  guidedPractice: z.array(practiceQuestionSchema).length(3),
  independentPractice: z.array(practiceQuestionSchema).length(4),
  exitTicket: z.array(practiceQuestionSchema).length(2),
  masteryCheck: z.array(practiceQuestionSchema).length(3),
  heroResourceLinkId: z.string().nullable(),
  exemplarsUsed: z.array(shortText),
  teiTypesUsed: z.array(shortText),
  generatorVersion: z.literal("V2"),
  qualityScore: z.number().int().min(0).max(100),
  qualityIssues: z.array(z.string()),
});

export type PracticeQuestionV2 = z.infer<typeof practiceQuestionSchema>;
export type LessonV2 = z.infer<typeof lessonV2Schema>;

export const practiceSections = ["guidedPractice", "independentPractice", "exitTicket", "masteryCheck"] as const;

export function allPracticeQuestions(lesson: Pick<LessonV2, (typeof practiceSections)[number]>): PracticeQuestionV2[] {
  return practiceSections.flatMap((section) => lesson[section]);
}
