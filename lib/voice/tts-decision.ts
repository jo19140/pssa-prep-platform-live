import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { persistModelDecision, type ModelDecisionMetadata } from "@/lib/decisions/withModelDecisionLogging";
import { ttsStudentHash } from "@/lib/voice/tts-cost-cap";

type TtsDecisionPersist = typeof persistModelDecision;

export type TtsDecisionInput = {
  studentUserId: string;
  route: string;
  model: string;
  voice: string;
  cacheKey: string;
  textLength: number;
  costUsd: number;
};

export async function synthesizeTtsAudioWithDecisionCapture({
  decision,
  synthesize,
  persistDecision = persistModelDecision,
}: {
  decision: TtsDecisionInput;
  synthesize: () => Promise<Buffer>;
  persistDecision?: TtsDecisionPersist;
}) {
  const startedAt = Date.now();
  const audio = await synthesize();
  const inferenceMs = Date.now() - startedAt;
  void bestEffortPersistTtsDecision({ decision, audio, inferenceMs, persistDecision });
  return { audio, inferenceMs };
}

async function bestEffortPersistTtsDecision({
  decision,
  audio,
  inferenceMs,
  persistDecision,
}: {
  decision: TtsDecisionInput;
  audio: Buffer;
  inferenceMs: number;
  persistDecision: TtsDecisionPersist;
}) {
  try {
    await persistDecision(
      {
        decisionType: DECISION_TYPES.TTS_GENERATION,
        modelProvider: "OPENAI",
        modelName: decision.model,
        promptKey: "voice.tts.process_and_drop.v1",
        studentUserId: decision.studentUserId,
        inputContext: {
          route: decision.route,
          textLength: decision.textLength,
          voice: decision.voice,
          model: decision.model,
          cacheKey: decision.cacheKey,
          studentHash: ttsStudentHash(decision.studentUserId),
          processAndDrop: true,
          rawTextStored: false,
          rawAudioStored: false,
        },
      },
      {
        audioByteLength: audio.byteLength,
        contentType: "audio/mpeg",
        textLength: decision.textLength,
        voice: decision.voice,
        model: decision.model,
        cacheKey: decision.cacheKey,
      },
      { inferenceMs, costUsd: decision.costUsd } satisfies Partial<ModelDecisionMetadata>,
    );
  } catch (error) {
    console.warn("TTS model decision capture failed", { model: decision.model, error });
  }
}

export function estimateOpenAiTtsCostUsd(textLength: number) {
  return Number((Math.max(0, textLength) * 0.000015).toFixed(6));
}
