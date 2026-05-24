import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ExportPanel } from "@/components/admin/dataflywheel/ExportPanel";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminDataFlywheelExportsPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const batches = await db.eventExportBatch.findMany({ orderBy: { exportedAt: "desc" }, take: 50 });
  return <ExportPanel batches={batches} />;
}
