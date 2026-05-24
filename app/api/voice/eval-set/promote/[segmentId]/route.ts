import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ segmentId: string }> }) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const { segmentId } = await params;
  const segment = await db.labeledVoiceSegment.update({ where: { id: segmentId }, data: { isEvalSet: true } });
  return NextResponse.json({ segment });
}
