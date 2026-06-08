import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { computeUncertaintyScore } from "@/lib/voice/uncertainty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODELS = new Set(["gpt-4o-transcribe", "whisper-1"]);

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "A non-empty audio blob is required." }, { status: 400 });
  }

  const requestedModel = String(form.get("model") || "gpt-4o-transcribe");
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : "gpt-4o-transcribe";
  const expectedText = stringField(form, "expectedText");
  const prompt = stringField(form, "prompt");
  const temperature = numberField(form, "temperature");

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
