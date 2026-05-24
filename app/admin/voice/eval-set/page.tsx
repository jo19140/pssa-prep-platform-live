import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { EvalSetManager } from "@/components/admin/voice/EvalSetManager";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminVoiceEvalSetPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const segments = await db.labeledVoiceSegment.findMany({ where: { isEvalSet: true }, orderBy: { labeledAt: "desc" }, take: 100 });
  return <EvalSetManager segments={segments} />;
}
