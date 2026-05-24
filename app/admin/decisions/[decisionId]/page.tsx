import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DecisionDetailPage } from "@/components/admin/decisions/DecisionExplorerPage";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminDecisionDetailPage({ params }: { params: Promise<{ decisionId: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const decision = await db.modelDecision.findUnique({
    where: { id: (await params).decisionId },
    include: { outcomes: true, childDecisions: true, parentDecision: true, studentEvent: true },
  });
  if (!decision) redirect("/admin/decisions");
  return <DecisionDetailPage decision={decision} />;
}
