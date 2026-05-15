import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/classCodes";
import { getClientIp } from "@/lib/rateLimit";
import { sendStudentConsentCompleteEmail } from "@/lib/compliance";

const consentSchema = z.object({
  token: z.string().min(20).max(256),
  guardian: z.literal(true),
  adult: z.literal(true),
  consent: z.literal(true),
  signature: z.string().trim().min(2).max(120),
});

export async function POST(req: Request) {
  const parsed = consentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid consent confirmation.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const pending = await db.pendingStudentSignup.findUnique({ where: { verificationToken: parsed.data.token } });
  if (!pending || pending.expiresAt < new Date()) return NextResponse.json({ error: "This consent link is invalid or expired." }, { status: 400 });

  const classRoom = await db.classRoom.findUnique({ where: { joinCode: normalizeJoinCode(pending.joinCode) }, include: { school: true } });
  if (!classRoom || !classRoom.joinEnabled) return NextResponse.json({ error: "The class code is no longer active." }, { status: 400 });
  const existing = await db.user.findUnique({ where: { email: pending.email } });
  if (existing) return NextResponse.json({ error: "This student account already exists." }, { status: 409 });

  const user = await db.user.create({
    data: {
      email: pending.email,
      name: pending.name,
      passwordHash: pending.passwordHash,
      role: "STUDENT",
      dateOfBirth: pending.dateOfBirth,
      parentalConsentRequired: true,
      parentalConsentAt: new Date(),
    },
  });
  const studentProfile = await db.studentProfile.create({
    data: {
      userId: user.id,
      grade: classRoom.grade,
      schoolId: classRoom.schoolId,
      schoolName: classRoom.school?.name || "PSSA Prep Class",
      teacherId: classRoom.teacherId,
    },
  });
  await db.enrollment.create({ data: { classRoomId: classRoom.id, studentProfileId: studentProfile.id } });
  await db.parentalConsent.create({
    data: {
      studentUserId: user.id,
      parentName: pending.parentName,
      parentEmail: pending.parentEmail,
      parentPhone: pending.parentPhone,
      consentVersion: pending.consentVersion,
      consentText: `${pending.consentText}\n\nE-signature: ${parsed.data.signature}`,
      consentedAt: new Date(),
      verifiedAt: new Date(),
      ipAddress: getClientIp(req),
    },
  });
  await db.pendingStudentSignup.delete({ where: { id: pending.id } });
  await sendStudentConsentCompleteEmail({ email: user.email, name: user.name });
  return NextResponse.json({ ok: true });
}
