import assert from "assert";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { stableStringify } from "@/lib/decisions/withModelDecisionLogging";
import { estimateOpenAiTtsCost, generateOpenAiTtsWithDecisionLogging } from "@/lib/voice/openaiTtsGeneration";
import { OpenAiTtsProvider } from "@/lib/voice/providers/openai-tts";
import { clearTtsCache, getCachedTtsAudio, setCachedTtsAudio, ttsCacheKey } from "@/lib/voice/tts-cache";

async function main() {
  assert.equal(DECISION_TYPES.TTS_GENERATION, "TTS_GENERATION");
  const text = "The garden path was ready for today's short reading check.";
  const cacheKey = ttsCacheKey({ text, voice: "shimmer", model: "tts-1" });
  const fakeBytes = new Uint8Array([1, 1, 2, 3, 5, 8]);
  const synthesize = async () => ({
    audioBytes: new Uint8Array(fakeBytes),
    contentType: "audio/mpeg",
    inferenceMs: 12,
  });

  const unwrapped = await synthesize();
  let capturedContext = "";
  const wrapped = await generateOpenAiTtsWithDecisionLogging({
    text,
    voice: "shimmer",
    model: "tts-1",
    cacheKey,
    studentUserId: "student_test_1",
    synthesize,
    recordDecision: async (ctx, fn) => {
      capturedContext = stableStringify(ctx.inputContext);
      const result = await fn();
      return result.output as any;
    },
  });
  assert.deepEqual([...wrapped.audioBytes], [...unwrapped.audioBytes], "wrapped TTS must return the same audio bytes as unwrapped TTS");
  assert(!capturedContext.includes(text), "inputContext must not include raw passage text");
  assert(capturedContext.includes("textLength"), "inputContext should include text length metadata");
  assert(capturedContext.includes("cacheKey"), "inputContext should include cache key metadata");

  const wrappedWithFailedCapture = await generateOpenAiTtsWithDecisionLogging({
    text,
    voice: "shimmer",
    model: "tts-1",
    cacheKey,
    studentUserId: "student_test_1",
    synthesize,
    recordDecision: async () => {
      throw new Error("forced persistence failure");
    },
  });
  assert.deepEqual([...wrappedWithFailedCapture.audioBytes], [...unwrapped.audioBytes], "failed capture must not change returned audio bytes");

  clearTtsCache();
  assert.equal(getCachedTtsAudio(cacheKey), null);
  setCachedTtsAudio(cacheKey, fakeBytes);
  assert.deepEqual([...(getCachedTtsAudio(cacheKey)?.bytes || [])], [...fakeBytes], "cache should return stored audio bytes");
  assert(estimateOpenAiTtsCost(1000) > 0, "TTS cost estimate should be populated");
  await assertBrowserFallbackOnProxyFailure();
  console.log("voice-tts-upgrade checks passed");
}

async function assertBrowserFallbackOnProxyFailure() {
  const previousWindow = (globalThis as any).window;
  const previousAudio = (globalThis as any).Audio;
  const previousUtterance = (globalThis as any).SpeechSynthesisUtterance;
  const previousFetch = (globalThis as any).fetch;
  let browserSpoke = false;
  (globalThis as any).window = {
    speechSynthesis: {
      getVoices: () => [],
      speak: (utterance: any) => {
        browserSpoke = true;
        utterance.onend?.();
      },
      cancel: () => {},
    },
    SpeechSynthesisUtterance: class {},
  };
  (globalThis as any).Audio = class {};
  (globalThis as any).SpeechSynthesisUtterance = class {
    rate = 1;
    voice = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  };
  (globalThis as any).fetch = async () => ({ ok: false, status: 503 });
  try {
    await new OpenAiTtsProvider().speak("Fallback should still speak.");
    assert(browserSpoke, "OpenAI proxy failure should fall back to browser speech");
  } finally {
    (globalThis as any).window = previousWindow;
    (globalThis as any).Audio = previousAudio;
    (globalThis as any).SpeechSynthesisUtterance = previousUtterance;
    (globalThis as any).fetch = previousFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
