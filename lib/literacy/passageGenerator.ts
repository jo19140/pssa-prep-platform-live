import OpenAI from "openai";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { recordModelDecision, type ModelDecisionContext } from "@/lib/decisions/withModelDecisionLogging";
import { phaseWordCountBand } from "./passageAudit";

export type PassageGenerationParams = {
  phaseNumber: number;
  phasePositionId: string;
  dailyTargetCode: string;
  targetPatternCodes: string[];
  allowedPatternCodes: string[];
  blockedPatternCodes: string[];
  exampleWords: string[];
  vocabularyAllowlist: string[];
  retryFeedback?: string[];
};

export type PassageModelRunner = (input: {
  prompt: string;
  params: PassageGenerationParams;
}) => Promise<{ text: string; metadata?: { inputTokens?: number; outputTokens?: number; costUsd?: number } }>;

export async function generatePassageCandidate(params: PassageGenerationParams, options: {
  modelRunner?: PassageModelRunner;
  recordDecision?: typeof recordModelDecision;
} = {}) {
  const modelRunner = options.modelRunner || openAiPassageModelRunner;
  const recordDecision = options.recordDecision || recordModelDecision;
  const prompt = buildPassagePrompt(params);
  const modelName = process.env.OPENAI_PASSAGE_GENERATION_MODEL || "gpt-4o";
  const ctx: ModelDecisionContext = {
    decisionType: DECISION_TYPES.PASSAGE_GENERATION,
    modelProvider: options.modelRunner ? "HEURISTIC" : "OPENAI",
    modelName,
    promptKey: "content-v3-passage-generation-v1",
    inputContext: {
      phaseNumber: params.phaseNumber,
      phasePositionId: params.phasePositionId,
      dailyTargetCode: params.dailyTargetCode,
      targetPatternCodes: params.targetPatternCodes,
      allowedPatternCodes: params.allowedPatternCodes,
      blockedPatternCodes: params.blockedPatternCodes,
      vocabularyAllowlistCount: params.vocabularyAllowlist.length,
      wordCountTarget: phaseWordCountBand(params.phaseNumber)?.target ?? null,
      retryFeedback: params.retryFeedback || [],
    },
  };

  return recordDecision(ctx, async () => {
    const result = await modelRunner({ prompt, params });
    return { output: result.text, metadata: result.metadata };
  });
}

export function buildPassagePrompt(params: PassageGenerationParams) {
  const band = phaseWordCountBand(params.phaseNumber);
  return [
    "Write one original child-friendly controlled reading passage for Sý Learning Reading Buddy.",
    `Target phase: ${params.phaseNumber}.`,
    `Daily target: ${params.dailyTargetCode}.`,
    `Word count target: ${band?.target ?? "N/A"} words.`,
    `Use these target examples as anchors: ${params.exampleWords.join(", ")}.`,
    `Allowed pattern codes: ${params.allowedPatternCodes.join(", ")}.`,
    `Blocked pattern codes: ${params.blockedPatternCodes.join(", ")}.`,
    `Vocabulary allowlist: ${params.vocabularyAllowlist.join(", ") || "(none)"}.`,
    "Do not introduce words outside the target, prerequisite, heart-word, or supplied vocabulary sets.",
    "Return only the passage text. No title, notes, labels, metadata, or markdown.",
    params.retryFeedback?.length ? `Avoid these prior audit failures: ${params.retryFeedback.join("; ")}` : "",
  ].filter(Boolean).join("\n");
}

async function openAiPassageModelRunner({ prompt }: { prompt: string; params: PassageGenerationParams }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for non-mock passage generation.");
  }
  const model = process.env.OPENAI_PASSAGE_GENERATION_MODEL || "gpt-4o";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You write tightly controlled, age-respectful structured-literacy passages. Return only passage text." },
      { role: "user", content: prompt },
    ],
  });
  return {
    text: completion.choices[0]?.message?.content?.trim() || "",
    metadata: {
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    },
  };
}
