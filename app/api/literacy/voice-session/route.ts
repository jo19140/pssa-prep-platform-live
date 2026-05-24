import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { json, ensureLiteracyProfile } from "@/lib/literacy/profile";
import { defaultRetention } from "@/lib/voice/retention";

const schema = z.object({
  sessionType: z.enum(["DIAGNOSTIC", "PRACTICE", "SPEED_DRILL"]).default("PRACTICE"),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  durationSeconds: z.coerce.number().int().min(0).max(3600).optional(),
  audioStorageKey: z.string().max(500).nullable().optional(),
  transcriptJson: z.unknown().optional(),
  wordsRead: z.coerce.number().int().min(0).optional(),
  wordsCorrect: z.coerce.number().int().min(0).optional(),
  wordsSelfCorrected: z.coerce.number().int().min(0).optional(),
  wordsMissed: z.coerce.number().int().min(0).optional(),
  wpm: z.coerce.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const startedAt = parsed.data.startedAt || new Date();
  const profile = await ensureLiteracyProfile(auth.user!.id);
  const voiceSession = await db.voiceSession.create({
    data: {
      literacyProfileId: profile.id,
      sessionType: parsed.data.sessionType,
      startedAt,
      endedAt: parsed.data.endedAt,
      durationSeconds: parsed.data.durationSeconds,
      audioStorageKey: parsed.data.audioStorageKey || null,
      transcriptJson: json(parsed.data.transcriptJson || { note: "TODO: from content pipeline" }),
      wordsRead: parsed.data.wordsRead,
      wordsCorrect: parsed.data.wordsCorrect,
      wordsSelfCorrected: parsed.data.wordsSelfCorrected,
      wordsMissed: parsed.data.wordsMissed,
      wpm: parsed.data.wpm,
      ...defaultRetention(startedAt),
    },
  });
  return NextResponse.json({ voiceSession });
}
