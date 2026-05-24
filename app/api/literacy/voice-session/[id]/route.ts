import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { canAccessStudent } from "@/lib/literacy/profile";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const session = await db.voiceSession.findUnique({ where: { id }, include: { literacyProfile: true } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await canAccessStudent(auth.user!, session.literacyProfile.studentUserId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ session });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["PARENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const session = await db.voiceSession.findUnique({ where: { id }, include: { literacyProfile: true } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await canAccessStudent(auth.user!, session.literacyProfile.studentUserId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updated = await db.voiceSession.update({ where: { id }, data: { audioStorageKey: null } });
  return NextResponse.json({ session: updated });
}
