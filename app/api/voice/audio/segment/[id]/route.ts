import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { getVoiceAudioObject } from "@/lib/voice/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN", "VOICE_ANNOTATOR"]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const segment = await db.labeledVoiceSegment.findUnique({
    where: { id },
    include: { voiceSession: { include: { literacyProfile: true } } },
  });
  if (!segment?.segmentAudioKey || segment.voiceSession.audioDeletedAt) {
    return NextResponse.json({ error: "Audio not available" }, { status: 404 });
  }

  const isAdmin = auth.user!.role === "ADMIN";
  const isVoiceAnnotator = auth.user!.role === "VOICE_ANNOTATOR";
  if (isVoiceAnnotator && (segment.labeledAt || segment.skippedAt)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAdmin && !isVoiceAnnotator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const upstream = await getVoiceAudioObject(segment.segmentAudioKey, segment.voiceSession.literacyProfile.studentUserId);
    if (!upstream || upstream.statusCode !== 200 || !upstream.stream) return NextResponse.json({ error: "Audio not available" }, { status: 404 });
    await db.voiceAudioAccessLog.create({
      data: {
        voiceSessionId: segment.voiceSessionId,
        segmentId: segment.id,
        accessedById: auth.user!.id,
        accessPurpose: "VOICE_AUDIO_READ",
      },
    });
    return new Response(upstream.stream, {
      headers: {
        "content-type": upstream.blob.contentType || "audio/webm",
        "cache-control": "private, max-age=0, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Audio not available" }, { status: 404 });
  }
}
