import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { ensureLiteracyProfile, json } from "@/lib/literacy/profile";
import { retentionForVoiceSession } from "@/lib/voice/consent";
import { EVENT_TYPES } from "@/lib/events/eventTypes";
import { recordStudentEvent } from "@/lib/events/recordStudentEvent";

const schema = z.object({
  startedAt: z.coerce.date().optional(),
  durationSeconds: z.coerce.number().int().min(1).max(300).default(60),
  wordsRead: z.coerce.number().int().min(0),
  wordsCorrect: z.coerce.number().int().min(0),
  wordsSelfCorrected: z.coerce.number().int().min(0).default(0),
  wordsMissed: z.coerce.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const startedAt = parsed.data.startedAt || new Date();
  const profile = await ensureLiteracyProfile(auth.user!.id);
  const retention = await retentionForVoiceSession(auth.user!.id, startedAt);
  const wpm = Math.round((parsed.data.wordsRead / parsed.data.durationSeconds) * 60);
  const voiceSession = await db.voiceSession.create({
    data: {
      literacyProfileId: profile.id,
      sessionType: "SPEED_DRILL",
      startedAt,
      durationSeconds: parsed.data.durationSeconds,
      wordsRead: parsed.data.wordsRead,
      wordsCorrect: parsed.data.wordsCorrect,
      wordsSelfCorrected: parsed.data.wordsSelfCorrected,
      wordsMissed: parsed.data.wordsMissed,
      wpm,
      transcriptJson: json({ mode: "speed-drill", content: "TODO: from content pipeline" }),
      ...retention,
    },
  });
  await recordStudentEvent({
    studentUserId: auth.user!.id,
    eventType: EVENT_TYPES.ITEM_ANSWER_SUBMITTED,
    context: {
      surface: "reading_buddy_speed_drill",
      itemId: voiceSession.id,
      itemType: "speed_drill_summary_placeholder",
      contentSource: "TODO_FROM_CONTENT_PIPELINE",
    },
    response: {
      wordsRead: parsed.data.wordsRead,
      wordsCorrect: parsed.data.wordsCorrect,
      wordsSelfCorrected: parsed.data.wordsSelfCorrected,
      wordsMissed: parsed.data.wordsMissed,
      wpm,
    },
    durationMs: parsed.data.durationSeconds * 1000,
    immediateOutcome: parsed.data.wordsMissed === 0 ? "CORRECT" : "PARTIAL",
    sessionId: voiceSession.id,
  });
  return NextResponse.json({ voiceSession });
}
