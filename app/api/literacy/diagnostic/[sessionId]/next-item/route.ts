import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { loadDiagnosticSessionState, selectNextStudentItem } from "@/lib/literacy/diagnosticSessionService";

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const { sessionId } = await params;
  const { session, pool } = await loadDiagnosticSessionState(sessionId);
  if (!session) return NextResponse.json({ error: "diagnostic_session_not_found" }, { status: 404 });
  if (auth.user!.role !== "ADMIN" && session.studentUserId !== auth.user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.completedAt) return NextResponse.json({ sessionComplete: true, reasonCode: "SESSION_ALREADY_COMPLETE", resultJson: session.resultJson });

  const next = selectNextStudentItem({ attempts: session.attempts, pool });
  return NextResponse.json({ sessionId: session.id, ...next });
}
