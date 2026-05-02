import OpenAI from "openai";
import { getPerformanceBand } from "@/lib/performance";

export type EssayGradeResult = {
  score: number;
  maxScore: number;
  performanceBand: string;
  strengths: string[];
  areasForGrowth: string[];
  feedback: string;
  nextSteps: string[];
  rubricBreakdown: Record<string, number | string>;
  gradingProvider: "OPENAI" | "DETERMINISTIC";
};

export async function gradeTdaEssay({
  essay,
  prompt,
  gradeLevel,
  rubric,
}: {
  essay: string;
  prompt: string;
  gradeLevel: number;
  rubric: string;
}): Promise<EssayGradeResult> {
  if (!process.env.OPENAI_API_KEY) return gradeTdaEssayDeterministically({ essay, prompt, gradeLevel, rubric });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are grading a Pennsylvania PSSA Text-Dependent Analysis essay.",
            "Grade the student response using a PSSA-style 1-4 TDA rubric.",
            "Evaluate analysis of the text, use of evidence, explanation of evidence, organization, and language/conventions.",
            "Return only valid JSON in this exact shape:",
            '{"score":1,"performance_level":"Below Basic | Basic | Proficient | Advanced","strengths":["..."],"areas_for_growth":["..."],"feedback":"student-friendly paragraph","next_steps":["specific actionable steps"]}',
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({ student_response: essay, tda_prompt: prompt, grade_level: gradeLevel, rubric, score_scale: "1-4" }),
        },
      ],
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const score = clampScore(parsed.score);
    return {
      score,
      maxScore: 4,
      performanceBand: normalizePerformanceLevel(parsed.performance_level || parsed.performanceBand || parsed.performanceLevel, score),
      strengths: normalizeStringArray(parsed.strengths, ["The response addresses the prompt."]),
      areasForGrowth: normalizeStringArray(parsed.areas_for_growth || parsed.areasForGrowth, ["Add more text evidence and explanation."]),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Your response was reviewed for analysis, evidence, organization, and conventions.",
      nextSteps: normalizeStringArray(parsed.next_steps || parsed.nextSteps, ["Revise by adding one quoted or paraphrased detail from the passage."]),
      rubricBreakdown: typeof parsed.rubricBreakdown === "object" && parsed.rubricBreakdown ? parsed.rubricBreakdown : fallbackRubric(score),
      gradingProvider: "OPENAI",
    };
  } catch (error) {
    console.error("TDA essay grading failed:", error);
    return gradeTdaEssayDeterministically({ essay, prompt, gradeLevel, rubric });
  }
}

export function gradeTdaEssayDeterministically({
  essay,
}: {
  essay: string;
  prompt: string;
  gradeLevel: number;
  rubric: string;
}): EssayGradeResult {
  const words = essay.trim().split(/\s+/).filter(Boolean);
  const lower = essay.toLowerCase();
  const evidenceWords = ["because", "evidence", "text", "passage", "author", "shows", "states", "explains", "suggests", "proves", "paragraph"].filter((word) => lower.includes(word)).length;
  const organizationMarkers = ["introduction", "first", "next", "finally", "also", "however", "therefore", "conclusion", "in conclusion", "for example"].filter((word) => lower.includes(word)).length;
  const completeSentences = essay.split(/[.!?]+/).filter((sentence) => sentence.trim().split(/\s+/).length >= 5).length;

  let score = 1;
  if (words.length >= 35 && completeSentences >= 2) score += 1;
  if (words.length >= 75 && evidenceWords >= 2) score += 1;
  if ((organizationMarkers >= 2 && evidenceWords >= 3) || words.length >= 120) score += 1;
  score = clampScore(score);

  return {
    score,
    maxScore: 4,
    performanceBand: getPerformanceBand(scoreToPercent(score)),
    strengths: score >= 2 ? ["The response gives a complete answer to the prompt.", "The writing includes some evidence-focused language."] : ["The response begins to address the prompt."],
    areasForGrowth: score >= 3 ? ["Explain how each piece of evidence proves the claim."] : ["Add more passage evidence.", "Organize the response with a clear beginning, middle, and ending."],
    feedback: "This fallback score is based on response length, evidence language, organization markers, and answer completeness.",
    nextSteps: ["Add one clear claim sentence.", "Use at least two details from the passage.", "Explain how each detail supports the claim."],
    rubricBreakdown: fallbackRubric(score),
    gradingProvider: "DETERMINISTIC",
  };
}

function scoreToPercent(score: number) {
  return Math.round((score / 4) * 100);
}

function clampScore(score: unknown) {
  return Math.min(4, Math.max(1, Math.round(Number(score) || 1)));
}

function normalizePerformanceLevel(value: unknown, score: number) {
  const text = typeof value === "string" ? value : "";
  if (["Below Basic", "Basic", "Proficient", "Advanced"].includes(text)) return text;
  return getPerformanceBand(scoreToPercent(score));
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 4) : fallback;
}

function fallbackRubric(score: number) {
  return {
    analysisOfText: score >= 3 ? "clear analysis of explicit or implicit meaning" : score >= 2 ? "partial analysis" : "limited analysis",
    useOfTextEvidence: score >= 3 ? "relevant text evidence" : score >= 2 ? "some evidence, but it may be vague" : "limited or missing evidence",
    explanationOfEvidence: score >= 3 ? "evidence is explained" : score >= 2 ? "evidence explanation is developing" : "evidence is not explained clearly",
    organization: score >= 3 ? "organized introduction, development, and conclusion" : score >= 2 ? "some organization" : "needs clearer structure",
    languageAndConventions: score >= 3 ? "mostly controlled language and conventions" : "developing language and conventions",
  };
}
