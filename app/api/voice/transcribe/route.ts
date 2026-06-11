import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { persistModelDecision } from "@/lib/decisions/withModelDecisionLogging";
import { consumeRateLimit } from "@/lib/rateLimit";
import { computeUncertaintyScore } from "@/lib/voice/uncertainty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PersistedDecisionType = Parameters<typeof persistModelDecision>[0]["decisionType"];

const ALLOWED_MODELS = new Set(["gpt-4o-transcribe", "whisper-1"]);
const ALLOWED_AUDIO_MIME_TYPES = new Set(["audio/webm", "audio/mp4", "audio/wav"]);
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_DURATION_MS = 30_000;
const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_MS = 60_000;

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const rateLimit = await consumeRateLimit({
    key: `voice-transcribe:${auth.user.id}`,
    capacity: RATE_LIMIT_CAPACITY,
    refillIntervalMs: RATE_LIMIT_REFILL_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many transcription attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "A non-empty audio blob is required." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: `Audio blob exceeds ${MAX_AUDIO_BYTES} byte limit.` }, { status: 400 });
  }
  const mimeType = normalizedMimeType(audio);
  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "Unsupported audio MIME type." }, { status: 400 });
  }

  const requestedModel = String(form.get("model") || "gpt-4o-transcribe");
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : "gpt-4o-transcribe";
  const expectedText = stringField(form, "expectedText");
  const prompt = stringField(form, "prompt");
  const temperature = numberField(form, "temperature");
  const audioDurationMs = durationField(form);
  if (typeof audioDurationMs === "number" && audioDurationMs > MAX_AUDIO_DURATION_MS) {
    return NextResponse.json({ error: `Audio duration exceeds ${MAX_AUDIO_DURATION_MS}ms limit.` }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });
  const startedAt = Date.now();
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model,
    language: "en",
    response_format: model === "whisper-1" ? "verbose_json" : "json",
    ...(model === "gpt-4o-transcribe" ? { include: ["logprobs" as const] } : {}),
    ...(prompt ? { prompt } : {}),
    ...(typeof temperature === "number" ? { temperature } : {}),
  });
  const latencyMs = Date.now() - startedAt;
  const transcript = typeof transcription === "string" ? transcription : transcription.text || "";
  const confidenceProxy = confidenceProxyFromTranscription(transcription);

  void persistModelDecision(
    {
      decisionType: "ASR_TRANSCRIPTION" as PersistedDecisionType,
      modelProvider: "OPENAI",
      modelName: model,
      promptKey: "voice.transcribe.process_and_drop.v1",
      studentUserId: auth.user.id,
      inputContext: {
        route: "/api/voice/transcribe",
        audioBytes: audio.size,
        mimeType,
        audioDurationMs: audioDurationMs ?? null,
        requestedModel,
        model,
        hasPrompt: Boolean(prompt),
        hasExpectedText: Boolean(expectedText),
        temperatureProvided: typeof temperature === "number",
        processAndDrop: true,
      },
    },
    {
      transcriptCharacterCount: transcript.length,
      confidenceProxyPresent: confidenceProxy !== null,
      responseFormat: typeof transcription === "string" ? "string" : "object",
    },
    { inferenceMs: latencyMs, costUsd: 0 },
  );

  return NextResponse.json({
    transcript,
    confidenceProxy,
    model,
    latencyMs,
    uncertaintyScore: computeUncertaintyScore({ asrConfidenceMean: confidenceProxy, asrTranscript: transcript, expectedText }),
  });
}

function stringField(form: FormData, key: string) {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

function numberField(form: FormData, key: string) {
  const raw = stringField(form, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function durationField(form: FormData) {
  return numberField(form, "durationMs") ?? numberField(form, "audioDurationMs");
}

function normalizedMimeType(audio: File) {
  return audio.type.split(";")[0]?.trim().toLowerCase();
}

function confidenceProxyFromTranscription(transcription: unknown): number | null {
  if (!transcription || typeof transcription !== "object") return null;
  const response = transcription as {
    logprobs?: Array<{ logprob?: unknown }>;
    segments?: Array<{ avg_logprob?: unknown }>;
  };

  if (Array.isArray(response.logprobs)) {
    const logprobs = response.logprobs
      .map((entry) => entry.logprob)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (logprobs.length) return logprobMeanToProbability(logprobs);
  }

  if (Array.isArray(response.segments)) {
    const logprobs = response.segments
      .map((entry) => entry.avg_logprob)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (logprobs.length) return logprobMeanToProbability(logprobs);
  }

  return null;
}

function logprobMeanToProbability(logprobs: number[]) {
  const mean = logprobs.reduce((sum, value) => sum + value, 0) / logprobs.length;
  return Math.max(0, Math.min(1, Math.exp(mean)));
}
