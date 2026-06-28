export type SpellingFlowState = {
  index: number;
  answer: string;
  results: Record<string, boolean>;
  revealedResult: boolean | null;
  completed: boolean;
};

export type SpellingFlowAction =
  | { type: "set_answer"; answer: string }
  | { type: "append_letter"; letter: string }
  | { type: "clear" }
  | { type: "primary" };

export type SpellingFlowContext = {
  words: string[];
};

export type SpellingFlowCompletion = {
  spellingCorrect: number;
  spellingTotal: number;
};

export function createInitialSpellingFlowState(): SpellingFlowState {
  return {
    index: 0,
    answer: "",
    results: {},
    revealedResult: null,
    completed: false,
  };
}

export function normalizeSpellingAnswer(value: string) {
  return value.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

export function buildSpellingLetterTiles(word: string) {
  const extras = ["m", "d", "r", "n"];
  return Array.from(new Set([...word.toLowerCase().replace(/[^a-z]/g, "").split(""), ...extras])).sort();
}

export function transitionSpellingFlow(
  state: SpellingFlowState,
  action: SpellingFlowAction,
  context: SpellingFlowContext,
): { state: SpellingFlowState; completion?: SpellingFlowCompletion } {
  if (state.completed) return { state };

  if (action.type === "set_answer") {
    return { state: { ...state, answer: action.answer, revealedResult: null } };
  }

  if (action.type === "append_letter") {
    return { state: { ...state, answer: state.answer + action.letter, revealedResult: null } };
  }

  if (action.type === "clear") {
    return { state: { ...state, answer: "", revealedResult: null } };
  }

  const words = context.words;
  const target = words[state.index] || "";

  if (state.revealedResult === null) {
    const isCorrect = normalizeSpellingAnswer(state.answer) === normalizeSpellingAnswer(target);
    return {
      state: {
        ...state,
        results: { ...state.results, [target]: isCorrect },
        revealedResult: isCorrect,
      },
    };
  }

  if (state.index < words.length - 1) {
    return {
      state: {
        ...state,
        index: state.index + 1,
        answer: "",
        revealedResult: null,
      },
    };
  }

  const completion = {
    spellingCorrect: Object.values(state.results).filter(Boolean).length,
    spellingTotal: words.length,
  };
  return {
    state: { ...state, completed: true },
    completion,
  };
}

export function spellingFeedbackKind(state: SpellingFlowState): "correct" | "retry" | null {
  if (state.revealedResult === null) return null;
  return state.revealedResult ? "correct" : "retry";
}

export function spellingPrimaryActionKey(
  state: SpellingFlowState,
  isLastWord: boolean,
): "checkButton" | "nextButton" | "doneButton" {
  if (state.revealedResult === null) return "checkButton";
  return isLastWord ? "doneButton" : "nextButton";
}
