import { NextResponse } from "next/server";
import { canReadAdultDiagnostic, currentAdultUser, getCompletedDiagnosticSession } from "@/lib/literacy/diagnosticResultsData";
import { toParentPayload, toTutorPayload } from "@/lib/literacy/diagnosticResultsPayload";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await currentAdultUser();
  if (!user) return notFound();
  const { sessionId } = await params;
  const session = await getCompletedDiagnosticSession(sessionId);
  if (!session?.resultJson) return notFound();
  if (!(await canReadAdultDiagnostic(user, session.studentUserId))) return notFound();
  if (user.role === "PARENT") return NextResponse.json({ result: toParentPayload(session.resultJson) });
  if (user.role === "TEACHER" || user.role === "ADMIN") return NextResponse.json({ result: toTutorPayload(session.resultJson) });
  return notFound();
}
