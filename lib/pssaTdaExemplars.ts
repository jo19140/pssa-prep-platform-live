import grade6ReleasedTda from "@/reference/pssa-released-items/extracted/grade-6/tda-rubric-exemplars.json";
import grade7ReleasedTda from "@/reference/pssa-released-items/extracted/grade-7/tda-rubric-exemplars.json";

export type PssaTdaExemplar = {
  gradeLevel: number;
  source: string;
  passageTitle: string;
  passage: string;
  prompt: string;
  essay: string;
  officialRationale: string;
  expectedOutput: {
    score: number;
    scoring_rationale: string;
    performance_level: "Below Basic" | "Basic" | "Proficient" | "Advanced";
    strengths: { claim: string; evidence_quote: string }[];
    areas_for_growth: { claim: string; evidence_quote: string }[];
    feedback: string;
    next_steps: string[];
  };
};

type ReleasedTdaSet = {
  grade: number;
  source: string;
  passage: { title: string; content: string };
  prompt: string;
  exemplars: { score: number; response: string; rationale: string }[];
};

const releasedTdaSets = [grade6ReleasedTda, grade7ReleasedTda] as unknown as ReleasedTdaSet[];

export const pssaTdaExemplars: PssaTdaExemplar[] = releasedTdaSets.flatMap((set) =>
  set.exemplars.map((exemplar) => ({
    gradeLevel: set.grade,
    source: set.source,
    passageTitle: set.passage.title,
    passage: set.passage.content,
    prompt: set.prompt,
    essay: exemplar.response,
    officialRationale: exemplar.rationale,
    expectedOutput: buildExpectedOutput(set.grade, exemplar.score, exemplar.response, exemplar.rationale),
  })),
);

export function pssaTdaExemplarsForGrade(gradeLevel: number) {
  const exact = pssaTdaExemplars.filter((example) => example.gradeLevel === gradeLevel);
  if (exact.length > 0) return exact;

  // The pilot currently has real released anchors for grades 6 and 7 only.
  // Use the nearest anchor set if another grade routes through this grader.
  const fallbackGrade = gradeLevel < 7 ? 6 : 7;
  return pssaTdaExemplars.filter((example) => example.gradeLevel === fallbackGrade);
}

function buildExpectedOutput(gradeLevel: number, score: number, essay: string, officialRationale: string): PssaTdaExemplar["expectedOutput"] {
  const quote = exemplarQuote(gradeLevel, score, essay);
  return {
    score,
    scoring_rationale: officialRationale,
    performance_level: performanceLevel(score),
    strengths: strengthsFor(score, quote),
    areas_for_growth: growthFor(score, quote),
    feedback: feedbackFor(score),
    next_steps: nextStepsFor(score),
  };
}

function performanceLevel(score: number): PssaTdaExemplar["expectedOutput"]["performance_level"] {
  if (score >= 4) return "Advanced";
  if (score === 3) return "Proficient";
  if (score === 2) return "Basic";
  return "Below Basic";
}

function strengthsFor(score: number, quote: string) {
  if (score >= 4) {
    return [{ claim: "The response provides thorough analysis supported by well-chosen text evidence.", evidence_quote: quote }];
  }
  if (score === 3) {
    return [{ claim: "The response gives clear analysis and uses relevant evidence from the passage.", evidence_quote: quote }];
  }
  if (score === 2) {
    return [{ claim: "The response attempts an inference connected to the passage, but the analysis is only partly developed.", evidence_quote: quote }];
  }
  return [];
}

function growthFor(score: number, quote: string) {
  if (score >= 4) return [];
  if (score === 3) {
    return [{ claim: "Extend the explanation so each piece of evidence is tied more thoroughly to the theme or central idea.", evidence_quote: quote }];
  }
  if (score === 2) {
    return [{ claim: "Develop the claim with more accurate, specific evidence and explain how the evidence proves the analysis.", evidence_quote: quote }];
  }
  return [{ claim: "Add an analytical claim and specific text evidence rather than giving a vague or minimal summary.", evidence_quote: quote }];
}

function feedbackFor(score: number) {
  if (score >= 4) return "This response shows in-depth analytic understanding, relevant text evidence, strong organization, and language that supports the writer's purpose.";
  if (score === 3) return "This response shows sufficient analytic understanding and relevant evidence. To move higher, make the explanation more thorough and consistently connected to the claim.";
  if (score === 2) return "This response shows partial analytic understanding, but the evidence and explanation need to be more specific and more clearly connected to the task.";
  return "This response minimally addresses the task. A stronger TDA essay needs an analytical claim, specific evidence from the passage, and explanation of how that evidence supports the claim.";
}

function nextStepsFor(score: number) {
  if (score >= 4) return ["Maintain the clear claim-evidence-explanation pattern.", "Keep selecting precise text references.", "Proofread for small convention errors before submitting."];
  if (score === 3) return ["Add one more sentence of explanation after each quote.", "Make the conclusion do more than repeat the prompt.", "Check that each paragraph connects back to the controlling idea."];
  if (score === 2) return ["Write a clear claim that directly answers the prompt.", "Use at least two accurate text references.", "Explain how each text reference proves your claim."];
  return ["Write one claim that answers the prompt.", "Add one specific detail or quote from the passage.", "Explain the connection between the evidence and your claim."];
}

function exemplarQuote(gradeLevel: number, score: number, essay: string) {
  const quotes: Record<string, string> = {
    "6-4": "This shows that her friendship still has hope and though self\ndiscovery is diﬃcult there is still hope for herself.",
    "6-3": "It was hard for her to ﬁnd the portal on her own.",
    "6-2": "Bea (the narrotor) is having\ntroluble f inding herself.",
    "6-1": "heS\nruning from something",
    "7-4": "Wanting but not having an answer to Zephyr’s question gave Nimbus\nmotivation to keep learning",
    "7-3": "the quote relates to the theme by asking a question that would start the action",
    "7-2": "Zephyr’s question relates to a theme by showing how each finch thinks.",
    "7-1": "they all live in a cage",
  };
  const candidate = quotes[`${gradeLevel}-${score}`];
  return candidate && essay.includes(candidate) ? candidate : "";
}
