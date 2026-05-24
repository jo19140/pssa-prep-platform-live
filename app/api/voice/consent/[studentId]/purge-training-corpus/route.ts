import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { canAccessStudent } from "@/lib/literacy/profile";
import { addDays } from "@/lib/voice/retention";
import { markTrainingSegmentsExcluded, updateVoiceConsent } from "@/lib/voice/consent";

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const auth = await requireUser(["PARENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const { studentId } = await params;
  if (!(await canAccessStudent(auth.user!, studentId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await updateVoiceConsent({
    studentUserId: studentId,
    actor: auth.user!,
    trainingCorpusOptedIn: false,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent"),
  });
  await markTrainingSegmentsExcluded(studentId);
  return NextResponse.json({ status: "PURGE_SCHEDULED", expectedCompletionDate: addDays(new Date(), 30).toISOString() });
}
