import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { canAccessStudent, ensureLiteracyProfile } from "@/lib/literacy/profile";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const allowed = await canAccessStudent(auth.user!, id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const profile = await ensureLiteracyProfile(id);
  const decisions = await db.autopilotDecision.findMany({
    where: { literacyProfileId: profile.id },
    orderBy: { appliedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ decisions });
}
