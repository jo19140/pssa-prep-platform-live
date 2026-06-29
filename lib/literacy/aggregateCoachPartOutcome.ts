import type { CoachLessonStep } from "./coachLessonSteps";
import type { StepOutcome } from "./coachStepperState";

export type CoachStepOutcomeRecord = {
  step: CoachLessonStep;
  outcome: StepOutcome;
};

/**
 * PR-C2a records real ASR evidence for Part 3 real words. Parts 1, 3 pseudowords,
 * and 5 remain placeholders until C2b/C3:
 * empty vadConfirmedWords/pseudowordAttemptMeta mean "not measured," not "all wrong."
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
        realWordsComplete: partOutcomes.filter((entry) => entry.step.kind === "real_word").every((entry) => entry.outcome.kind === "read_scored"),
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
        spellingCorrect: partOutcomes.filter((entry) => entry.step.kind === "spell_word" && entry.outcome.kind === "checked_marked" && entry.outcome.correct).length,
        spellingTotal: partOutcomes.filter((entry) => entry.step.kind === "spell_word").length,
      };
    case 7: {
      const passage = partOutcomes.find((entry) => entry.step.kind === "passage" && entry.outcome.kind === "read_marked");
      return {
        listenAndEncourage: true,
        connectedTextMode: passage?.outcome.kind === "read_marked" ? passage.outcome.mode : undefined,
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
