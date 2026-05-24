import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["TEACHER", "ADMIN"]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const decision = await db.autopilotDecision.update({
    where: { id },
    data: { overriddenAt: new Date(), overriddenByUserId: auth.user!.id },
  });
  return NextResponse.json({ decision });
}
