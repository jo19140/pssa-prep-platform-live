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
  audioConfidence: z.number().min(0).max(1).optional(),
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

  const score = await scoreDiagnosticAttempt({
    item,
    responseJson: parsed.data.responseJson,
    responseTimeMs: parsed.data.responseTimeMs,
    audioConfidence: parsed.data.audioConfidence,
    studentUserId: session.studentUserId,
  });

  await db.diagnosticItemAttempt.create({
    data: {
      studentUserId: session.studentUserId,
      diagnosticItemId: item.id,
      diagnosticSessionId: session.id,
      responseJson: parsed.data.responseJson === undefined ? Prisma.JsonNull : (parsed.data.responseJson as Prisma.InputJsonValue),
      scored: score.scored,
      correct: score.correct,
      responseTimeMs: parsed.data.responseTimeMs,
      delayed: score.delayed,
      audioConfidence: parsed.data.audioConfidence,
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
