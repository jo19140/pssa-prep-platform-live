import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { loadDiagnosticSessionState, selectNextStudentItem } from "@/lib/literacy/diagnosticSessionService";

export async function GET() {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;

  const session = await db.diagnosticSession.findFirst({
    where: {
      studentUserId: auth.user!.id,
      completedAt: null,
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (!session) return NextResponse.json({ session: null });

  const state = await loadDiagnosticSessionState(session.id);
  if (!state.session) return NextResponse.json({ session: null });

  const next = selectNextStudentItem({ attempts: state.session.attempts, pool: state.pool });
  return NextResponse.json({ session: { id: state.session.id, startedAt: state.session.startedAt }, sessionId: state.session.id, ...next });
}
