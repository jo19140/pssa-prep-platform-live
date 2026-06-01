import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PassageReviewQueuePage } from "@/components/admin/content/PassageReviewQueuePage";
import { authOptions } from "@/lib/auth";
import { getPassageReviewStats, getPassagesForReview, type PassageReviewFilter, type PassageReviewStatus } from "@/lib/literacy/passageReview";

export default async function AdminPassageQueuePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const filter = queueFilterFromSearchParams(params || {});
  const [items, stats] = await Promise.all([
    getPassagesForReview(filter),
    getPassageReviewStats(),
  ]);

  return <PassageReviewQueuePage items={items} stats={stats} activeFilter={filter} />;
}

function queueFilterFromSearchParams(params: Record<string, string | string[] | undefined>): PassageReviewFilter {
  const reviewStatus = firstParam(params.reviewStatus)?.toUpperCase() || firstParam(params.status)?.toUpperCase();
  if (isReviewStatus(reviewStatus)) return { reviewStatus };
  const firstLookRecommendation = firstParam(params.firstLookRecommendation)?.toUpperCase() || firstParam(params.recommendation)?.toUpperCase();
  if (firstLookRecommendation === "APPROVE" || firstLookRecommendation === "FLAG_FOR_HUMAN" || firstLookRecommendation === "REJECT" || firstLookRecommendation === "UNEVALUATED") {
    return { firstLookRecommendation };
  }
  return { reviewStatus: "PENDING" };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isReviewStatus(value: string | undefined): value is PassageReviewStatus {
  return value === "PENDING" || value === "EDITED" || value === "APPROVED" || value === "REJECTED";
}
