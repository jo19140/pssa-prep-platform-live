export type QuestionType = "TDA" | "CONVENTIONS" | "MCQ" | "EBSR" | "MULTI_SELECT" | "HOT_TEXT" | "DRAG_DROP" | "SHORT_RESPONSE";

export type Student = {
  id: string;
  name: string;
  grade: number;
  teacherName: string;
  schoolName: string;
};

export type BaseQuestion = {
  id: number;
  passageId?: string;
  passageType?: string;
  skill: string;
  standardCode: string;
  standardLabel: string;
  gradeLevel?: number;
  difficulty: number;
  type: QuestionType;
  passageTitle: string;
  passage: string;
  passageMetadata?: Record<string, unknown>;
  tableData?: {
    title: string;
    columns: string[];
    rows: string[][];
  };
  explanation: string;
  skillTip: string;
  correctAnswer?: unknown;
};

export type McqQuestion = BaseQuestion & {
  type: "MCQ" | "CONVENTIONS";
  question: string;
  choices: string[];
  correctIndex: number;
  distractorRationale: string[];
};

export type EbsrQuestion = BaseQuestion & {
  type: "EBSR";
  partAQuestion: string;
  partAChoices: string[];
  partACorrectIndex: number;
  partBQuestion: string;
  partBChoices: string[];
  partBCorrectIndices: number[];
};

export type HotTextQuestion = BaseQuestion & {
  type: "HOT_TEXT";
  hotTextPrompt: string;
  selectableSpans: string[];
  correctSpanIndices: number[];
  distractorRationale: string[];
};

export type MultiSelectQuestion = BaseQuestion & {
  type: "MULTI_SELECT";
  question: string;
  choices: string[];
  correctIndices: number[];
  distractorRationale: string[];
};

export type DragDropQuestion = BaseQuestion & {
  type: "DRAG_DROP";
  dragDropPrompt: string;
  categories: string[];
  dragItems: { id: string; text: string }[];
  correctMapping: Record<string, string>;
  distractorRationale: string;
};

export type TdaQuestion = BaseQuestion & {
  type: "TDA";
  prompt: string;
  rubric: string;
  maxScore: number;
};

export type ShortResponseQuestion = BaseQuestion & {
  type: "SHORT_RESPONSE";
  prompt: string;
  sampleAnswer: string;
  maxScore: number;
};

export type Question = McqQuestion | EbsrQuestion | HotTextQuestion | MultiSelectQuestion | DragDropQuestion | TdaQuestion | ShortResponseQuestion;

export type ResponseRecord = {
  questionId: number;
  skill: string;
  standardCode: string;
  standardLabel: string;
  questionType: QuestionType;
  difficulty: number;
  isCorrect: boolean;
  scorePointsEarned: number;
  maxPoints: number;
  errorPattern: string;
  timeSpentSec: number;
  [key: string]: unknown;
};
