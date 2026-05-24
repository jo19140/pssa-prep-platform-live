import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { canAccessStudent, ensureLiteracyProfile } from "@/lib/literacy/profile";
import { recommendNextLiteracyMove } from "@/lib/literacy/autopilot";

export async function POST(_req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const auth = await requireUser(["TEACHER", "ADMIN"]);
  if (auth.error) return auth.error;
  const { studentId } = await params;
  const allowed = await canAccessStudent(auth.user!, studentId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const profile = await ensureLiteracyProfile(studentId);
  const strandScores = await db.strandScore.findMany({ where: { literacyProfileId: profile.id } });
  const recommendation = recommendNextLiteracyMove({ strandScores });
  const decision = await db.autopilotDecision.create({ data: { literacyProfileId: profile.id, ...recommendation } });
  return NextResponse.json({ decision });
}
