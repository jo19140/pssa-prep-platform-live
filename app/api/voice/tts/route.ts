import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { getClientIp, consumeRateLimit } from "@/lib/rateLimit";
import { checkTtsDailyPlayCap } from "@/lib/voice/tts-play-cap";
import { getCachedTtsAudio, setCachedTtsAudio, ttsCacheKey } from "@/lib/voice/tts-cache";
import { DEFAULT_OPENAI_TTS_MODEL, DEFAULT_OPENAI_TTS_VOICE, generateOpenAiTtsWithDecisionLogging } from "@/lib/voice/openaiTtsGeneration";

const schema = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: z.string().trim().min(1).max(40).optional(),
  model: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  if ((process.env.TTS_PROVIDER || "OPENAI").toUpperCase() === "BROWSER") {
    return NextResponse.json({ error: "browser_tts_configured" }, { status: 409 });
  }
  const ipLimit = await consumeRateLimit({
    key: `voice-tts:${auth.user!.id}:${getClientIp(req)}`,
    capacity: 120,
    refillIntervalMs: 60 * 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const text = parsed.data.text;
  const voice = parsed.data.voice || DEFAULT_OPENAI_TTS_VOICE;
  const model = parsed.data.model || process.env.OPENAI_TTS_MODEL || DEFAULT_OPENAI_TTS_MODEL;
  const cacheKey = ttsCacheKey({ text, voice, model });
  const cached = getCachedTtsAudio(cacheKey);
  if (cached) return audioResponse(cached.bytes, cached.contentType, "HIT");

  const cap = await checkTtsDailyPlayCap(auth.user!.id);
  if (!cap.allowed) {
    return NextResponse.json({ error: "tts_play_cap_reached", playsUsed: cap.used, playCap: cap.cap }, { status: 429 });
  }

  try {
    const apiKey = readOpenAiApiKey();
    const generated = await generateOpenAiTtsWithDecisionLogging({
      text,
      voice,
      model,
      cacheKey,
      studentUserId: auth.user!.id,
      apiKey,
    });
    setCachedTtsAudio(cacheKey, generated.audioBytes, generated.contentType);
    return audioResponse(generated.audioBytes, generated.contentType, "MISS");
  } catch (error) {
    console.warn("OpenAI TTS proxy failed.", { error, studentUserId: auth.user!.id, textLength: text.length, cacheKey });
    return NextResponse.json({ error: "tts_generation_failed" }, { status: 503 });
  }
}

function readOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return apiKey;
}

function audioResponse(bytes: Uint8Array, contentType: string, cacheStatus: "HIT" | "MISS") {
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=86400",
      "x-tts-cache": cacheStatus,
    },
  });
}
