import assert from "node:assert/strict";
import { buildLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { aggregateCoachPartOutcome, type CoachStepOutcomeRecord } from "@/lib/literacy/aggregateCoachPartOutcome";
import { buildCoachLessonSteps } from "@/lib/literacy/coachLessonSteps";
import type { StepOutcome } from "@/lib/literacy/coachStepperState";

async function main() {
  const data = await buildLessonPlayerData("a_e", { presentationProfile: "BAND_7_8" });
  assert.equal(data.enabled, true);
  const steps = buildCoachLessonSteps(data);
  const outcomeFor = (kind: string): StepOutcome => {
    if (kind === "rule") return { kind: "acknowledged" };
    if (kind === "demo_pair" || kind === "power_word") return { kind: "heard_marked" };
    if (kind === "spell_word") return { kind: "checked_marked" };
    if (kind === "reflect") return { kind: "answered_marked", text: "ok" };
    return { kind: "read_marked" };
  };
  const outcomes: CoachStepOutcomeRecord[] = steps.map((step) => ({ step, outcome: outcomeFor(step.kind) }));

  assert.deepStrictEqual(aggregateCoachPartOutcome(1, outcomes), {
    surface: "warmup",
    vadConfirmedWords: [],
    fallbackWords: [],
    totalWords: 15,
  });
  assert.deepStrictEqual(aggregateCoachPartOutcome(2, outcomes), { listenedToRule: true, heardPairs: 5 });
  assert.deepStrictEqual(aggregateCoachPartOutcome(3, outcomes), {
    realWordsComplete: true,
    pseudowordsConfirmed: true,
    pseudowordAttemptMeta: [],
  });
  assert.deepStrictEqual(aggregateCoachPartOutcome(4, outcomes), { heardWords: 11 });
  assert.deepStrictEqual(aggregateCoachPartOutcome(5, outcomes), { listenAndEncourage: true, sentenceCount: 6 });
  assert.deepStrictEqual(aggregateCoachPartOutcome(6, outcomes), { spellingCorrect: 0, spellingTotal: 6 });
  assert.deepStrictEqual(aggregateCoachPartOutcome(7, outcomes), { listenAndEncourage: true, connectedTextMode: "ASSISTED_OR_INDEPENDENT" });
  assert.deepStrictEqual(aggregateCoachPartOutcome(8, outcomes), { responseCount: 4 });
  assert.throws(() => aggregateCoachPartOutcome(9, outcomes), /Unsupported coach partNumber/);

  console.log("Aggregate coach part outcome tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
