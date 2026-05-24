import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { canAccessStudent, ensureLiteracyProfile } from "@/lib/literacy/profile";
import { db } from "@/lib/db";

const schema = z.object({
  studentUserId: z.string().optional(),
  homeLanguages: z.array(z.string().trim().min(1).max(24)).default([]),
  regionalDialects: z.array(z.string().trim().min(1).max(40)).default([]),
  skipped: z.boolean().default(false),
});

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "PARENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  let targetStudentUserId = auth.user!.id;
  if (auth.user!.role === "PARENT") {
    targetStudentUserId = parsed.data.studentUserId || "";
    if (!targetStudentUserId) {
      const parent = await db.parentProfile.findUnique({
        where: { userId: auth.user!.id },
        include: { children: { include: { studentProfile: true }, take: 1 } },
      });
      targetStudentUserId = parent?.children[0]?.studentProfile.userId || "";
    }
    if (!targetStudentUserId || !(await canAccessStudent(auth.user!, targetStudentUserId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const profile = await ensureLiteracyProfile(targetStudentUserId);
  const settings = await db.dialectSettings.upsert({
    where: { literacyProfileId: profile.id },
    update: {
      homeLanguages: parsed.data.homeLanguages,
      regionalDialects: parsed.data.regionalDialects,
      skippedAt: parsed.data.skipped ? new Date() : undefined,
      optedInAt: !parsed.data.skipped ? new Date() : undefined,
    },
    create: {
      literacyProfileId: profile.id,
      homeLanguages: parsed.data.homeLanguages,
      regionalDialects: parsed.data.regionalDialects,
      skippedAt: parsed.data.skipped ? new Date() : undefined,
      optedInAt: !parsed.data.skipped ? new Date() : undefined,
    },
  });
  return NextResponse.json({ settings });
}
