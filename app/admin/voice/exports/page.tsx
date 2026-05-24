import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CorpusExportPanel } from "@/components/admin/voice/CorpusExportPanel";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminVoiceExportsPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const batches = await db.trainingCorpusBatch.findMany({ orderBy: { exportedAt: "desc" }, take: 25 });
  return <CorpusExportPanel batches={batches} />;
}
