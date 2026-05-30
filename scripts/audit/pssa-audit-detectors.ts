export type RuleResult = "PASS" | "FAIL" | "SKIP";

export type McqAuditInput = {
  id?: string;
  itemId?: string;
  itemType?: string;
  questionType?: string;
  correctIndex?: number | null;
  choices?: string[];
  answerChoicesJson?: string[];
  studentFacingPrompt?: string;
};

export type McqCorrectIsLongestRow = {
  scope: "item" | "batch";
  itemId: string;
  totalMcq: number;
  correctLongestCount: number;
  correctLongestPct: number;
  correctIndex: number | string;
  correctWordLength: number | string;
  longestDistractorWordLength: number | string;
  correctCharLength: number | string;
  longestDistractorCharLength: number | string;
  severity: "INFO" | "WARNING" | "BLOCKER";
  result: RuleResult;
  notes: string;
};

export type McqAbsoluteLanguageRow = {
  itemId: string;
  choiceIndex: number;
  term: string;
  isCorrectChoice: boolean;
  severity: "INFO" | "WARNING" | "BLOCKER";
  result: RuleResult;
  notes: string;
};

export function buildMcqCorrectIsLongestReport(items: McqAuditInput[], batchThreshold = 0.35): McqCorrectIsLongestRow[] {
  const mcqs = items.map(toMcq).filter((item) => item.correctIndex !== null && item.choices.length === 4);
  const rows: McqCorrectIsLongestRow[] = [];
  for (const item of mcqs) {
    const lengths = item.choices.map((choice) => ({ words: wordCount(choice), chars: choice.length }));
    const correct = lengths[item.correctIndex as number];
    const distractors = lengths.filter((_, index) => index !== item.correctIndex);
    const longestDistractorWords = Math.max(...distractors.map((entry) => entry.words));
    const longestDistractorChars = Math.max(...distractors.map((entry) => entry.chars));
    const singleLongestWords = lengths.filter((entry) => entry.words >= correct.words).length === 1;
    const singleLongestChars = lengths.filter((entry) => entry.chars >= correct.chars).length === 1;
    const wordDelta = correct.words - longestDistractorWords;
    const charDeltaPct = longestDistractorChars ? (correct.chars - longestDistractorChars) / longestDistractorChars : 0;
    const blocker = (singleLongestWords && wordDelta >= 2) || (singleLongestChars && charDeltaPct >= 0.15);
    const warning = !blocker && singleLongestWords && wordDelta === 1;
    rows.push({
      scope: "item",
      itemId: item.itemId,
      totalMcq: 1,
      correctLongestCount: singleLongestWords || singleLongestChars ? 1 : 0,
      correctLongestPct: singleLongestWords || singleLongestChars ? 1 : 0,
      correctIndex: item.correctIndex as number,
      correctWordLength: correct.words,
      longestDistractorWordLength: longestDistractorWords,
      correctCharLength: correct.chars,
      longestDistractorCharLength: longestDistractorChars,
      severity: blocker ? "BLOCKER" : warning ? "WARNING" : "INFO",
      result: blocker ? "FAIL" : "PASS",
      notes: blocker
        ? `PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by ${wordDelta} words and ${Math.round(charDeltaPct * 100)}% chars.`
        : warning
          ? "PSSA_MCQ_CORRECT_IS_LONGEST warning: correct choice is single longest by 1 word."
          : "Correct choice length is within threshold.",
    });
  }
  const correctLongestCount = rows.filter((row) => row.correctLongestCount > 0).length;
  const correctLongestPct = mcqs.length ? round(correctLongestCount / mcqs.length) : 0;
  rows.push({
    scope: "batch",
    itemId: "batch",
    totalMcq: mcqs.length,
    correctLongestCount,
    correctLongestPct,
    correctIndex: "",
    correctWordLength: "",
    longestDistractorWordLength: "",
    correctCharLength: "",
    longestDistractorCharLength: "",
    severity: correctLongestPct > batchThreshold ? "BLOCKER" : rows.some((row) => row.severity === "WARNING") ? "WARNING" : "INFO",
    result: correctLongestPct > batchThreshold ? "FAIL" : "PASS",
    notes: correctLongestPct > batchThreshold
      ? `PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest in ${Math.round(correctLongestPct * 100)}% of MCQs.`
      : "Batch correct-longest rate within threshold.",
  });
  return rows;
}

export function buildMcqAbsoluteLanguageDistractorReport(items: McqAuditInput[]): McqAbsoluteLanguageRow[] {
  const rows: McqAbsoluteLanguageRow[] = [];
  for (const item of items.map(toMcq).filter((entry) => entry.correctIndex !== null && entry.choices.length === 4)) {
    item.choices.forEach((choice, choiceIndex) => {
      for (const term of absoluteTerms(choice)) {
        const isCorrectChoice = choiceIndex === item.correctIndex;
        rows.push({
          itemId: item.itemId,
          choiceIndex,
          term,
          isCorrectChoice,
          severity: isCorrectChoice ? "WARNING" : "BLOCKER",
          result: isCorrectChoice ? "PASS" : "FAIL",
          notes: isCorrectChoice
            ? `Correct answer contains absolute term "${term}"; human review required.`
            : `PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR: distractor contains "${term}".`,
        });
      }
    });
  }
  return rows.length ? rows : [{
    itemId: "batch",
    choiceIndex: -1,
    term: "",
    isCorrectChoice: false,
    severity: "INFO",
    result: "PASS",
    notes: "No absolute-language distractors found.",
  }];
}

function toMcq(raw: McqAuditInput) {
  return {
    itemId: String(raw.itemId ?? raw.id ?? ""),
    correctIndex: typeof raw.correctIndex === "number" ? raw.correctIndex : null,
    choices: (raw.answerChoicesJson ?? raw.choices ?? []).map(String),
  };
}

function absoluteTerms(value: string) {
  return [...new Set((value.match(/\b(?:never|always|only|every|all|none|must|cannot)\b/gi) ?? []).map((match) => match.toLowerCase()))];
}

function wordCount(value: string) {
  return (value.match(/[A-Za-z0-9']+/g) ?? []).length;
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}
