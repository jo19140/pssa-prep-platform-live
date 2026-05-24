import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { CURRENT_VOICE_CONSENT_VERSION } from "@/lib/voice/consent";
import { writeManifestJsonl } from "@/lib/voice/storage";

const schema = z.object({
  purpose: z.enum(["EVAL_SET", "FINE_TUNE_TRAINING", "FINE_TUNE_VALIDATION", "RESEARCH_EXPORT"]),
  includeEvalSet: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const isEvalExport = parsed.data.purpose === "EVAL_SET";
  const where = {
    labeledAt: { not: null },
    skippedAt: null,
    isEvalSet: isEvalExport ? true : false,
    voiceSession: {
      audioStorageKey: { not: null },
      audioDeletedAt: null,
      literacyProfile: { student: { voiceConsent: { trainingCorpusOptedIn: true } } },
    },
  };
  const segments = await db.labeledVoiceSegment.findMany({
    where,
    include: { voiceSession: { include: { literacyProfile: { include: { student: { include: { studentProfile: true, voiceConsent: true } } } } } } },
    orderBy: { createdAt: "asc" },
  });
  const lines = segments.map((segment) => JSON.stringify({
    segmentId: segment.id,
    audioStorageKey: segment.segmentAudioKey || segment.voiceSession.audioStorageKey,
    expectedText: segment.expectedText,
    humanTranscript: segment.humanTranscript,
    miscueType: segment.miscueType,
    metadata: {
      sessionId: segment.voiceSessionId,
      grade: segment.voiceSession.literacyProfile.student.studentProfile?.grade,
      syllableType: segment.syllableType,
      phonogramCode: segment.phonogramCode,
    },
  }));
  const batchName = `${parsed.data.purpose.toLowerCase()}-${Date.now()}`;
  const manifestStorageKey = await writeManifestJsonl(`voice-manifests/${batchName}.jsonl`, lines);
  const excludedSegmentCount = await db.labeledVoiceSegment.count({
    where: {
      labeledAt: { not: null },
      skippedAt: null,
      ...(isEvalExport ? { isEvalSet: false } : { isEvalSet: true }),
    },
  });
  const batch = await db.trainingCorpusBatch.create({
    data: {
      batchName,
      exportPurpose: parsed.data.purpose,
      segmentCount: segments.length,
      totalDurationMs: segments.reduce((sum, segment) => sum + Math.max(0, segment.segmentEndMs - segment.segmentStartMs), 0),
      manifestStorageKey,
      exportedByUserId: auth.user!.id,
      minimumConsentVersion: CURRENT_VOICE_CONSENT_VERSION,
      excludedSegmentCount,
      manifestJsonl: lines.join("\n"),
      notes: parsed.data.notes,
    },
  });
  return NextResponse.json({ batch, manifest: batch.manifestJsonl });
}
