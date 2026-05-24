import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const where: Prisma.ModelDecisionWhereInput = {};
  const decisionType = searchParams.get("decisionType");
  const modelProvider = searchParams.get("modelProvider");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (decisionType) where.decisionType = { in: decisionType.split(",").filter(Boolean) };
  if (modelProvider) where.modelProvider = modelProvider;
  if (from || to) where.occurredAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));
  const decisions = await db.modelDecision.findMany({ where, orderBy: { occurredAt: "desc" }, take: limit, include: { outcomes: true } });
  const totals = decisions.reduce(
    (acc, decision) => ({
      count: acc.count + 1,
      costUsd: acc.costUsd + Number(decision.costUsd || 0),
      inferenceMs: acc.inferenceMs + Number(decision.inferenceMs || 0),
    }),
    { count: 0, costUsd: 0, inferenceMs: 0 },
  );
  return NextResponse.json({ decisions, totals: { ...totals, meanInferenceMs: totals.count ? totals.inferenceMs / totals.count : 0 } });
}
