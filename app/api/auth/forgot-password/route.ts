import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/accountTokens";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(req: Request) {
  const parsed = forgotPasswordSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const email = parsed.data.email.toLowerCase();
  const ipLimit = await consumeRateLimit({ key: `forgot-password:ip:${getClientIp(req)}`, capacity: 5, refillIntervalMs: 60 * 60 * 1000 });
  const emailLimit = await consumeRateLimit({ key: `forgot-password:email:${email}`, capacity: 3, refillIntervalMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed || !emailLimit.allowed) return NextResponse.json({ ok: true });

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail({ email: user.email, name: user.name, token });
  }

  return NextResponse.json({ ok: true });
}
