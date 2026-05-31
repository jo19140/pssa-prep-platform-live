import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { scoreDiagnosticAttempt } from "@/lib/literacy/diagnosticScorer";
import { loadDiagnosticSessionState, selectNextStudentItem } from "@/lib/literacy/diagnosticSessionService";

const schema = z.object({
  itemId: z.string(),
  responseJson: z.unknown().optional(),
  responseTimeMs: z.number().int().nonnegative().optional(),
  latency_ms: z.number().int().nonnegative().optional(),
  audioConfidence: z.number().min(0).max(1).optional(),
  attemptType: z.enum(["response", "no_attempt", "audio_problem"]).optional(),
  reason: z.enum(["frontend_silence_timeout"]).optional(),
  silenceDurationMs: z.number().int().nonnegative().optional(),
  clientIssue: z.enum(["could_not_hear", "mic_problem", "tts_failed"]).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const { sessionId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { session } = await loadDiagnosticSessionState(sessionId);
  if (!session) return NextResponse.json({ error: "diagnostic_session_not_found" }, { status: 404 });
  if (auth.user!.role !== "ADMIN" && session.studentUserId !== auth.user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.completedAt) return NextResponse.json({ error: "diagnostic_session_complete" }, { status: 409 });

  const item = await db.diagnosticItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) return NextResponse.json({ error: "diagnostic_item_not_found" }, { status: 404 });

  const responseTimeMs = parsed.data.responseTimeMs ?? parsed.data.latency_ms ?? (parsed.data.attemptType === "no_attempt" ? parsed.data.silenceDurationMs : undefined);
  const responseJson =
    parsed.data.responseJson === undefined
      ? ({
          attemptType: parsed.data.attemptType || "response",
          reason: parsed.data.reason,
          silenceDurationMs: parsed.data.silenceDurationMs,
          clientIssue: parsed.data.clientIssue,
        } satisfies Record<string, unknown>)
      : parsed.data.responseJson;
  const audioConfidence = parsed.data.audioConfidence ?? (parsed.data.attemptType === "audio_problem" ? 0 : undefined);

  const score = await scoreDiagnosticAttempt({
    item,
    responseJson,
    responseTimeMs,
    audioConfidence,
    studentUserId: session.studentUserId,
  });

  await db.diagnosticItemAttempt.create({
    data: {
      studentUserId: session.studentUserId,
      diagnosticItemId: item.id,
      diagnosticSessionId: session.id,
      responseJson: responseJson === undefined ? Prisma.JsonNull : (responseJson as Prisma.InputJsonValue),
      scored: score.scored,
      correct: score.correct,
      responseTimeMs,
      delayed: score.delayed,
      audioConfidence,
      scoreConfidence: score.scoreConfidence,
      scoreContext: typeof score.scorerReasoningJson.reasonCode === "string" ? score.scorerReasoningJson.reasonCode : null,
      scorerReasoningJson: score.scorerReasoningJson as Prisma.InputJsonValue,
      isPracticeAttempt: item.isPracticeItem,
    },
  });

  const updated = await loadDiagnosticSessionState(session.id);
  const next = selectNextStudentItem({ attempts: updated.session?.attempts || [], pool: updated.pool });
  return NextResponse.json({ sessionId: session.id, attempt: score, ...next });
}
