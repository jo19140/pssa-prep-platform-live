import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DecisionExplorerPage } from "@/components/admin/decisions/DecisionExplorerPage";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminDecisionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const params = (await searchParams) || {};
  const decisionType = typeof params.decisionType === "string" ? params.decisionType : "";
  const decisions = await db.modelDecision.findMany({ where: decisionType ? { decisionType } : undefined, orderBy: { occurredAt: "desc" }, take: 100 });
  return <DecisionExplorerPage decisions={decisions} />;
}
