import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueDsrJob } from "@/lib/compliance";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recent = await db.dataSubjectRequest.findFirst({
    where: { userId, requestType: "EXPORT", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent) return NextResponse.json({ error: "Only one export request is allowed every 24 hours.", requestId: recent.id }, { status: 429 });
  const request = await db.dataSubjectRequest.create({ data: { userId, requestType: "EXPORT", status: "PENDING" } });
  await enqueueDsrJob(request.id, "EXPORT");
  return NextResponse.json({ requestId: request.id, status: request.status });
}
