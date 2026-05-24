import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { canAccessStudent } from "@/lib/literacy/profile";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const session = await db.voiceSession.findUnique({ where: { id }, include: { literacyProfile: true } });
  if (!session?.audioStorageKey || session.audioDeletedAt) return NextResponse.json({ error: "Audio not available" }, { status: 404 });
  const isAdmin = auth.user!.role === "ADMIN";
  const isVoiceAnnotator = auth.user!.role === "VOICE_ANNOTATOR";
  if (isVoiceAnnotator) {
    const queuedSegment = await db.labeledVoiceSegment.findFirst({
      where: { voiceSessionId: session.id, labeledAt: null, skippedAt: null },
      select: { id: true },
    });
    if (!queuedSegment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAdmin && !isVoiceAnnotator && !(await canAccessStudent(auth.user!, session.literacyProfile.studentUserId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isAdmin || isVoiceAnnotator) {
    await db.voiceAudioAccessLog.create({
      data: { voiceSessionId: session.id, accessedById: auth.user!.id, accessPurpose: "VOICE_AUDIO_READ" },
    });
  }
  if (/^https:\/\//.test(session.audioStorageKey)) {
    const upstream = await fetch(session.audioStorageKey);
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "Audio fetch failed" }, { status: 502 });
    return new Response(upstream.body, {
      headers: {
        "content-type": upstream.headers.get("content-type") || "audio/webm",
        "cache-control": "private, max-age=0, no-store",
      },
    });
  }
  return NextResponse.json({ audioStorageKey: session.audioStorageKey, expiresInSeconds: 900 });
}
