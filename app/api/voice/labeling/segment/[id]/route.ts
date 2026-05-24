import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { isMiscueType } from "@/lib/voice/miscueTypes";

const labelSchema = z.object({
  humanTranscript: z.string().trim().min(1).max(5000),
  miscueType: z.string().refine(isMiscueType),
  phonogramCode: z.string().trim().max(80).optional(),
  syllableType: z.enum(["CLOSED", "OPEN", "VCE", "VOWEL_TEAM", "R_CONTROLLED", "CONSONANT_LE"]).optional(),
  dialectTransferTag: z.string().trim().max(80).optional(),
  labelerNotes: z.string().trim().max(2000).optional(),
  isEvalSet: z.boolean().default(false),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN", "VOICE_ANNOTATOR"]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const segment = await db.labeledVoiceSegment.findUnique({
    where: { id },
    include: { voiceSession: { include: { literacyProfile: { include: { student: { include: { studentProfile: true } }, dialectSettings: true } } } } },
  });
  if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.voiceAudioAccessLog.create({
    data: { voiceSessionId: segment.voiceSessionId, segmentId: segment.id, accessedById: auth.user!.id, accessPurpose: "LABELING_SEGMENT_VIEW" },
  });
  return NextResponse.json({ segment, audioUrl: `/api/voice/audio/session/${segment.voiceSessionId}` });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN", "VOICE_ANNOTATOR"]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const parsed = labelSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const existing = await db.labeledVoiceSegment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.labeledAt && existing.labeledByUserId !== auth.user!.id) {
    const second = await db.labeledVoiceSegment.create({
      data: {
        voiceSessionId: existing.voiceSessionId,
        segmentStartMs: existing.segmentStartMs,
        segmentEndMs: existing.segmentEndMs,
        segmentAudioKey: existing.segmentAudioKey,
        expectedText: existing.expectedText,
        asrTranscript: existing.asrTranscript,
        uncertaintyScore: existing.uncertaintyScore,
        routedFromQueue: true,
        qaParentSegmentId: existing.id,
        labeledByUserId: auth.user!.id,
        labeledAt: new Date(),
        ...parsed.data,
      },
    });
    return NextResponse.json({ segment: second, disagreementCheck: existing.miscueType !== parsed.data.miscueType || existing.humanTranscript !== parsed.data.humanTranscript });
  }
  const segment = await db.labeledVoiceSegment.update({
    where: { id },
    data: { ...parsed.data, labeledByUserId: auth.user!.id, labeledAt: new Date() },
  });
  return NextResponse.json({ segment });
}
