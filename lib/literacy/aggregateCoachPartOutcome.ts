import type { CoachLessonStep } from "./coachLessonSteps";
import type { StepOutcome } from "./coachStepperState";

export type CoachStepOutcomeRecord = {
  step: CoachLessonStep;
  outcome: StepOutcome;
};

/**
 * PR-B generic-card outcomes are engagement/acknowledgement placeholders, NOT reading evidence.
 * Empty vadConfirmedWords/pseudowordAttemptMeta and spellingCorrect: 0 are placeholders:
 * 0 means "not measured," not "all wrong." Do not use PR-B telemetry to evaluate reading.
 */
export function aggregateCoachPartOutcome(partNumber: number, outcomes: CoachStepOutcomeRecord[]): Record<string, unknown> {
  const partOutcomes = outcomes.filter((entry) => entry.step.partNumber === partNumber);
  switch (partNumber) {
    case 1:
      return {
        surface: "warmup",
        vadConfirmedWords: [],
        fallbackWords: [],
        totalWords: partOutcomes.filter((entry) => entry.step.kind === "warmup_word").length,
      };
    case 2:
      return {
        listenedToRule: partOutcomes.some((entry) => entry.step.kind === "rule" && entry.outcome.kind === "acknowledged"),
        heardPairs: partOutcomes.filter((entry) => entry.step.kind === "demo_pair" && entry.outcome.kind === "heard_marked").length,
      };
    case 3:
      return {
        realWordsComplete: partOutcomes.filter((entry) => entry.step.kind === "real_word").every((entry) => entry.outcome.kind === "read_marked"),
        pseudowordsConfirmed: partOutcomes
          .filter((entry) => entry.step.kind === "nonsense_word")
          .every((entry) => entry.outcome.kind === "read_marked"),
        pseudowordAttemptMeta: [],
      };
    case 4:
      return {
        heardWords: partOutcomes.filter((entry) => entry.step.kind === "power_word" && entry.outcome.kind === "heard_marked").length,
      };
    case 5:
      return {
        listenAndEncourage: true,
        sentenceCount: partOutcomes.filter((entry) => entry.step.kind === "sentence").length,
      };
    case 6:
      return {
        spellingCorrect: 0,
        spellingTotal: partOutcomes.filter((entry) => entry.step.kind === "spell_word").length,
      };
    case 7: {
      const passage = partOutcomes.find((entry) => entry.step.kind === "passage")?.step;
      return {
        listenAndEncourage: true,
        connectedTextMode: passage?.kind === "passage" && passage.payload.listenFirstAllowed ? "ASSISTED_OR_INDEPENDENT" : "INDEPENDENT",
      };
    }
    case 8:
      return {
        responseCount: partOutcomes.filter((entry) => entry.step.kind === "reflect" && entry.outcome.kind === "answered_marked").length,
      };
    default:
      throw new Error(`Unsupported coach partNumber: ${partNumber}`);
  }
}
