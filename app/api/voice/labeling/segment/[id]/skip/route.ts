import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

const schema = z.object({ reason: z.string().trim().max(1000).default("low_value_or_bad_audio") });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN", "VOICE_ANNOTATOR"]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const segment = await db.labeledVoiceSegment.update({
    where: { id },
    data: { skippedAt: new Date(), skippedByUserId: auth.user!.id, skipReason: parsed.success ? parsed.data.reason : "low_value_or_bad_audio" },
  });
  return NextResponse.json({ segment });
}
