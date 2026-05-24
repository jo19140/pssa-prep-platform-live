import { NextResponse } from "next/server";
import { enforceVoiceRetention } from "@/lib/voice/retentionJobs";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const purged = await enforceVoiceRetention();
  return NextResponse.json({ purged });
}
