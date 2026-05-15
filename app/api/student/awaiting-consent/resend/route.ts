import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { createComplianceToken, sendParentConsentEmail } from "@/lib/compliance";
import { db } from "@/lib/db";

const resendSchema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(req: Request) {
  const limit = await consumeRateLimit({ key: `consent-resend:ip:${getClientIp(req)}`, capacity: 5, refillIntervalMs: 60 * 60 * 1000 });
  if (!limit.allowed) return NextResponse.json({ ok: true });
  const parsed = resendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const pending = await db.pendingStudentSignup.findFirst({ where: { email: parsed.data.email.toLowerCase(), expiresAt: { gt: new Date() } } });
  if (pending) {
    const token = createComplianceToken();
    await db.pendingStudentSignup.update({ where: { id: pending.id }, data: { verificationToken: token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    await sendParentConsentEmail({ parentEmail: pending.parentEmail, parentName: pending.parentName, studentName: pending.name, token });
  }
  return NextResponse.json({ ok: true });
}
