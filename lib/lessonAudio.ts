import OpenAI from "openai";
import { put } from "@vercel/blob";
import { logAiFailure } from "@/lib/aiTelemetry";

const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_VOICE = "nova";

export type StepAudioResult = {
  audioUrl: string;
  durationSec: number;
};

export async function generateStepAudio({
  narrationScript,
  lessonId,
  stepId,
  voice = process.env.OPENAI_LESSON_TTS_VOICE || DEFAULT_VOICE,
}: {
  narrationScript: string;
  lessonId: string;
  stepId: string;
  voice?: string;
}): Promise<StepAudioResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey || !process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error("OPENAI_API_KEY or BLOB_READ_WRITE_TOKEN is not configured.");
    logAiFailure({
      scope: "lessonAudio.skipped",
      error,
      context: { lessonId, stepId, hasOpenAiKey: Boolean(apiKey), hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN) },
    });
    throw error;
  }

  const script = narrationScript.trim();
  if (!script) throw new Error(`Step ${stepId} has no narrationScript.`);

  const openai = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
  const bytes = await retryWithBackoff(async () => {
    const response = await openai.audio.speech.create({
      model: process.env.OPENAI_LESSON_TTS_MODEL || DEFAULT_TTS_MODEL,
      voice: voice as any,
      input: script,
      instructions:
        "Speak like a warm, calm reading teacher guiding one student. Keep the pacing clear, encouraging, and classroom-safe. Do not add extra words beyond the provided script.",
      response_format: "mp3",
    } as any);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 512) throw new Error("TTS returned malformed or empty audio.");
    return buffer;
  }, { retries: 3, delaysMs: [5_000, 15_000, 45_000] });

  const blob = await retryWithBackoff(
    () => put(`lesson-audio/${lessonId}/${stepId}.mp3`, bytes, { access: "public", addRandomSuffix: false }),
    { retries: 1, delaysMs: [5_000] },
  );

  return {
    audioUrl: blob.url,
    durationSec: estimateDurationSec(script),
  };
}

async function retryWithBackoff<T>(operation: () => Promise<T>, { retries, delaysMs }: { retries: number; delaysMs: number[] }) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep(delaysMs[Math.min(attempt, delaysMs.length - 1)] || 5_000);
    }
  }
  throw lastError;
}

function estimateDurationSec(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((words / 150) * 60));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
