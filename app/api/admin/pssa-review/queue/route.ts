import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { getPssaReviewQueue, pssaNoStoreHeaders, type PssaReviewQueueFilter } from "@/lib/content/pssaItemReview";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return withNoStore(auth.error);

  const rate = await consumeRateLimit({
    key: `admin-pssa-review-queue:${auth.user.id}:${getClientIp(req)}`,
    capacity: 120,
    refillIntervalMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: pssaNoStoreHeaders({ "Retry-After": String(rate.retryAfterSec) }) });
  }

  const url = new URL(req.url);
  const queue = await getPssaReviewQueue(queueFilterFromSearchParams(url.searchParams));
  return NextResponse.json(queue, { headers: pssaNoStoreHeaders() });
}

function queueFilterFromSearchParams(params: URLSearchParams): PssaReviewQueueFilter {
  const grade = Number(params.get("grade") || 3);
  const status = params.get("status")?.toUpperCase();
  return {
    gradeLevel: Number.isFinite(grade) ? grade : 3,
    status: status === "APPROVED" || status === "REJECTED" || status === "PENDING" ? status : "PENDING",
  };
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
