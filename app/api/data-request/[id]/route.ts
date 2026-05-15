import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const request = await db.dataSubjectRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  if (role !== "ADMIN" && request.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ request });
}
