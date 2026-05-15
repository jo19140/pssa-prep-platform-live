import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { currentConsentText, consentVersion } from "@/lib/compliance";
import { db } from "@/lib/db";

const overrideSchema = z.object({
  studentUserId: z.string().min(1).max(128),
  parentName: z.string().trim().min(1).max(120),
  parentEmail: z.string().trim().email().max(254),
  method: z.string().trim().min(2).max(240),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = overrideSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: parsed.data.studentUserId } });
  if (!user) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  const consent = await db.parentalConsent.upsert({
    where: { studentUserId: user.id },
    update: {
      parentName: parsed.data.parentName,
      parentEmail: parsed.data.parentEmail.toLowerCase(),
      consentVersion: consentVersion(),
      consentText: `${currentConsentText()}\n\nManual admin override: parent confirmed via ${parsed.data.method}.`,
      consentedAt: new Date(),
      verifiedAt: new Date(),
      revokedAt: null,
      revokedReason: null,
    },
    create: {
      studentUserId: user.id,
      parentName: parsed.data.parentName,
      parentEmail: parsed.data.parentEmail.toLowerCase(),
      consentVersion: consentVersion(),
      consentText: `${currentConsentText()}\n\nManual admin override: parent confirmed via ${parsed.data.method}.`,
      consentedAt: new Date(),
      verifiedAt: new Date(),
    },
  });
  await db.user.update({ where: { id: user.id }, data: { parentalConsentRequired: true, parentalConsentAt: consent.verifiedAt || new Date() } });
  return NextResponse.json({ consent });
}
