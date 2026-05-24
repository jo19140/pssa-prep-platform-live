import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const decisionType = searchParams.get("decisionType") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rows = await db.modelDecision.groupBy({
    by: ["decisionType", "modelProvider", "modelName", "modelVersion"],
    where: {
      decisionType,
      occurredAt: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
    },
    _count: { _all: true },
    _avg: { costUsd: true, inferenceMs: true },
    orderBy: [{ decisionType: "asc" }, { modelProvider: "asc" }, { modelName: "asc" }],
    take: 50,
  });
  return NextResponse.json({ rows });
}
