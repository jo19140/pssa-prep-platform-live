import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { completionBlockers, diagnosticResultJson, loadDiagnosticSessionState } from "@/lib/literacy/diagnosticSessionService";

export async function POST(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const { sessionId } = await params;
  const { session, pool } = await loadDiagnosticSessionState(sessionId);
  if (!session) return NextResponse.json({ error: "diagnostic_session_not_found" }, { status: 404 });
  if (auth.user!.role !== "ADMIN" && session.studentUserId !== auth.user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.completedAt) {
    return NextResponse.json({ sessionComplete: true, sessionId: session.id, resultJson: session.resultJson, reasonCode: "SESSION_ALREADY_COMPLETE" });
  }

  const attempts = session.attempts.map((attempt) => ({
    diagnosticItemId: attempt.diagnosticItemId,
    scored: attempt.scored,
    correct: attempt.correct,
    isPracticeAttempt: attempt.isPracticeAttempt,
    item: attempt.diagnosticItem,
  }));
  const blockers = completionBlockers(attempts, pool);
  if (blockers.length) {
    return NextResponse.json({ error: "diagnostic_evidence_floor_not_met", details: { blockers } }, { status: 409 });
  }

  const resultJson = diagnosticResultJson(attempts);
  const updated = await db.diagnosticSession.update({
    where: { id: session.id },
    data: {
      completedAt: new Date(),
      resultJson,
      totalScoredItems: attempts.filter((attempt) => attempt.scored && !attempt.isPracticeAttempt).length,
      audioClearItems: attempts.filter((attempt) => attempt.scored && !attempt.isPracticeAttempt).length,
    },
  });
  return NextResponse.json({ sessionComplete: true, sessionId: updated.id, resultJson });
}
