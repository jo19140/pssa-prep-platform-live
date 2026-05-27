import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DiagnosticItemReviewWorkspace } from "@/components/admin/content/DiagnosticItemReviewWorkspace";
import { authOptions } from "@/lib/auth";
import { getDiagnosticItemReviewDetail } from "@/lib/content/diagnosticItemReview";

export default async function AdminDiagnosticItemReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const item = await getDiagnosticItemReviewDetail((await params).id);
  if (!item) redirect("/admin/content/diagnostic-items/queue");

  return <DiagnosticItemReviewWorkspace item={JSON.parse(JSON.stringify(item))} />;
}
