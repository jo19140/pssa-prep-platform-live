import assert from "node:assert/strict";
import {
  buildSpellingLetterTiles,
  createInitialSpellingFlowState,
  normalizeSpellingAnswer,
  spellingFeedbackKind,
  spellingPrimaryActionKey,
  transitionSpellingFlow,
  type SpellingFlowAction,
  type SpellingFlowCompletion,
  type SpellingFlowState,
} from "../lib/literacy/spellingFlow";

function main() {
  assert.equal(normalizeSpellingAnswer(" Cake! "), "cake");
  assert.equal(normalizeSpellingAnswer("CAKE"), "cake");
  assert.equal(normalizeSpellingAnswer("  cake  "), "cake");
  assert.equal(normalizeSpellingAnswer("cake!!!"), "cake");
  assert.equal(normalizeSpellingAnswer("cake     tape"), "cake tape");
  assert.deepEqual(buildSpellingLetterTiles("cape"), ["a", "c", "d", "e", "m", "n", "p", "r"]);
  assert.deepEqual(buildSpellingLetterTiles("ca-pe!!"), ["a", "c", "d", "e", "m", "n", "p", "r"]);
  assert.deepEqual(buildSpellingLetterTiles("mama"), ["a", "d", "m", "n", "r"]);

  const context = { words: ["cake", "made"] };
  let state = createInitialSpellingFlowState();
  state = apply(state, { type: "set_answer", answer: "cake" }, context.words).state;
  assert.equal(spellingFeedbackKind(state), null, "editing must show no correctness feedback");
  assert.equal(spellingPrimaryActionKey(state, false), "checkButton");

  let result = apply(state, { type: "primary" }, context.words);
  state = result.state;
  assert.equal(result.completion, undefined);
  assert.equal(state.index, 0, "first check reveals without advancing");
  assert.equal(state.revealedResult, true);
  assert.deepEqual(state.results, { cake: true });
  assert.equal(spellingFeedbackKind(state), "correct");
  assert.equal(spellingPrimaryActionKey(state, false), "nextButton");

  state = apply(state, { type: "set_answer", answer: "cap" }, context.words).state;
  assert.equal(state.revealedResult, null, "editing after reveal clears feedback");
  result = apply(state, { type: "primary" }, context.words);
  state = result.state;
  assert.equal(state.revealedResult, false);
  assert.deepEqual(state.results, { cake: false }, "re-check replaces prior target-text result");

  state = apply(state, { type: "primary" }, context.words).state;
  assert.equal(state.index, 1, "second press advances exactly one word");
  assert.equal(state.answer, "");
  assert.equal(state.revealedResult, null);

  state = apply(state, { type: "append_letter", letter: "m" }, context.words).state;
  state = apply(state, { type: "append_letter", letter: "a" }, context.words).state;
  state = apply(state, { type: "append_letter", letter: "d" }, context.words).state;
  state = apply(state, { type: "append_letter", letter: "e" }, context.words).state;
  assert.equal(state.answer, "made", "rapid append actions must reduce from latest state");

  result = apply(state, { type: "primary" }, context.words);
  state = result.state;
  assert.equal(state.revealedResult, true);
  assert.equal(spellingPrimaryActionKey(state, true), "doneButton");

  const finalA = apply(state, { type: "primary" }, context.words);
  const finalB = apply(finalA.state, { type: "primary" }, context.words);
  assert.deepEqual(finalA.completion, { spellingCorrect: 1, spellingTotal: 2 });
  assert.equal(finalA.state.completed, true);
  assert.equal(finalB.completion, undefined, "second final primary must not complete twice");
  assert.deepEqual(finalB.state, finalA.state);

  for (const action of [
    { type: "set_answer", answer: "late" },
    { type: "append_letter", letter: "x" },
    { type: "clear" },
    { type: "primary" },
  ] satisfies SpellingFlowAction[]) {
    const terminal = apply(finalA.state, action, context.words);
    assert.equal(terminal.completion, undefined, `completed state must ignore ${action.type}`);
    assert.deepEqual(terminal.state, finalA.state, `completed state must not change on ${action.type}`);
  }

  let emptyState = createInitialSpellingFlowState();
  emptyState = apply(emptyState, { type: "primary" }, ["cake"]).state;
  assert.equal(emptyState.revealedResult, false, "empty answer remains checkable and incorrect");
  const emptyAdvance = apply(emptyState, { type: "primary" }, ["cake"]);
  assert.deepEqual(emptyAdvance.completion, { spellingCorrect: 0, spellingTotal: 1 }, "incorrect answer can still proceed");

  let latestState = createInitialSpellingFlowState();
  latestState = apply(latestState, { type: "set_answer", answer: "cap" }, ["cake"]).state;
  latestState = apply(latestState, { type: "primary" }, ["cake"]).state;
  latestState = apply(latestState, { type: "set_answer", answer: "cake" }, ["cake"]).state;
  latestState = apply(latestState, { type: "primary" }, ["cake"]).state;
  const latestCompletion = apply(latestState, { type: "primary" }, ["cake"]);
  assert.deepEqual(latestCompletion.completion, { spellingCorrect: 1, spellingTotal: 1 }, "final tally uses latest revealed result");

  let duplicateState = createInitialSpellingFlowState();
  duplicateState = apply(duplicateState, { type: "set_answer", answer: "cake" }, ["cake", "cake"]).state;
  duplicateState = apply(duplicateState, { type: "primary" }, ["cake", "cake"]).state;
  duplicateState = apply(duplicateState, { type: "primary" }, ["cake", "cake"]).state;
  duplicateState = apply(duplicateState, { type: "set_answer", answer: "cap" }, ["cake", "cake"]).state;
  duplicateState = apply(duplicateState, { type: "primary" }, ["cake", "cake"]).state;
  const duplicateCompletion = apply(duplicateState, { type: "primary" }, ["cake", "cake"]);
  assert.deepEqual(duplicateCompletion.completion, { spellingCorrect: 0, spellingTotal: 2 }, "duplicate target text keeps target-keyed overwrite semantics");

  const originalState: SpellingFlowState = {
    index: 0,
    answer: "cake",
    results: { cake: false },
    revealedResult: null,
    completed: false,
  };
  const originalResults = originalState.results;
  const originalWords = ["cake"];
  const immutable = transitionSpellingFlow(originalState, { type: "primary" }, { words: originalWords });
  assert.notEqual(immutable.state, originalState);
  assert.notEqual(immutable.state.results, originalResults);
  assert.deepEqual(originalState, { index: 0, answer: "cake", results: { cake: false }, revealedResult: null, completed: false });
  assert.deepEqual(originalWords, ["cake"]);

  assert.equal(spellingPrimaryActionKey(createInitialSpellingFlowState(), false), "checkButton");
  assert.equal(spellingPrimaryActionKey({ ...createInitialSpellingFlowState(), revealedResult: true }, false), "nextButton");
  assert.equal(spellingPrimaryActionKey({ ...createInitialSpellingFlowState(), revealedResult: true }, true), "doneButton");
  assert.equal(spellingFeedbackKind(createInitialSpellingFlowState()), null);
  assert.equal(spellingFeedbackKind({ ...createInitialSpellingFlowState(), revealedResult: true }), "correct");
  assert.equal(spellingFeedbackKind({ ...createInitialSpellingFlowState(), revealedResult: false }), "retry");

  const dispatchCompletions: SpellingFlowCompletion[] = [];
  let dispatchState = createInitialSpellingFlowState();
  dispatchState = dispatch(dispatchState, { type: "set_answer", answer: "cake" }, ["cake"], dispatchCompletions);
  dispatchState = dispatch(dispatchState, { type: "primary" }, ["cake"], dispatchCompletions);
  dispatchState = dispatch(dispatchState, { type: "primary" }, ["cake"], dispatchCompletions);
  dispatchState = dispatch(dispatchState, { type: "primary" }, ["cake"], dispatchCompletions);
  assert.deepEqual(dispatchCompletions, [{ spellingCorrect: 1, spellingTotal: 1 }], "dispatch-level final primary guard must emit one completion");
  assert.equal(dispatchState.completed, true);

  console.log("spelling flow checks passed");
}

function apply(state: SpellingFlowState, action: SpellingFlowAction, words: string[]) {
  return transitionSpellingFlow(state, action, { words });
}

function dispatch(
  state: SpellingFlowState,
  action: SpellingFlowAction,
  words: string[],
  completions: SpellingFlowCompletion[],
) {
  const result = transitionSpellingFlow(state, action, { words });
  if (result.completion) completions.push(result.completion);
  return result.state;
}

main();
