import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { countStudentReadyDiagnosticItems, getPendingDiagnosticItemReviewQueue } from "@/lib/content/diagnosticItemReview";
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

  const [items, approvedPoolCount] = await Promise.all([
    getPendingDiagnosticItemReviewQueue(),
    countStudentReadyDiagnosticItems(),
  ]);

  return NextResponse.json({ items, pending: items.length, approvedPoolCount });
}
