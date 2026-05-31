import { NextResponse } from "next/server";
import { canReadAdultDiagnostic, currentAdultUser, getLatestCompletedDiagnosticSession } from "@/lib/literacy/diagnosticResultsData";
import { toTutorPayload } from "@/lib/literacy/diagnosticResultsPayload";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const user = await currentAdultUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) return notFound();
  const { studentId } = await params;
  if (!(await canReadAdultDiagnostic(user, studentId))) return notFound();
  const session = await getLatestCompletedDiagnosticSession(studentId);
  if (!session?.resultJson) return NextResponse.json({ result: null });
  return NextResponse.json({ result: toTutorPayload(session.resultJson) });
}
