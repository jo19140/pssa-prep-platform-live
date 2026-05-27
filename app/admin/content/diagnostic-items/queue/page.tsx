import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DiagnosticItemReviewQueuePage } from "@/components/admin/content/DiagnosticItemReviewQueuePage";
import { authOptions } from "@/lib/auth";
import { countStudentReadyDiagnosticItems, getPendingDiagnosticItemReviewQueue } from "@/lib/content/diagnosticItemReview";

export default async function AdminDiagnosticItemQueuePage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const [items, approvedPoolCount] = await Promise.all([
    getPendingDiagnosticItemReviewQueue(),
    countStudentReadyDiagnosticItems(),
  ]);

  return <DiagnosticItemReviewQueuePage items={items} approvedPoolCount={approvedPoolCount} />;
}
