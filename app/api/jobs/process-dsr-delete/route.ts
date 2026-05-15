import { NextResponse } from "next/server";
import { z } from "zod";
import { processDsrDelete } from "@/lib/dsrProcessor";
import { verifyQstashSignature } from "@/lib/jobs";

const schema = z.object({ requestId: z.string().min(1).max(128) });

export async function POST(req: Request) {
  const rawBody = await req.text();
  const verified = await verifyQstashSignature(req, rawBody);
  if (!verified) return NextResponse.json({ error: "Invalid QStash signature." }, { status: 401 });
  const parsed = schema.safeParse(JSON.parse(rawBody || "{}"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  await processDsrDelete(parsed.data.requestId);
  return NextResponse.json({ ok: true });
}
