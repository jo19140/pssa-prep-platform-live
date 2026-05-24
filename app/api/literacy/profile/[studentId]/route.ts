import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { canAccessStudent, getFullLiteracyProfile } from "@/lib/literacy/profile";

export async function GET(_req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { studentId } = await params;
  const allowed = await canAccessStudent(auth.user!, studentId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const profile = await getFullLiteracyProfile(studentId);
  return NextResponse.json({ profile, contentNote: "TODO: from content pipeline" });
}
