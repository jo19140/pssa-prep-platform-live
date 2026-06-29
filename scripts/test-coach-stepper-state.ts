import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { buildCoachLessonSteps } from "@/lib/literacy/coachLessonSteps";
import {
  completeStepById,
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

  testCompleteStepById(steps);
  testLessonStepperRealWordSourceContracts();

  console.log("Coach stepper state tests passed.");
}

function testLessonStepperRealWordSourceContracts() {
  const source = readFileSync("components/literacy/LessonStepper.tsx", "utf8");
  assert.match(source, /function RealWordControllerProvider/, "real-word controller must live in an inner provider");
  assert.match(source, /key=\{realWordBlockKey\}/, "provider must be keyed by the real-word block, not the shell");
  assert.match(source, /entryStepIdRef\.current\[scoredEntryKey\(entry\)\] = stepId/, "begin/stop must map entryKey to structural step id");
  assert.match(source, /completeStepById\(latestState, latestSteps, mappedStepId/, "resolved words must complete by structural step id");
  assert.match(source, /stateRefRef\.current\.current/, "onWordResolved must read the latest state from a ref");
  assert.match(source, /partNumber: 3/, "voice events must forward as Part 3 events");
  assert.match(source, /disabled=\{state\.currentStepIndex === 0 \|\| ttsBusy \|\| voiceBusy\}/, "Back must be disabled while voice is busy");
  assert.match(source, /disabled=\{!nextEnabled \|\| ttsBusy \|\| voiceBusy\}/, "Next must be disabled while voice is busy");
  const resolveBlock = source.slice(source.indexOf("onWordResolved:"), source.indexOf("function beginRecording"));
  assert.ok(resolveBlock.includes("completeStepById"), "onWordResolved must use completeStepById");
  assert.equal(resolveBlock.includes("completeCurrentStep"), false, "onWordResolved must not call completeCurrentStep");
  const tapBlock = source.slice(source.indexOf("function handleTap()"), source.indexOf("function instruction()"));
  assert.ok(tapBlock.indexOf("if (recording)") < tapBlock.indexOf("onBeginRecording"), "recording stop branch must run before the begin guard");
}

function testCompleteStepById(steps: ReturnType<typeof buildCoachLessonSteps>) {
  const firstRealWord = steps.find((step) => step.kind === "real_word");
  assert.ok(firstRealWord);
  let state = createInitialCoachStepperState(steps);
  state = { ...state, currentStepIndex: 23 };
  const outcome: StepOutcome = {
    kind: "read_scored",
    status: "correct",
    attemptCount: 1,
    wordId: "1:0:cake",
    assisted: false,
    unscored: false,
  };
  const completed = completeStepById(state, steps, firstRealWord.id, outcome);
  assert.equal(completed.currentStepIndex, 23, "structural completion must not move the current index");
  assert.equal(completed.completedStepIds.has(firstRealWord.id), true);
  assert.deepStrictEqual(completed.outcomesByStepId[firstRealWord.id], outcome);
  assert.notEqual(completed.completedStepIds, state.completedStepIds);
  assert.notEqual(completed.outcomesByStepId, state.outcomesByStepId);
  assert.equal(state.completedStepIds.has(firstRealWord.id), false);

  const unknown = completeStepById(completed, steps, "missing-step", { kind: "read_marked" });
  assert.deepStrictEqual(unknown.completedStepIds, completed.completedStepIds);
  assert.deepStrictEqual(unknown.outcomesByStepId, completed.outcomesByStepId);
  assert.equal(unknown.currentStepIndex, completed.currentStepIndex);

  const duplicate = completeStepById(completed, steps, firstRealWord.id, { kind: "read_marked" });
  assert.deepStrictEqual(duplicate.outcomesByStepId[firstRealWord.id], outcome, "already-completed id must not overwrite outcome");

  let part2State = createInitialCoachStepperState(steps);
  for (const step of steps.filter((candidate) => candidate.partNumber === 2)) {
    part2State = completeStepById(part2State, steps, step.id, step.kind === "rule" ? { kind: "acknowledged" } : { kind: "heard_marked" });
  }
  assert.equal(part2State.completedPartNumbers.has(2), true, "structural completion updates completedPartNumbers when a part finishes");

  const entryState: CoachStepperState = {
    currentStepIndex: steps.findIndex((step) => step.id === firstRealWord.id),
    completedStepIds: new Set(),
    outcomesByStepId: {},
    completedPartNumbers: new Set(),
  };
  assert.equal(isNextEnabled(entryState, steps), false, "real_word must not gate open before read_scored resolution");
  const resolvedState = completeStepById(entryState, steps, firstRealWord.id, outcome);
  assert.equal(isNextEnabled(resolvedState, steps), true, "real_word gates open after read_scored resolution");
}

function outcomeForKind(kind: string): StepOutcome {
  if (kind === "demo_pair" || kind === "power_word") return { kind: "heard_marked" };
  if (kind === "real_word") {
    return {
      kind: "read_scored",
      status: "correct",
      attemptCount: 1,
      wordId: "test-word",
      assisted: false,
      unscored: false,
    };
  }
  if (kind === "spell_word") return { kind: "checked_marked", correct: true };
  if (kind === "reflect") return { kind: "answered_marked" };
  return { kind: "read_marked" };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
