import OpenAI from "openai";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { recordModelDecision, type ModelDecisionMetadata } from "@/lib/decisions/withModelDecisionLogging";
import { PROMPT_KEYS } from "@/lib/prompts/registry";

export const DEFAULT_OPENAI_TTS_MODEL = "tts-1";
export const DEFAULT_OPENAI_TTS_VOICE = "shimmer";

type SynthesisResult = {
  audioBytes: Uint8Array;
  contentType: string;
  inferenceMs: number;
};

type GenerateInput = {
  text: string;
  voice: string;
  model: string;
  cacheKey: string;
  studentUserId: string;
  apiKey?: string;
  synthesize?: () => Promise<SynthesisResult>;
  recordDecision?: typeof recordModelDecision;
};

export async function generateOpenAiTtsWithDecisionLogging(input: GenerateInput) {
  const synthesize = input.synthesize || (() => synthesizeOpenAiSpeech(input));
  const recordDecision = input.recordDecision || recordModelDecision;
  let generated: SynthesisResult | null = null;
  try {
    await recordDecision(
      {
        decisionType: DECISION_TYPES.TTS_GENERATION,
        modelProvider: "OPENAI",
        modelName: input.model,
        promptKey: PROMPT_KEYS.OPENAI_TTS_V1,
        studentUserId: input.studentUserId,
        inputContext: {
          studentUserId: input.studentUserId,
          textLength: input.text.length,
          voice: input.voice,
          model: input.model,
          cacheKey: input.cacheKey,
        },
      },
      async () => {
        generated = await synthesize();
        return {
          output: {
            cacheKey: input.cacheKey,
            audioByteLength: generated.audioBytes.byteLength,
            contentType: generated.contentType,
            voice: input.voice,
            model: input.model,
          },
          metadata: {
            inferenceMs: generated.inferenceMs,
            costUsd: estimateOpenAiTtsCost(input.text.length),
          } satisfies Partial<ModelDecisionMetadata>,
        };
      },
    );
  } catch (error) {
    console.warn("TTS decision logging wrapper failed; retrying speech synthesis without capture.", { error });
  }
  if (generated) return generated;
  return synthesize();
}

export async function synthesizeOpenAiSpeech(input: { text: string; voice: string; model: string; apiKey?: string }): Promise<SynthesisResult> {
  if (!("apiKey" in input) || !input.apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const openai = new OpenAI({ apiKey: input.apiKey });
  const started = Date.now();
  const response = await openai.audio.speech.create({
    model: input.model,
    voice: input.voice as any,
    input: input.text,
    response_format: "mp3",
  });
  return {
    audioBytes: new Uint8Array(await response.arrayBuffer()),
    contentType: "audio/mpeg",
    inferenceMs: Date.now() - started,
  };
}

export function estimateOpenAiTtsCost(characterCount: number) {
  return (characterCount / 1_000_000) * 15;
}
