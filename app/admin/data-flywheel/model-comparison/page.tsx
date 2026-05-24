import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ModelComparisonPanel } from "@/components/admin/dataflywheel/ModelComparisonPanel";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminModelComparisonPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const params = (await searchParams) || {};
  const decisionType = typeof params.decisionType === "string" ? params.decisionType : undefined;
  const rows = await db.modelDecision.groupBy({
    by: ["decisionType", "modelProvider", "modelName", "modelVersion"],
    where: { decisionType },
    _count: { _all: true },
    _avg: { costUsd: true, inferenceMs: true },
    orderBy: [{ decisionType: "asc" }, { modelProvider: "asc" }, { modelName: "asc" }],
    take: 50,
  });
  return <ModelComparisonPanel rows={rows as any[]} />;
}
