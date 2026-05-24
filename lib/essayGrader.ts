import OpenAI from "openai";
import { logAiFailure } from "@/lib/aiTelemetry";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { recordModelDecision } from "@/lib/decisions/withModelDecisionLogging";
import { getPerformanceBand } from "@/lib/performance";
import { PROMPT_KEYS } from "@/lib/prompts/registry";
import { pssaTdaExemplarsForGrade } from "@/lib/pssaTdaExemplars";

export type EssayFeedbackItem = {
  claim: string;
  evidence_quote: string;
};

export type EssayValidity =
  | { valid: true }
  | { valid: false; reason: "TOO_SHORT" | "BLANK_OR_PLACEHOLDER" | "MATCHES_PROMPT" | "MOSTLY_COPIED" | "OFF_TOPIC"; deterministicScore: 1 };

export type EssayGradeResult = {
  score: number;
  maxScore: number;
  performanceBand: string;
  scoringRationale: string;
  strengths: EssayFeedbackItem[];
  areasForGrowth: EssayFeedbackItem[];
  feedback: string;
  nextSteps: string[];
  rubricBreakdown: Record<string, unknown>;
  gradingProvider: "OPENAI" | "DETERMINISTIC" | "VALIDITY_GATE";
  validity?: EssayValidity;
};

const PLACEHOLDERS = new Set(["test", "asdf", "n/a", "na", "none", "nothing", "idk", "i don't know", "dont know", "no answer", "blank"]);
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "but", "by", "can", "did", "do", "does", "for", "from", "had", "has", "have", "he", "her", "his", "how", "i", "in", "is", "it", "its", "of", "on", "or", "she", "so", "that", "the", "their", "them", "then", "there", "they", "this", "to", "use", "was", "were", "what", "when", "where", "which", "who", "why", "with", "write", "you", "your",
]);

export async function gradeTdaEssay({
  essay,
  prompt,
  gradeLevel,
  rubric,
  passage = "",
}: {
  essay: string;
  prompt: string;
  gradeLevel: number;
  rubric: string;
  passage?: string;
}): Promise<EssayGradeResult> {
  const validity = assessEssayValidity({ essay, prompt, passage, rubric });
  if (validity.valid === false) return validityGateResult({ essay, prompt, gradeLevel, rubric, validity });

  if (!process.env.OPENAI_API_KEY) {
    logAiFailure({ scope: "essayGrader.missing_api_key", error: new Error("OPENAI_API_KEY is not configured"), context: { gradeLevel, essayLength: essay.length } });
    return gradeTdaEssayDeterministically({ essay, prompt, gradeLevel, rubric });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const gradeAnchors = pssaTdaExemplarsForGrade(gradeLevel);
    const modelName = process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini";
    const response = await recordModelDecision(
      {
        decisionType: DECISION_TYPES.TDA_SCORING,
        modelProvider: "OPENAI",
        modelName,
        promptKey: PROMPT_KEYS.TDA_SCORING_V1,
        inputContext: {
          gradeLevel,
          essayWordCount: tokenizeWords(essay).length,
          promptLength: prompt.length,
          passageLength: passage.length,
          rubricKey: "pssa-tda-4point",
          exemplarGrade: gradeLevel,
        },
      },
      async () => {
        const started = Date.now();
        const completion = await openai.chat.completions.create({
          model: modelName,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...gradeAnchors.flatMap((example) => [
              { role: "user" as const, content: JSON.stringify({ student_response: example.essay, tda_prompt: example.prompt, passage: example.passage, grade_level: example.gradeLevel }) },
              { role: "assistant" as const, content: JSON.stringify(example.expectedOutput) },
            ]),
            { role: "user", content: JSON.stringify({ student_response: essay, tda_prompt: prompt, passage, grade_level: gradeLevel, score_scale: "1-4" }) },
          ],
        });
        const usage = completion.usage;
        return {
          output: completion,
          metadata: {
            inferenceMs: Date.now() - started,
            inputTokens: usage?.prompt_tokens,
            outputTokens: usage?.completion_tokens,
            costUsd: estimateOpenAiCost(modelName, usage?.prompt_tokens || 0, usage?.completion_tokens || 0),
          },
        };
      },
    );
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const score = clampScore(parsed.score);
    const result: EssayGradeResult = {
      score,
      maxScore: 4,
      performanceBand: normalizePerformanceLevel(parsed.performance_level || parsed.performanceBand || parsed.performanceLevel, score),
      scoringRationale: typeof parsed.scoring_rationale === "string" ? parsed.scoring_rationale : "The score is based on PSSA TDA analysis, evidence, explanation, organization, and conventions.",
      strengths: normalizeFeedbackItems(parsed.strengths, [], essay, "strength"),
      areasForGrowth: normalizeFeedbackItems(parsed.areas_for_growth || parsed.areasForGrowth, [{ claim: "Add more text evidence and explanation.", evidence_quote: "" }], essay, "growth"),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Your response was reviewed for analysis, evidence, organization, and conventions.",
      nextSteps: normalizeStringArray(parsed.next_steps || parsed.nextSteps, ["Revise by adding one quoted or paraphrased detail from the passage."]),
      rubricBreakdown: typeof parsed.rubricBreakdown === "object" && parsed.rubricBreakdown ? parsed.rubricBreakdown : fallbackRubric(score),
      gradingProvider: "OPENAI",
      validity,
    };
    const moderation = await openai.moderations.create({
      input: [result.feedback, result.scoringRationale, ...result.nextSteps],
    });
    if (moderation.results.some((item) => item.flagged)) {
      console.warn("TDA essay grading moderation flagged AI feedback", { gradeLevel });
      return gradeTdaEssayDeterministically({ essay, prompt, gradeLevel, rubric });
    }
    return result;
  } catch (error) {
    logAiFailure({
      scope: "essayGrader.gradeTdaEssay",
      error,
      context: { gradeLevel, essayLength: essay.length, promptLength: prompt.length },
    });
    return gradeTdaEssayDeterministically({ essay, prompt, gradeLevel, rubric });
  }
}

export function assessEssayValidity({ essay, prompt, passage, rubric = "" }: { essay: string; prompt: string; passage?: string; rubric?: string }): EssayValidity {
  const trimmed = essay.trim();
  const normalized = normalizeWhitespace(trimmed).toLowerCase();
  if (!trimmed || PLACEHOLDERS.has(normalized)) return { valid: false, reason: "BLANK_OR_PLACEHOLDER", deterministicScore: 1 };

  const words = tokenizeWords(trimmed);
  if (words.length < 30) return { valid: false, reason: "TOO_SHORT", deterministicScore: 1 };

  if ((prompt || rubric) && isMostlyCopied(words, tokenizeWords(`${prompt} ${rubric}`))) return { valid: false, reason: "MATCHES_PROMPT", deterministicScore: 1 };
  if (passage && isMostlyCopied(words, tokenizeWords(passage))) return { valid: false, reason: "MOSTLY_COPIED", deterministicScore: 1 };

  const essayContentWords = new Set(contentWords(trimmed));
  const sourceContentWords = new Set([...contentWords(prompt), ...contentWords(passage || "")]);
  let overlap = 0;
  for (const word of essayContentWords) if (sourceContentWords.has(word)) overlap++;
  if (overlap < 3 && words.length < 80) return { valid: false, reason: "OFF_TOPIC", deterministicScore: 1 };

  return { valid: true };
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
    scoringRationale: "This fallback score is based on response length, evidence language, organization markers, and answer completeness.",
    strengths: score >= 2 ? [{ claim: "The response gives a complete answer to the prompt.", evidence_quote: "" }, { claim: "The writing includes some evidence-focused language.", evidence_quote: "" }] : [{ claim: "The response begins to address the prompt.", evidence_quote: "" }],
    areasForGrowth: score >= 3 ? [{ claim: "Explain how each piece of evidence proves the claim.", evidence_quote: "" }] : [{ claim: "Add more passage evidence.", evidence_quote: "" }, { claim: "Organize the response with a clear beginning, middle, and ending.", evidence_quote: "" }],
    feedback: "This fallback score is based on response length, evidence language, organization markers, and answer completeness.",
    nextSteps: ["Add one clear claim sentence.", "Use at least two details from the passage.", "Explain how each detail supports the claim."],
    rubricBreakdown: fallbackRubric(score),
    gradingProvider: "DETERMINISTIC",
  };
}

function validityGateResult({ essay, prompt, gradeLevel, rubric, validity }: { essay: string; prompt: string; gradeLevel: number; rubric: string; validity: Exclude<EssayValidity, { valid: true }> }): EssayGradeResult {
  logAiFailure({ scope: `essayGrader.validity_gate_${validity.reason}`, error: new Error(`Essay rejected by validity gate: ${validity.reason}`), context: { gradeLevel, essayLength: essay.length, promptLength: prompt.length } });
  const reasonText = validity.reason === "TOO_SHORT"
    ? "too short"
    : validity.reason === "BLANK_OR_PLACEHOLDER"
      ? "blank or a placeholder"
      : validity.reason === "MOSTLY_COPIED"
        ? "mostly copied from the passage"
        : validity.reason === "MATCHES_PROMPT"
          ? "a restatement of the prompt or rubric"
        : "off-topic";
  const feedback = validity.reason === "MATCHES_PROMPT"
    ? "Your response restated the prompt or rubric instead of attempting the analytical response. A strong PSSA TDA essay makes your own claim, cites at least two specific pieces of evidence, and explains how that evidence supports your claim."
    : `Your response was ${reasonText}. A strong PSSA TDA essay analyzes the text in your own words, cites at least two specific pieces of evidence, and explains how that evidence supports your claim.`;
  return {
    score: validity.deterministicScore,
    maxScore: 4,
    performanceBand: getPerformanceBand(scoreToPercent(validity.deterministicScore)),
    scoringRationale: `The response was scored 1 because it was ${reasonText} and did not meet the basic requirements for analytical TDA writing.`,
    strengths: [],
    areasForGrowth: [{ claim: feedback, evidence_quote: "" }],
    feedback,
    nextSteps: ["Write a clear claim that answers the prompt.", "Use your own words instead of copying the passage.", "Add at least two text details and explain how they support the claim."],
    rubricBreakdown: fallbackRubric(validity.deterministicScore),
    gradingProvider: "VALIDITY_GATE",
    validity,
  };
}

function buildSystemPrompt() {
  return [
    "You are grading a Pennsylvania PSSA Text-Dependent Analysis essay. Return only valid JSON.",
    "PSSA rubric criteria inline:",
    "Score 4: Effectively addresses all parts of the task, demonstrates thorough analysis of explicit and implicit meanings from the text, uses substantial relevant text evidence, skillfully explains how evidence supports ideas, and is well organized with clear language and command of conventions.",
    "Score 3: Adequately addresses the task, demonstrates clear analysis of explicit or implicit meanings, uses relevant text evidence, explains evidence, and is organized with generally clear language and adequate command of conventions.",
    "Score 2: Partially addresses the task, demonstrates inconsistent or limited analysis, uses some evidence that may be vague or weakly connected, gives limited explanation, and has uneven organization or language control.",
    "Score 1: Minimally addresses the task or shows little/no analysis, uses minimal, copied, or irrelevant evidence, provides little explanation, and may have weak organization or language control.",
    "Anti-hallucination clause: You must only cite strengths and weaknesses that are directly demonstrated in the student's response. For every strength and every area of growth, you must quote the exact phrase from the student's essay that supports it. If you cannot find a quote that demonstrates the claim, do not include the item. Never invent analysis the student did not write. Generic feedback unsupported by quoted evidence will be discarded.",
    "Validity recheck: Before scoring, verify the response is a genuine attempt at analytical writing. If the response is mostly copied passage text, restates the prompt without analysis, or fails to make an argument about the text, assign a score of 1 and explicitly name the missing requirement. Do not score generously to be encouraging; a fair low score is more useful to the student than an inflated one.",
    "If the student response is essentially a restatement of the prompt or rubric, with no original analytical writing, the score must be 1, the strengths array must be empty (not contain fabricated entries), the feedback must explicitly state that the student did not attempt the analytical response, and the next_steps must guide them to write an actual claim. Do not invent strengths to soften the message; students learn nothing from inflated feedback. An empty strengths array is the honest signal that there was no analytical writing to praise.",
    "Score calibration: 1 = limited or no analysis, 2 = emerging analysis with little or unconnected evidence, 3 = clear analysis supported by evidence and explanation, 4 = insightful analysis with thorough explanation and strong organization.",
    'Return JSON in this shape: {"score":1,"scoring_rationale":"1-2 sentences tying the score to specific rubric criteria","performance_level":"Below Basic | Basic | Proficient | Advanced","strengths":[{"claim":"...","evidence_quote":"exact verbatim quote from student essay"}],"areas_for_growth":[{"claim":"...","evidence_quote":"exact quote from student essay, or empty string if structurally absent"}],"feedback":"warm student-friendly paragraph","next_steps":["specific actionable steps"]}',
  ].join("\n\n");
}

function isMostlyCopied(essayWords: string[], passageWords: string[]) {
  if (essayWords.length < 5 || passageWords.length < 5) return false;
  const passageNgrams = new Set<string>();
  for (let index = 0; index <= passageWords.length - 5; index++) {
    passageNgrams.add(passageWords.slice(index, index + 5).join(" "));
  }
  const copiedPositions = new Set<number>();
  for (let index = 0; index <= essayWords.length - 5; index++) {
    if (passageNgrams.has(essayWords.slice(index, index + 5).join(" "))) {
      for (let offset = 0; offset < 5; offset++) copiedPositions.add(index + offset);
    }
  }
  return copiedPositions.size / Math.max(1, essayWords.length) >= 0.7;
}

function quoteAppearsInEssay(quote: string, essay: string) {
  return normalizeWhitespace(essay).toLowerCase().includes(normalizeWhitespace(quote).toLowerCase());
}

function normalizeFeedbackItems(value: unknown, fallback: EssayFeedbackItem[], essay: string, kind: "strength" | "growth") {
  if (!Array.isArray(value)) return fallback;
  const items: EssayFeedbackItem[] = [];
  for (const item of value.slice(0, 4)) {
    const normalized = typeof item === "string"
      ? { claim: item, evidence_quote: "" }
      : item && typeof item === "object"
        ? { claim: String((item as any).claim || ""), evidence_quote: String((item as any).evidence_quote || (item as any).evidenceQuote || "") }
        : null;
    if (!normalized?.claim) continue;
    if (normalized.evidence_quote && !quoteAppearsInEssay(normalized.evidence_quote, essay)) {
      logAiFailure({ scope: "essayGrader.hallucination_dropped", error: new Error("Quote not found in essay"), context: { claim: normalized.claim, quote: normalized.evidence_quote, kind } });
      continue;
    }
    items.push(normalized);
  }
  return items.length ? items : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 4) : fallback;
}

function contentWords(value: string) {
  return tokenizeWords(value).filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function tokenizeWords(value: string) {
  return value.toLowerCase().match(/[a-z0-9']+/g) || [];
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function scoreToPercent(score: number) {
  return Math.round((score / 4) * 100);
}

function clampScore(score: unknown) {
  return Math.min(4, Math.max(1, Math.round(Number(score) || 1)));
}

function estimateOpenAiCost(modelName: string, inputTokens: number, outputTokens: number) {
  const lower = modelName.toLowerCase();
  const inputPerMillion = lower.includes("gpt-4o-mini") ? 0.15 : lower.includes("gpt-4o") ? 2.5 : 0;
  const outputPerMillion = lower.includes("gpt-4o-mini") ? 0.6 : lower.includes("gpt-4o") ? 10 : 0;
  return (inputTokens / 1_000_000) * inputPerMillion + (outputTokens / 1_000_000) * outputPerMillion;
}

function normalizePerformanceLevel(value: unknown, score: number) {
  const text = typeof value === "string" ? value : "";
  if (["Below Basic", "Basic", "Proficient", "Advanced"].includes(text)) return text;
  return getPerformanceBand(scoreToPercent(score));
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
