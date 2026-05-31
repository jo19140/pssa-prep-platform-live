import { NextResponse } from "next/server";
import { canReadAdultDiagnostic, currentAdultUser, getLatestCompletedDiagnosticSession } from "@/lib/literacy/diagnosticResultsData";
import { toParentPayload } from "@/lib/literacy/diagnosticResultsPayload";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ childId: string }> }) {
  const user = await currentAdultUser();
  if (!user || user.role !== "PARENT") return notFound();
  const { childId } = await params;
  if (!(await canReadAdultDiagnostic(user, childId))) return notFound();
  const session = await getLatestCompletedDiagnosticSession(childId);
  if (!session?.resultJson) return NextResponse.json({ result: null });
  return NextResponse.json({ result: toParentPayload(session.resultJson) });
}
