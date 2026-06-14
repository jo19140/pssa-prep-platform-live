import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { consumeRateLimit } from "@/lib/rateLimit";
import { checkTtsDailyCap } from "@/lib/voice/tts-cost-cap";
import { estimateOpenAiTtsCostUsd, synthesizeTtsAudioWithDecisionCapture } from "@/lib/voice/tts-decision";
import { getCachedTtsAudio, setCachedTtsAudio, ttsCacheKey } from "@/lib/voice/tts-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TTS_VOICE = "shimmer";
const DEFAULT_TTS_MODEL = "tts-1";
const MAX_TTS_TEXT_LENGTH = 4_000;
const RATE_LIMIT_CAPACITY = 60;
const RATE_LIMIT_REFILL_MS = 60_000;
const ALLOWED_VOICES = new Set(["alloy", "ash", "ballad", "cedar", "coral", "echo", "fable", "marin", "nova", "onyx", "sage", "shimmer", "verse"]);

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT"]);
  if ("error" in auth) return auth.error;

  const body = await requestJson(req);
  if (!body) return NextResponse.json({ error: "A JSON body is required." }, { status: 400 });

  const text = stringField(body.text);
  if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });
  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text exceeds ${MAX_TTS_TEXT_LENGTH} character limit.` }, { status: 400 });
  }

  const requestedVoice = stringField(body.voice) || process.env.OPENAI_TTS_VOICE || DEFAULT_TTS_VOICE;
  const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_TTS_VOICE;
  const model = stringField(body.model) || process.env.OPENAI_TTS_MODEL || DEFAULT_TTS_MODEL;
  const cacheKey = ttsCacheKey({ text, voice, model });

  const cached = getCachedTtsAudio(cacheKey);
  if (cached) return audioResponse(cached.audio, { cache: "HIT", contentType: cached.contentType });

  const rateLimit = await consumeRateLimit({
    key: `voice-tts:${auth.user.id}`,
    capacity: RATE_LIMIT_CAPACITY,
    refillIntervalMs: RATE_LIMIT_REFILL_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many TTS attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  const cap = await checkTtsDailyCap(auth.user.id);
  if (!cap.allowed) {
    return NextResponse.json(
      { error: "tts_cap_reached", cap: cap.cap, used: cap.used },
      { status: 429, headers: { "Retry-After": String(secondsUntilNextUtcDay()) } },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });

  const openai = new OpenAI({ apiKey });
  const costUsd = estimateOpenAiTtsCostUsd(text.length);
  const { audio, inferenceMs } = await synthesizeTtsAudioWithDecisionCapture({
    decision: {
      studentUserId: auth.user.id,
      route: "/api/voice/tts",
      model,
      voice,
      cacheKey,
      textLength: text.length,
      costUsd,
    },
    synthesize: async () => {
      const response = await openai.audio.speech.create({
        model,
        voice: voice as Parameters<typeof openai.audio.speech.create>[0]["voice"],
        input: text,
        response_format: "mp3",
      });
      return Buffer.from(await response.arrayBuffer());
    },
  });

  setCachedTtsAudio({ cacheKey, audio, contentType: "audio/mpeg" });
  return audioResponse(audio, { cache: "MISS", inferenceMs });
}

async function requestJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function audioResponse(audio: Buffer, { cache, contentType = "audio/mpeg", inferenceMs }: { cache: "HIT" | "MISS"; contentType?: string; inferenceMs?: number }) {
  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-TTS-Cache": cache,
      ...(typeof inferenceMs === "number" ? { "X-TTS-Inference-Ms": String(inferenceMs) } : {}),
    },
  });
}

function secondsUntilNextUtcDay() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}
