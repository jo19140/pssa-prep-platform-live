import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DiagnosticItemReviewQueuePage } from "@/components/admin/content/DiagnosticItemReviewQueuePage";
import { authOptions } from "@/lib/auth";
import { getDiagnosticItemReviewQueue, getDiagnosticItemReviewQueueCounts, type DiagnosticItemQueueFilter } from "@/lib/content/diagnosticItemReview";

export default async function AdminDiagnosticItemQueuePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const filter = queueFilterFromSearchParams(params || {});
  const [items, counts] = await Promise.all([
    getDiagnosticItemReviewQueue(filter),
    getDiagnosticItemReviewQueueCounts(),
  ]);

  return <DiagnosticItemReviewQueuePage items={items} counts={counts} activeFilter={filter} />;
}

function queueFilterFromSearchParams(params: Record<string, string | string[] | undefined>): DiagnosticItemQueueFilter {
  const status = firstParam(params.status)?.toUpperCase();
  if (status === "EDITED" || status === "APPROVED" || status === "REJECTED" || status === "PENDING") {
    return { kind: "status", status };
  }

  const recommendation = firstParam(params.recommendation)?.toUpperCase();
  if (recommendation === "REJECT" || recommendation === "FLAG_FOR_HUMAN") {
    return { kind: "recommendation", recommendation };
  }

  return { kind: "status", status: "PENDING" };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
