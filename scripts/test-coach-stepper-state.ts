import assert from "node:assert/strict";
import { buildLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { buildCoachLessonSteps } from "@/lib/literacy/coachLessonSteps";
import {
  completeCurrentStep,
  createInitialCoachStepperState,
  currentStepStatus,
  goBack,
  goNext,
  isNextEnabled,
  isReviewMode,
  isSummaryState,
  type CoachStepperState,
  type StepOutcome,
} from "@/lib/literacy/coachStepperState";

async function main() {
  const data = await buildLessonPlayerData("a_e", { presentationProfile: "BAND_7_8" });
  assert.equal(data.enabled, true);
  const steps = buildCoachLessonSteps(data);

  let state = createInitialCoachStepperState(steps);
  assert.equal(isNextEnabled(state, steps), false);
  assert.equal(currentStepStatus(state, steps), "active");
  steps.forEach((step, index) => {
    const uncompletedAtStep: CoachStepperState = {
      currentStepIndex: index,
      completedStepIds: new Set(),
      outcomesByStepId: {},
      completedPartNumbers: new Set(),
    };
    assert.equal(isNextEnabled(uncompletedAtStep, steps), step.kind === "rule", `${step.kind} gating at entry`);
  });

  const before = state;
  state = completeCurrentStep(state, steps, { kind: "read_marked" });
  assert.notEqual(state, before);
  assert.notEqual(state.completedStepIds, before.completedStepIds);
  assert.equal(before.completedStepIds.size, 0);
  assert.equal(state.completedStepIds.has("part1:warmup:0"), true);
  assert.equal(isNextEnabled(state, steps), true);

  state = goNext(state, steps);
  assert.equal(state.currentStepIndex, 1);
  assert.equal(isReviewMode(goBack(state), steps), true);
  assert.equal(goBack(state).currentStepIndex, 0);

  while (steps[state.currentStepIndex]?.kind === "warmup_word") {
    state = completeCurrentStep(state, steps, { kind: "read_marked" });
    state = goNext(state, steps);
  }
  assert.equal(steps[state.currentStepIndex].kind, "rule");
  assert.equal(isNextEnabled(state, steps), true);
  assert.equal(state.completedStepIds.has("part2:rule"), false);
  state = goNext(state, steps);
  assert.deepStrictEqual(state.outcomesByStepId["part2:rule"], { kind: "acknowledged" });
  assert.equal(state.currentStepIndex, 16);

  for (const step of steps.slice(state.currentStepIndex, -1)) {
    const outcome = outcomeForKind(step.kind);
    state = completeCurrentStep(state, steps, outcome);
    state = goNext(state, steps);
  }
  assert.equal(steps[state.currentStepIndex].id, "part8:question:3");
  state = completeCurrentStep(state, steps, { kind: "answered_marked", text: "done" });
  assert.equal(isSummaryState(state, steps), true);
  assert.equal(state.completedPartNumbers.has(8), true);
  assert.equal(goNext(state, steps).currentStepIndex, steps.length);
  assert.equal(goBack(state).currentStepIndex, steps.length - 1);

  console.log("Coach stepper state tests passed.");
}

function outcomeForKind(kind: string): StepOutcome {
  if (kind === "demo_pair" || kind === "power_word") return { kind: "heard_marked" };
  if (kind === "spell_word") return { kind: "checked_marked", correct: true };
  if (kind === "reflect") return { kind: "answered_marked" };
  return { kind: "read_marked" };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
