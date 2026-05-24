import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireUser(["ADMIN", "VOICE_ANNOTATOR"]);
  if (auth.error) return auth.error;
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") || 50), 100);
  const segments = await db.labeledVoiceSegment.findMany({
    where: { labeledAt: null, skippedAt: null },
    orderBy: [{ uncertaintyScore: "desc" }, { createdAt: "asc" }],
    take: limit,
    include: { voiceSession: { include: { literacyProfile: { include: { student: { include: { studentProfile: true } } } } } } },
  });
  return NextResponse.json({ segments });
}
