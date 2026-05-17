import { z } from "zod";

const rationalePairSchema = z.object({
  choice: z.string().min(1),
  whyWrong: z.string().min(1),
});

const optionRationaleSchema = z.object({
  option: z.string().min(1),
  whyWrong: z.string().min(1),
});

const baseItemSchema = z.object({
  question: z.string().min(1),
  passage: z.string().min(900).nullable(),
  rightAnswerRationale: z.string().min(1),
  coachHint: z.string().min(1),
});

export const multipleChoiceItemSchema = baseItemSchema.extend({
  type: z.literal("mc"),
  choices: z.array(z.string().min(1)).length(4),
  correctAnswer: z.string().min(1),
  distractorRationale: z.array(rationalePairSchema).min(3),
});

export const inlineDropdownItemSchema = baseItemSchema.extend({
  type: z.literal("inline-dropdown"),
  sentence: z.string().min(1),
  dropdownOptions: z.array(z.string().min(1)).min(3).max(4),
  correctOption: z.string().min(1),
  distractorRationale: z.array(optionRationaleSchema).min(2),
});

export const hotTextWordItemSchema = baseItemSchema.extend({
  type: z.literal("hot-text-word"),
  sentence: z.string().min(1),
  bracketPairs: z.array(z.object({
    options: z.array(z.string().min(1)).length(2),
    correct: z.string().min(1),
  })).min(1),
});

export const hotTextPhraseItemSchema = baseItemSchema.extend({
  type: z.literal("hot-text-phrase"),
  passage: z.string().min(900),
  selectablePhrases: z.array(z.string().min(1)).min(2),
  correctPhrases: z.array(z.string().min(1)).min(1),
  minSelect: z.number().int().positive(),
  maxSelect: z.number().int().positive(),
});

export const hotTextSentenceItemSchema = baseItemSchema.extend({
  type: z.literal("hot-text-sentence"),
  paragraph: z.string().min(1),
  sentenceCount: z.number().int().positive(),
  correctSentenceNumber: z.number().int().positive(),
});

export const dragDropTableItemSchema = baseItemSchema.extend({
  type: z.literal("drag-drop-table"),
  draggableItems: z.array(z.string().min(1)).min(2),
  columns: z.array(z.string().min(1)).min(2),
  correctMapping: z.array(z.object({
    item: z.string().min(1),
    column: z.string().min(1),
  })).min(1),
});

export const dragDropOrderItemSchema = baseItemSchema.extend({
  type: z.literal("drag-drop-order"),
  draggableItems: z.array(z.string().min(1)).min(2),
  correctOrder: z.array(z.string().min(1)).min(2),
});

export const evidenceMappingItemSchema = baseItemSchema.extend({
  type: z.literal("evidence-mapping"),
  passage: z.string().min(900),
  claims: z.array(z.string().min(1)).min(1),
  evidenceItems: z.array(z.string().min(1)).min(2),
  correctMapping: z.array(z.object({
    claim: z.string().min(1),
    evidenceItems: z.array(z.string().min(1)).min(1),
  })).min(1),
});

export const multiSelectItemSchema = baseItemSchema.extend({
  type: z.literal("multi-select"),
  choices: z.array(z.string().min(1)).min(3),
  correctAnswers: z.array(z.string().min(1)).min(1),
  minSelect: z.number().int().positive(),
  maxSelect: z.number().int().positive(),
  partialCreditRule: z.enum(["all-or-nothing", "per-correct"]),
});

export const twoPartEbsrItemSchema = baseItemSchema.extend({
  type: z.literal("two-part-ebsr"),
  partA: z.object({
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2),
    correctAnswer: z.string().min(1),
  }),
  partB: z.object({
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2),
    correctAnswers: z.array(z.string().min(1)).min(1),
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
  standardLabel: z.string().min(1),
  skill: z.string().min(1),
  title: z.string().min(1),
  whyAssigned: z.string().min(1),
  hook: z.string().min(250),
  explanation: z.string().min(1800),
  workedExample: z.string().min(900),
  commonErrors: z.array(z.string().min(1)).min(3).max(5),
  sentenceFrames: z.array(z.string().min(1)).min(3).max(5),
  successCriteria: z.array(z.string().min(1)).min(3).max(5),
  guidedPractice: z.array(practiceQuestionSchema).length(3),
  independentPractice: z.array(practiceQuestionSchema).length(4),
  exitTicket: z.array(practiceQuestionSchema).length(2),
  masteryCheck: z.array(practiceQuestionSchema).length(3),
  heroResourceLinkId: z.string().nullable(),
  exemplarsUsed: z.array(z.string()),
  teiTypesUsed: z.array(z.string()),
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
