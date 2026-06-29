import type { CoachLessonStep } from "./coachLessonSteps";

export type StepOutcome =
  | { kind: "acknowledged" }
  | { kind: "read_marked"; mode?: "read_on_own" }
  | { kind: "read_scored"; status: "correct" | "assisted" | "unscored"; attemptCount: number; wordId: string; assisted: boolean; unscored?: boolean }
  | { kind: "heard_marked" }
  | { kind: "checked_marked"; correct: boolean }
  | { kind: "answered_marked"; text?: string };

export type CoachStepperState = {
  currentStepIndex: number;
  completedStepIds: Set<string>;
  outcomesByStepId: Record<string, StepOutcome>;
  completedPartNumbers: Set<number>;
};

export function createInitialCoachStepperState(_steps: CoachLessonStep[]): CoachStepperState {
  return {
    currentStepIndex: 0,
    completedStepIds: new Set(),
    outcomesByStepId: {},
    completedPartNumbers: new Set(),
  };
}

export function completeCurrentStep(
  state: CoachStepperState,
  steps: CoachLessonStep[],
  outcome: StepOutcome,
): CoachStepperState {
  const current = currentStep(state, steps);
  if (!current) return cloneState(state);
  const completedState = recordCompletion(state, steps, current, outcome);
  if (current.id === steps.at(-1)?.id) {
    return { ...completedState, currentStepIndex: steps.length };
  }
  return completedState;
}

export function completeStepById(
  state: CoachStepperState,
  steps: CoachLessonStep[],
  stepId: string,
  outcome: StepOutcome,
): CoachStepperState {
  const step = steps.find((candidate) => candidate.id === stepId);
  if (!step || state.completedStepIds.has(stepId)) return cloneState(state);
  return recordCompletion(state, steps, step, outcome);
}

export function goNext(state: CoachStepperState, steps: CoachLessonStep[]): CoachStepperState {
  if (isSummaryState(state, steps)) return cloneState(state);
  const current = currentStep(state, steps);
  if (!current) return cloneState(state);
  const readyState = state.completedStepIds.has(current.id)
    ? cloneState(state)
    : current.kind === "rule"
      ? recordCompletion(state, steps, current, { kind: "acknowledged" })
      : cloneState(state);

  if (!readyState.completedStepIds.has(current.id)) return readyState;
  return {
    ...readyState,
    currentStepIndex: Math.min(readyState.currentStepIndex + 1, steps.length),
  };
}

export function goBack(state: CoachStepperState): CoachStepperState {
  return {
    ...cloneState(state),
    currentStepIndex: Math.max(0, state.currentStepIndex - 1),
  };
}

export function currentStepStatus(
  state: CoachStepperState,
  steps: CoachLessonStep[],
): "active" | "completed" | "review" {
  const current = currentStep(state, steps);
  if (!current) return "completed";
  return state.completedStepIds.has(current.id) ? "review" : "active";
}

export function isNextEnabled(state: CoachStepperState, steps: CoachLessonStep[]): boolean {
  const current = currentStep(state, steps);
  if (!current) return false;
  return current.kind === "rule" || state.completedStepIds.has(current.id);
}

export function isReviewMode(state: CoachStepperState, steps: CoachLessonStep[]): boolean {
  return currentStepStatus(state, steps) === "review";
}

export function isSummaryState(state: CoachStepperState, steps: CoachLessonStep[]): boolean {
  return state.currentStepIndex >= steps.length;
}

function currentStep(state: CoachStepperState, steps: CoachLessonStep[]) {
  return steps[state.currentStepIndex] ?? null;
}

function recordCompletion(
  state: CoachStepperState,
  steps: CoachLessonStep[],
  step: CoachLessonStep,
  outcome: StepOutcome,
): CoachStepperState {
  const completedStepIds = new Set(state.completedStepIds);
  completedStepIds.add(step.id);
  const outcomesByStepId = { ...state.outcomesByStepId, [step.id]: outcome };
  const completedPartNumbers = new Set(state.completedPartNumbers);
  const partSteps = steps.filter((candidate) => candidate.partNumber === step.partNumber);
  if (partSteps.every((candidate) => completedStepIds.has(candidate.id))) {
    completedPartNumbers.add(step.partNumber);
  }

  return {
    currentStepIndex: state.currentStepIndex,
    completedStepIds,
    outcomesByStepId,
    completedPartNumbers,
  };
}

function cloneState(state: CoachStepperState): CoachStepperState {
  return {
    currentStepIndex: state.currentStepIndex,
    completedStepIds: new Set(state.completedStepIds),
    outcomesByStepId: { ...state.outcomesByStepId },
    completedPartNumbers: new Set(state.completedPartNumbers),
  };
}
