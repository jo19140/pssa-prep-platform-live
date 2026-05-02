import OpenAI from "openai";

type MasteryRow = {
  standardCode: string;
  standardLabel: string;
  earnedPoints: number;
  totalPoints: number;
  questionCount: number;
  percentScore: number;
  performanceBand: string;
};

type ResponseLike = {
  standardCode: string;
  skill: string;
  questionType: string;
  difficulty: number;
  isCorrect: boolean;
  errorPattern: string;
};

export type LearningPathItemInput = {
  order: number;
  standardCode: string;
  standardLabel: string;
  skill: string;
  priority: number;
  title: string;
  recommendation: string;
  activityType: string;
  difficulty: string;
  estimatedMinutes: number;
  rationale: string;
  practicePrompt: string;
  aiExplanation?: string | null;
  sourcePayload: Record<string, unknown>;
};

export type LearningPathBuild = {
  generatedBy: "DETERMINISTIC" | "AI_ENRICHED";
  aiStatus: "NOT_REQUESTED" | "SKIPPED" | "COMPLETED" | "FAILED";
  aiSummary?: string | null;
  items: LearningPathItemInput[];
};

const SUPPORT_BY_STANDARD: Record<string, { focus: string; activityType: string }> = {
  "CC.1.2.6.A": { focus: "central idea and summary", activityType: "Main Idea + Multi-Select" },
  "CC.1.2.6.B": { focus: "informational inference with text evidence", activityType: "Inference MCQ + EBSR" },
  "CC.1.3.6.B": { focus: "literary inference with text evidence", activityType: "Literary Inference EBSR" },
  "CC.1.3.6.F / CC.1.2.6.F": { focus: "figurative language, connotation, and tone", activityType: "Figurative Language MCQ practice" },
  "CC.1.3.6.E": { focus: "flashback and literary structure", activityType: "Flashback structure analysis practice" },
  "CC.1.3.6.G": { focus: "point of view development", activityType: "POV analysis practice" },
};

export function buildDeterministicLearningPath({
  standardsMastery,
  responses,
}: {
  standardsMastery: MasteryRow[];
  responses: ResponseLike[];
}): LearningPathBuild {
  const rows = [...standardsMastery].sort((a, b) => {
    const aPriorityScore = adjustedPriorityScore(a);
    const bPriorityScore = adjustedPriorityScore(b);
    if (aPriorityScore !== bPriorityScore) return aPriorityScore - bPriorityScore;
    return b.questionCount - a.questionCount;
  });

  const needsSupport = rows.filter((row) => row.percentScore < 85);
  const selectedRows = (needsSupport.length ? needsSupport : rows).slice(0, 3);

  const items = selectedRows.map((row, index) => {
    const relatedResponses = responses.filter((response) => response.standardCode === row.standardCode);
    const incorrect = relatedResponses.filter((response) => !response.isCorrect);
    const commonSkill = mostCommon(relatedResponses.map((response) => response.skill)) || fallbackSkill(row.standardCode);
    const commonError = mostCommon(incorrect.map((response) => response.errorPattern).filter((item) => item !== "none")) || "needs_targeted_practice";
    const commonFormat = mostCommon(incorrect.map((response) => response.questionType)) || mostCommon(relatedResponses.map((response) => response.questionType)) || "MCQ";
    const support = supportFor(row.standardCode, commonSkill, commonFormat);
    const difficulty = row.percentScore < 55 ? "support" : row.percentScore < 70 ? "on_level" : "challenge";
    const estimatedMinutes = row.percentScore < 55 ? 25 : row.percentScore < 70 ? 20 : 15;

    return {
      order: index + 1,
      standardCode: row.standardCode,
      standardLabel: row.standardLabel,
      skill: commonSkill,
      priority: index + 1,
      title: `${row.standardCode} Focus: ${titleCase(support.focus)}`,
      recommendation: buildRecommendation(row.percentScore, support.focus, commonFormat),
      activityType: support.activityType,
      difficulty,
      estimatedMinutes,
      rationale: `Scored ${row.earnedPoints}/${row.totalPoints} points (${row.percentScore}%) on ${row.standardCode}; most useful next practice targets ${commonSkill}.`,
      practicePrompt: `Complete a ${estimatedMinutes}-minute ${support.activityType} set focused on ${row.standardLabel}. Explain the evidence for each answer before submitting.`,
      aiExplanation: null,
      sourcePayload: {
        percentScore: row.percentScore,
        performanceBand: row.performanceBand,
        earnedPoints: row.earnedPoints,
        totalPoints: row.totalPoints,
        questionCount: row.questionCount,
        commonError,
        commonFormat,
      },
    };
  });

  return { generatedBy: "DETERMINISTIC", aiStatus: "NOT_REQUESTED", aiSummary: null, items };
}

function adjustedPriorityScore(row: MasteryRow) {
  const boost = row.standardCode.includes("1.4") ? 10 : 0;
  return row.percentScore - boost;
}

function supportFor(standardCode: string, commonSkill: string, commonFormat: string) {
  if (standardCode.includes(".S")) return { focus: "text-dependent analysis writing", activityType: "TDA revision + evidence planning" };
  if (standardCode.includes("1.4")) return { focus: commonSkill.toLowerCase(), activityType: "Conventions editing practice" };
  if (standardCode.includes(".E") || commonSkill.toLowerCase().includes("flashback")) return { focus: "flashback and literary structure", activityType: "Flashback structure analysis practice" };
  if (standardCode.includes(".G") || commonSkill.toLowerCase().includes("point of view")) return { focus: "point of view development", activityType: "POV analysis practice" };
  if (standardCode.includes(".F") || commonSkill.toLowerCase().includes("figurative")) return { focus: "figurative language, connotation, and tone", activityType: "Figurative Language MCQ practice" };
  if (standardCode.includes(".B") || commonSkill.toLowerCase().includes("inference")) return { focus: commonSkill.toLowerCase().includes("literary") ? "literary inference with text evidence" : "inference with text evidence", activityType: "Inference MCQ + EBSR + justify your thinking" };
  return SUPPORT_BY_STANDARD[standardCode] || { focus: commonSkill.toLowerCase(), activityType: `${commonFormat} practice` };
}

export async function enrichLearningPathWithAi({
  studentName,
  assessmentTitle,
  deterministicPath,
}: {
  studentName: string;
  assessmentTitle: string;
  deterministicPath: LearningPathBuild;
}): Promise<LearningPathBuild> {
  if (!process.env.OPENAI_API_KEY) return { ...deterministicPath, aiStatus: "SKIPPED" };
  if (!deterministicPath.items.length) return { ...deterministicPath, aiStatus: "SKIPPED" };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You refine deterministic student learning plans. Return only JSON. Do not change standards, order, minutes, or difficulty.",
        },
        {
          role: "user",
          content: JSON.stringify({
            studentName,
            assessmentTitle,
            task: "Write a concise student-friendly summary and one encouraging explanation per learning path item.",
            schema: {
              aiSummary: "string",
              items: [{ order: "number", aiExplanation: "string" }],
            },
            deterministicItems: deterministicPath.items,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { aiSummary?: string; items?: { order: number; aiExplanation: string }[] };
    const explanationByOrder = new Map((parsed.items || []).map((item) => [item.order, item.aiExplanation]));

    return {
      ...deterministicPath,
      generatedBy: "AI_ENRICHED",
      aiStatus: "COMPLETED",
      aiSummary: parsed.aiSummary || null,
      items: deterministicPath.items.map((item) => ({
        ...item,
        aiExplanation: explanationByOrder.get(item.order) || item.aiExplanation || null,
      })),
    };
  } catch (error) {
    console.error("Learning path AI enrichment failed:", error);
    return { ...deterministicPath, aiStatus: "FAILED" };
  }
}

function buildRecommendation(percentScore: number, focus: string, format: string) {
  if (percentScore < 55) return `Start with guided ${focus} practice, then answer short ${format} items with immediate feedback.`;
  if (percentScore < 70) return `Practice ${focus} with mixed question formats and require written evidence for missed items.`;
  return `Move into challenge practice for ${focus}, emphasizing accuracy and explanation quality.`;
}

function fallbackSkill(standardCode: string) {
  if (standardCode.includes("1.2.6.A")) return "Main Idea";
  if (standardCode.includes("1.2.6.B")) return "Inference";
  if (standardCode.includes("1.3.6.B")) return "Literary Inference";
  if (standardCode.includes("1.3.6.F") || standardCode.includes("1.2.6.F")) return "Figurative Language";
  if (standardCode.includes("1.3.6.E")) return "Flashback";
  if (standardCode.includes("1.3.6.G")) return "Point of View";
  return "Reading Comprehension";
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
