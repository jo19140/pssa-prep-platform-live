import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { getPassageReviewStats, getPassagesForReview, type PassageReviewFilter, type PassageReviewStatus } from "@/lib/literacy/passageReview";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;

  const rate = await consumeRateLimit({
    key: `admin-content-passages-queue:${auth.user.id}:${getClientIp(req)}`,
    capacity: 120,
    refillIntervalMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
  }

  const url = new URL(req.url);
  const filter = queueFilterFromSearchParams(url.searchParams);
  const [items, stats] = await Promise.all([
    getPassagesForReview(filter),
    getPassageReviewStats(),
  ]);

  return NextResponse.json({ items, stats, activeFilter: filter });
}

function queueFilterFromSearchParams(params: URLSearchParams): PassageReviewFilter {
  const reviewStatus = params.get("reviewStatus")?.toUpperCase() || params.get("status")?.toUpperCase();
  if (isReviewStatus(reviewStatus)) return { reviewStatus };
  const firstLookRecommendation = params.get("firstLookRecommendation")?.toUpperCase() || params.get("recommendation")?.toUpperCase();
  if (firstLookRecommendation === "APPROVE" || firstLookRecommendation === "FLAG_FOR_HUMAN" || firstLookRecommendation === "REJECT" || firstLookRecommendation === "UNEVALUATED") {
    return { firstLookRecommendation };
  }
  return { reviewStatus: "PENDING" };
}

function isReviewStatus(value: string | undefined): value is PassageReviewStatus {
  return value === "PENDING" || value === "EDITED" || value === "APPROVED" || value === "REJECTED";
}
