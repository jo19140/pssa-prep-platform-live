import { NextResponse } from "next/server";
import { z } from "zod";
import { processAiJob } from "@/lib/aiJobProcessor";
import { verifyQstashSignature } from "@/lib/jobs";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const processAiJobSchema = z.object({
  jobId: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await consumeRateLimit({ key: `process-ai:ip:${ip}`, capacity: 200, refillIntervalMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  const rawBody = await req.text();
  const verified = await verifyQstashSignature(req, rawBody);
  if (!verified) return NextResponse.json({ error: "Invalid QStash signature." }, { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = processAiJobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });

  await processAiJob(parsed.data.jobId);
  return NextResponse.json({ ok: true });
}
