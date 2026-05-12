import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { createVerificationToken, sendVerificationEmail } from "@/lib/accountTokens";

const teacherRegisterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  schoolName: z.string().trim().max(160).optional(),
});

export async function POST(req: Request) {
  const ipLimit = await consumeRateLimit({ key: `teacher-register:ip:${getClientIp(req)}`, capacity: 10, refillIntervalMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } });
  }

  const parsed = teacherRegisterSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "This email already has an account." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const schoolName = parsed.data.schoolName || "PSSA Prep School";
  const user = await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      role: "TEACHER",
      teacherProfile: {
        create: {
          schoolName,
        },
      },
    },
  });

  const verificationToken = await createVerificationToken(user.id);
  await sendVerificationEmail({ email: user.email, name: user.name, token: verificationToken });

  return NextResponse.json({ teacher: { id: user.id, name: user.name, email: user.email } });
}
