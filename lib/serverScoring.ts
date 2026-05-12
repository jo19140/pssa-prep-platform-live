type ScoreResult = {
  isCorrect: boolean;
  scorePointsEarned: number;
  maxPoints: number;
  errorPattern: string;
};

export function scoreAssessmentQuestion(question: Record<string, any>, answerPayload: Record<string, any>): ScoreResult {
  const type = String(question.type || question.questionType || "").toUpperCase();

  if (type === "MCQ" || type === "CONVENTIONS") {
    const isCorrect = Number(answerPayload.selectedIndex) === Number(question.correctIndex);
    return { isCorrect, scorePointsEarned: isCorrect ? 1 : 0, maxPoints: 1, errorPattern: isCorrect ? "none" : "general_misread" };
  }

  if (type === "EBSR") {
    const partACorrect = Number(answerPayload.partAIndex) === Number(question.partACorrectIndex);
    const partBCorrect = sameNumberSet(answerPayload.partBIndices, question.partBCorrectIndices);
    const scorePointsEarned = (partACorrect ? 1 : 0) + (partBCorrect ? 1 : 0);
    return {
      isCorrect: partACorrect && partBCorrect,
      scorePointsEarned,
      maxPoints: 2,
      errorPattern: partACorrect && partBCorrect
        ? "none"
        : partACorrect
          ? "part_a_correct_but_evidence_wrong"
          : partBCorrect
            ? "part_a_wrong_even_with_some_evidence_match"
            : "ebsr_double_miss_in_claim_and_evidence",
    };
  }

  if (type === "HOT_TEXT") {
    const correctSpanIndices = toNumberArray(question.correctSpanIndices);
    const isCorrect = correctSpanIndices.includes(Number(answerPayload.selectedSpanIndex));
    return { isCorrect, scorePointsEarned: isCorrect ? 1 : 0, maxPoints: 1, errorPattern: isCorrect ? "none" : "selected_related_sentence_not_best_text_evidence" };
  }

  if (type === "MULTI_SELECT") {
    const isCorrect = sameNumberSet(answerPayload.selectedIndices, question.correctIndices);
    return { isCorrect, scorePointsEarned: isCorrect ? 1 : 0, maxPoints: 1, errorPattern: isCorrect ? "none" : "partial_or_incorrect_multi_select_combination" };
  }

  if (type === "DRAG_DROP") {
    const correctMapping = isRecord(question.correctMapping) ? question.correctMapping : {};
    const mapping = isRecord(answerPayload.mapping) ? answerPayload.mapping : {};
    const itemIds = Object.keys(correctMapping);
    const scorePointsEarned = itemIds.filter((id) => String(mapping[id] || "") === String(correctMapping[id] || "")).length;
    const isCorrect = itemIds.length > 0 && scorePointsEarned === itemIds.length;
    return {
      isCorrect,
      scorePointsEarned,
      maxPoints: Math.max(1, itemIds.length),
      errorPattern: isCorrect ? "none" : scorePointsEarned > 0 ? "partially_sorted_drag_drop_categories" : "drag_drop_category_confusion",
    };
  }

  if (type === "SHORT_RESPONSE") {
    const response = String(answerPayload.shortResponse || "").trim();
    const lower = response.toLowerCase();
    const evidenceWords = ["because", "text", "passage", "paragraph", "author", "shows", "suggests", "implies", "infer", "clue", "evidence"].filter((word) => lower.includes(word)).length;
    const maxPoints = Math.max(1, Number(question.maxScore) || 2);
    const scorePointsEarned = response.split(/\s+/).length >= 12 && evidenceWords >= 2 ? maxPoints : evidenceWords >= 1 ? 1 : 0;
    return {
      isCorrect: scorePointsEarned >= maxPoints,
      scorePointsEarned,
      maxPoints,
      errorPattern: scorePointsEarned >= maxPoints ? "inference_justified_with_evidence" : "inference_needs_more_text_evidence",
    };
  }

  if (type === "TDA") {
    return { isCorrect: false, scorePointsEarned: 0, maxPoints: Math.max(1, Number(question.maxScore) || 4), errorPattern: "pending_tda_grading" };
  }

  return { isCorrect: false, scorePointsEarned: 0, maxPoints: 1, errorPattern: "unsupported_question_type" };
}

export function scorePracticeResponses(answers: unknown, questions: unknown) {
  const questionList = Array.isArray(questions) ? questions : [];
  const answerMap = isRecord(answers) ? answers : {};
  const results = questionList.map((question, index) => {
    const item = isRecord(question) ? question : {};
    const selected = String(answerMap[String(index)] || "").trim();
    const correct = isCorrectPracticeAnswer(item, selected);
    return {
      prompt: item.question || item.task || `Question ${index + 1}`,
      selected,
      correctAnswer: item.correctAnswer || "",
      correct,
    };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const score = results.length ? Math.round((correctCount / results.length) * 100) : 0;
  return { completed: results.length > 0, score, answers: results };
}

export function scoreArcadeResponses(responses: Record<string, any>) {
  const answers = Array.isArray(responses.answers) ? responses.answers : Array.isArray(responses.shots) ? responses.shots : [];
  const maxScore = Math.max(1, Math.min(10, answers.length || Number(responses.maxScore) || 1));
  const score = Math.max(0, Math.min(maxScore, answers.filter((answer) => {
    if (!isRecord(answer)) return false;
    const selected = normalizeText(answer.selected);
    const correctAnswer = normalizeText(answer.correctAnswer);
    return Boolean(selected && correctAnswer && selected === correctAnswer);
  }).length));
  return { score, maxScore };
}

function isCorrectPracticeAnswer(question: Record<string, any>, selected: string) {
  if (!selected) return false;
  const correct = normalizeText(question.correctAnswer);
  const selectedValue = normalizeText(selected);
  if (selectedValue === correct) return true;
  if (/^[a-d]$/.test(correct)) {
    const index = correct.charCodeAt(0) - 97;
    return normalizeText(question.choices?.[index]) === selectedValue;
  }
  return false;
}

function sameNumberSet(left: unknown, right: unknown) {
  const a = toNumberArray(left).sort((x, y) => x - y);
  const b = toNumberArray(right).sort((x, y) => x - y);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function toNumberArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
