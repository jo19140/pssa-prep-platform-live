import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAiFailureCounters, getLastAiFailures } from "@/lib/aiTelemetry";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    counters: getAiFailureCounters(),
    lastFailures: getLastAiFailures(),
  });
}
