export type QuestionType = "MCQ" | "EBSR" | "HOT_TEXT" | "MULTI_SELECT" | "DRAG_DROP";

export type Student = {
  id: string;
  name: string;
  grade: number;
  teacherName: string;
  schoolName: string;
};

export type BaseQuestion = {
  id: number;
  skill: string;
  standardCode: string;
  standardLabel: string;
  difficulty: number;
  type: QuestionType;
  passageTitle: string;
  passage: string;
  explanation: string;
  skillTip: string;
};

export type McqQuestion = BaseQuestion & {
  type: "MCQ";
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

export type Question = McqQuestion | EbsrQuestion | HotTextQuestion | MultiSelectQuestion | DragDropQuestion;

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
