import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmDeletionByToken } from "@/lib/compliance";

const confirmSchema = z.object({ token: z.string().min(20).max(256), email: z.string().trim().email().max(254) });

export async function POST(req: Request) {
  const parsed = confirmSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const request = await confirmDeletionByToken(parsed.data.token, parsed.data.email);
  if (!request) return NextResponse.json({ error: "Invalid or expired deletion request." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
