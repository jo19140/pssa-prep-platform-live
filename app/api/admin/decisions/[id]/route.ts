import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const decision = await db.modelDecision.findUnique({
    where: { id: (await params).id },
    include: { outcomes: true, childDecisions: true, parentDecision: true, studentEvent: true },
  });
  if (!decision) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ decision });
}
