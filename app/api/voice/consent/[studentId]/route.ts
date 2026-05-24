import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { canAccessStudent } from "@/lib/literacy/profile";
import { ensureVoiceConsent, updateVoiceConsent } from "@/lib/voice/consent";
import { db } from "@/lib/db";

const schema = z.object({
  serviceAudioRetained: z.boolean().optional(),
  serviceAudioRetentionDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional(),
  trainingCorpusOptedIn: z.boolean().optional(),
  researchPublicationOptedIn: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const studentId = await resolveStudentId((await params).studentId, auth.user!);
  if (!(await canAccessStudent(auth.user!, studentId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const consent = await ensureVoiceConsent(studentId, auth.user!);
  return NextResponse.json({ consent, needsRefresh: consent.consentTextVersion !== "voice-consent-v1.0" });
}

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const auth = await requireUser(["PARENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const studentId = await resolveStudentId((await params).studentId, auth.user!);
  if (!(await canAccessStudent(auth.user!, studentId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const consent = await updateVoiceConsent({
    studentUserId: studentId,
    actor: auth.user!,
    ...parsed.data,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent"),
  });
  return NextResponse.json({ consent });
}

async function resolveStudentId(raw: string, user: { id: string; role: string }) {
  if (raw !== "self") return raw;
  if (user.role === "STUDENT") return user.id;
  if (user.role === "PARENT") {
    const parent = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: { children: { include: { studentProfile: true }, take: 1 } },
    });
    return parent?.children[0]?.studentProfile.userId || "";
  }
  return user.id;
}
