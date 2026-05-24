import type { MasteryLevel } from "@prisma/client";

export type AutopilotInput = {
  strandScores: Array<{ strand: string; score: number; level: MasteryLevel; priorityRank?: number | null }>;
  recentVoiceSessions?: Array<{ accuracy?: number | null; wpm?: number | null }>;
};

export type AutopilotRecommendation = {
  decisionType: "PLAN_CHANGE" | "PROMOTION" | "INTERVENTION" | "PROGRESS_CHECK";
  summary: string;
  reasoning: string;
};

export function recommendNextLiteracyMove(input: AutopilotInput): AutopilotRecommendation {
  const ordered = [...input.strandScores].sort((a, b) => (a.priorityRank ?? 99) - (b.priorityRank ?? 99));
  const priority = ordered.find((score) => score.level === "NOT_YET" || score.level === "DEVELOPING") || ordered[0];
  if (!priority) {
    return {
      decisionType: "PROGRESS_CHECK",
      summary: "Run a short progress check before changing the plan.",
      reasoning: "No strand evidence is available yet, so the safest next action is to gather baseline data.",
    };
  }
  if (priority.score < 45) {
    return {
      decisionType: "INTERVENTION",
      summary: `Focus next session on ${priority.strand.toLowerCase().replace(/_/g, " ")}.`,
      reasoning: "The highest-priority strand is below the developing threshold, so Reading Buddy should keep instruction tight and explicit.",
    };
  }
  if (ordered.every((score) => score.score >= 85)) {
    return {
      decisionType: "PROMOTION",
      summary: "Move to the next phonogram set after a quick confirmation check.",
      reasoning: "All tracked strands are currently in the mastered range.",
    };
  }
  return {
    decisionType: "PLAN_CHANGE",
    summary: `Keep practice centered on ${priority.strand.toLowerCase().replace(/_/g, " ")} this week.`,
    reasoning: "The plan should respond to the most actionable developing strand while preserving fluency practice.",
  };
}
