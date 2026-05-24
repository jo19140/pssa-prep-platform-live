import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const where: Prisma.StudentEventWhereInput = {};
  const eventType = searchParams.get("eventType");
  const studentUserId = searchParams.get("studentUserId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (eventType) where.eventType = { in: eventType.split(",").filter(Boolean) };
  if (studentUserId) where.studentUserId = studentUserId;
  if (from || to) where.occurredAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));
  const events = await db.studentEvent.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { outcomes: true, modelDecisions: { select: { id: true } } },
  });
  return NextResponse.json({ events });
}
