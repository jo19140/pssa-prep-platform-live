import OpenAI from "openai";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { logAiFailure } from "@/lib/aiTelemetry";

const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_VOICE = "nova";

export async function generateStepAudio({
  stepId,
  narrationScript,
  voice = process.env.OPENAI_LESSON_TTS_VOICE || DEFAULT_VOICE,
}: {
  stepId: string;
  narrationScript: string;
  voice?: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey || !process.env.BLOB_READ_WRITE_TOKEN) {
    logAiFailure({
      scope: "lessonStepAudio.skipped",
      error: new Error("OPENAI_API_KEY or BLOB_READ_WRITE_TOKEN is not configured."),
      context: { stepId, hasOpenAiKey: Boolean(apiKey), hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN) },
    });
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.audio.speech.create({
      model: process.env.OPENAI_LESSON_TTS_MODEL || DEFAULT_TTS_MODEL,
      voice: voice as any,
      input: narrationScript,
      instructions:
        "Speak like a warm, calm reading teacher guiding one student. Keep the pacing clear, encouraging, and classroom-safe. Do not add extra words beyond the provided script.",
      response_format: "mp3",
    } as any);
    const bytes = Buffer.from(await response.arrayBuffer());
    const blob = await put(`lesson-step-${stepId}.mp3`, bytes, { access: "public", addRandomSuffix: false });
    return blob.url;
  } catch (error) {
    logAiFailure({
      scope: "lessonStepAudio.generate",
      error,
      context: { stepId, narrationLength: narrationScript.length },
    });
    return null;
  }
}

export async function regenerateStepAudio(stepId: string) {
  const step = await db.lessonStep.findUnique({ where: { id: stepId } });
  if (!step) throw new Error("Lesson step not found.");
  const audioUrl = await generateStepAudio({ stepId: step.id, narrationScript: step.narrationScript });
  if (audioUrl) {
    await db.lessonStep.update({ where: { id: step.id }, data: { audioUrl } });
  }
  return audioUrl;
}
