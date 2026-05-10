import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { text, voice } = await req.json();
  const cleanText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 4000);
  if (!cleanText) return NextResponse.json({ error: "Text is required." }, { status: 400 });
  const selectedVoice = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"].includes(String(voice || ""))
    ? String(voice)
    : "nova";

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
