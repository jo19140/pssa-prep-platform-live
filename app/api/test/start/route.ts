import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const startTestSchema = z.object({
  assessmentId: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = startTestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { assessmentId } = parsed.data;
  const testSession = await db.testSession.create({ data: { userId: (session.user as any).id, assessmentId } });
  return NextResponse.json({ sessionId: testSession.id });
}
