import assert from "node:assert/strict";
import { synthesizeTtsAudioWithDecisionCapture, type TtsDecisionInput } from "@/lib/voice/tts-decision";

const fakeAudio = Buffer.from([1, 2, 3, 5, 8, 13]);
const decision: TtsDecisionInput = {
  studentUserId: "student-test-1",
  route: "/api/voice/tts",
  model: "tts-1",
  voice: "shimmer",
  cacheKey: "cache-key",
  textLength: 42,
  costUsd: 0.00063,
};

async function unwrappedTts() {
  return Buffer.from(fakeAudio);
}

async function wrappedTts(persistDecision: Parameters<typeof synthesizeTtsAudioWithDecisionCapture>[0]["persistDecision"]) {
  const result = await synthesizeTtsAudioWithDecisionCapture({
    decision,
    synthesize: unwrappedTts,
    persistDecision,
  });
  return result.audio;
}

async function main() {
  const persistedCalls: Array<{ inputContext: Record<string, unknown>; output: unknown }> = [];
  const persisted = await wrappedTts(async (ctx, output) => {
    persistedCalls.push({ inputContext: ctx.inputContext, output });
    return "model-decision-id";
  });
  assert.deepEqual([...persisted], [...await unwrappedTts()]);
  assert.equal(persistedCalls.length, 1);
  assert.equal(persistedCalls[0]?.inputContext.textLength, decision.textLength);
  assert.equal(persistedCalls[0]?.inputContext.voice, "shimmer");
  assert.equal(persistedCalls[0]?.inputContext.model, "tts-1");
  assert.equal(persistedCalls[0]?.inputContext.cacheKey, "cache-key");
  assert.equal("text" in persistedCalls[0]!.inputContext, false);
  assert.equal("audio" in persistedCalls[0]!.inputContext, false);

  const failedPersistence = await wrappedTts(async () => {
    throw new Error("simulated persistence outage");
  });
  assert.deepEqual([...failedPersistence], [...await unwrappedTts()]);

  console.log("openai-tts equality fixture passed");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
