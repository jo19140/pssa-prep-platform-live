import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const speechSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: z.enum(["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]).optional().default("nova"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = String((session.user as any).id || "unknown");
  const userLimit = await consumeRateLimit({ key: `student-speech:user:${userId}`, capacity: 30, refillIntervalMs: 60 * 60 * 1000 });
  const ipLimit = await consumeRateLimit({ key: `student-speech:ip:${getClientIp(req)}`, capacity: 90, refillIntervalMs: 60 * 60 * 1000 });
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many speech requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec)) } });
  }

  const parsed = speechSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const cleanText = parsed.data.text.replace(/\s+/g, " ").trim();
  const selectedVoice = parsed.data.voice;

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is required for reliable read aloud audio." }, { status: 503 });
    }

    const speechRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: selectedVoice,
        input: cleanText,
        response_format: "mp3",
        instructions: "Speak clearly, warmly, and naturally for a student. Use a friendly teacher voice, steady pacing, and light expression without sounding robotic.",
      }),
    });

    if (!speechRes.ok) {
      const errorText = await speechRes.text().catch(() => "");
      return NextResponse.json({ error: errorText || "OpenAI audio generation failed." }, { status: 502 });
    }

    const audio = await speechRes.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Audio read aloud is not available right now." }, { status: 503 });
  }
}
