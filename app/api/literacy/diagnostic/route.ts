import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { ensurePhonogramMasteryRecords, json } from "@/lib/literacy/profile";
import { LITERACY_STRANDS, SYLLABLE_TYPES, levelFromScore, phaseConfidence, phaseFromDecodingScore } from "@/lib/literacy/constants";
import { recommendNextLiteracyMove } from "@/lib/literacy/autopilot";
import { EVENT_TYPES } from "@/lib/events/eventTypes";
import { recordStudentEvent } from "@/lib/events/recordStudentEvent";

const schema = z.object({
  studentUserId: z.string().optional(),
  responses: z.record(z.coerce.number().min(0).max(100)).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const studentUserId = auth.user!.role === "ADMIN" && parsed.data.studentUserId ? parsed.data.studentUserId : auth.user!.id;
  const responses = parsed.data.responses || {};
  const scores = LITERACY_STRANDS.map((strand, index) => {
    const score = Math.round(responses[strand] ?? Math.max(35, 78 - index * 6));
    return { strand, score, level: levelFromScore(score), priorityRank: index + 1 };
  });
  const decodingScore = scores.find((score) => score.strand === "DECODING")?.score || 50;
  const phase = phaseFromDecodingScore(decodingScore);

  const profile = await db.literacyProfile.upsert({
    where: { studentUserId },
    update: {
      ehriPhase: phase,
      ehriPhaseConfidence: phaseConfidence(scores.map((score) => score.score)),
      lexileEstimate: 540,
      gradeEquivalent: 4.2,
      lastDiagnosticAt: new Date(),
    },
    create: {
      studentUserId,
      ehriPhase: phase,
      ehriPhaseConfidence: phaseConfidence(scores.map((score) => score.score)),
      lexileEstimate: 540,
      gradeEquivalent: 4.2,
      lastDiagnosticAt: new Date(),
    },
  });

  await Promise.all(
    scores.map((score) =>
      db.strandScore.upsert({
        where: { literacyProfileId_strand: { literacyProfileId: profile.id, strand: score.strand } },
        update: { score: score.score, level: score.level, priorityRank: score.priorityRank, evidenceCount: { increment: 1 }, lastUpdatedAt: new Date() },
        create: { literacyProfileId: profile.id, ...score, evidenceCount: 1 },
      }),
    ),
  );
  await Promise.all(
    SYLLABLE_TYPES.map((syllableType) =>
      db.syllableTypeMastery.upsert({
        where: { literacyProfileId_syllableType: { literacyProfileId: profile.id, syllableType } },
        update: {},
        create: { literacyProfileId: profile.id, syllableType, level: "UNTESTED" },
      }),
    ),
  );
  await ensurePhonogramMasteryRecords(profile.id);

  await Promise.all(
    scores.map((score) =>
      recordStudentEvent({
        studentUserId,
        eventType: EVENT_TYPES.ITEM_ANSWER_SUBMITTED,
        context: {
          surface: "reading_buddy_diagnostic",
          itemType: "diagnostic_strand_placeholder",
          strand: score.strand,
          profileId: profile.id,
          contentSource: "TODO_FROM_CONTENT_PIPELINE",
        },
        response: { scoreBand: score.level, score: score.score },
        immediateOutcome: score.score >= 70 ? "CORRECT" : score.score >= 50 ? "PARTIAL" : "INCORRECT",
      }),
    ),
  );

  const recommendation = recommendNextLiteracyMove({ strandScores: scores });
  await db.autopilotDecision.create({ data: { literacyProfileId: profile.id, ...recommendation } });

  return NextResponse.json({ profile, strandScores: scores, contentNote: "TODO: from content pipeline", sourcePayload: json({ responses }) });
}
