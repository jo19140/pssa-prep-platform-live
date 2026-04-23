import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { assessmentId } = await req.json();
  const testSession = await db.testSession.create({ data: { userId: (session.user as any).id, assessmentId } });
  return NextResponse.json({ sessionId: testSession.id });
}
