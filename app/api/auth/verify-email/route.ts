import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashAccountToken } from "@/lib/accountTokens";

const verifyEmailSchema = z.object({
  token: z.string().trim().min(32).max(256),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = verifyEmailSchema.safeParse({ token: url.searchParams.get("token") || "" });
  if (!parsed.success) return NextResponse.redirect(new URL("/login?verified=0", req.url));

  const tokenHash = hashAccountToken(parsed.data.token);
  const verification = await db.verificationToken.findUnique({ where: { tokenHash } });
  if (!verification || verification.usedAt || verification.expiresAt <= new Date()) {
    return NextResponse.redirect(new URL("/login?verified=0", req.url));
  }

  await db.$transaction([
    db.user.update({ where: { id: verification.userId }, data: { emailVerifiedAt: new Date() } }),
    db.verificationToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
