import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createVerificationToken, sendVerificationEmail } from "@/lib/accountTokens";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const resendVerificationSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(req: Request) {
  const parsed = resendVerificationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const email = parsed.data.email.toLowerCase();
  const ipLimit = await consumeRateLimit({ key: `resend-verification:ip:${getClientIp(req)}`, capacity: 5, refillIntervalMs: 60 * 60 * 1000 });
  const emailLimit = await consumeRateLimit({ key: `resend-verification:email:${email}`, capacity: 3, refillIntervalMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed || !emailLimit.allowed) return NextResponse.json({ ok: true });

  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt) {
    const token = await createVerificationToken(user.id);
    await sendVerificationEmail({ email: user.email, name: user.name, token });
  }

  return NextResponse.json({ ok: true });
}
