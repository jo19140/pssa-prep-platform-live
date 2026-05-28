import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { getDiagnosticItemReviewQueue, getDiagnosticItemReviewQueueCounts, type DiagnosticItemQueueFilter } from "@/lib/content/diagnosticItemReview";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;

  const rate = await consumeRateLimit({
    key: `admin-content-diagnostic-items-queue:${auth.user.id}:${getClientIp(req)}`,
    capacity: 120,
    refillIntervalMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
  }

  const url = new URL(req.url);
  const filter = queueFilterFromSearchParams(url.searchParams);
  const [items, counts] = await Promise.all([
    getDiagnosticItemReviewQueue(filter),
    getDiagnosticItemReviewQueueCounts(),
  ]);

  return NextResponse.json({ items, counts, activeFilter: filter });
}

function queueFilterFromSearchParams(params: URLSearchParams): DiagnosticItemQueueFilter {
  const status = params.get("status")?.toUpperCase();
  if (status === "EDITED" || status === "APPROVED" || status === "REJECTED" || status === "PENDING") {
    return { kind: "status", status };
  }

  const recommendation = params.get("recommendation")?.toUpperCase();
  if (recommendation === "REJECT" || recommendation === "FLAG_FOR_HUMAN") {
    return { kind: "recommendation", recommendation };
  }

  return { kind: "status", status: "PENDING" };
}
