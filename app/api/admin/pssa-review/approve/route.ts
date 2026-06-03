import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { approvePssaItem, pssaMinimalMutationResponse, pssaNoStoreHeaders } from "@/lib/content/pssaItemReview";
import { getStudentReadyPssaItems } from "@/scripts/content/lib/pssa-student-ready-selector";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["item", "passage"]),
  reason: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return withNoStore(auth.error);

  const origin = requireSameOrigin(req);
  if (origin.ok === false) return NextResponse.json({ error: origin.error }, { status: 403, headers: pssaNoStoreHeaders() });
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415, headers: pssaNoStoreHeaders() });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400, headers: pssaNoStoreHeaders() });
  }

  const rate = await consumeRateLimit({
    key: `admin-pssa-review-approve:${auth.user.id}:${getClientIp(req)}`,
    capacity: 60,
    refillIntervalMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: pssaNoStoreHeaders({ "Retry-After": String(rate.retryAfterSec) }) });
  }

  const result = await approvePssaItem(db, {
    id: parsed.data.id,
    kind: parsed.data.kind,
    reason: parsed.data.reason,
    reviewerUserId: auth.user.id,
  });
  if ("status" in result) {
    return NextResponse.json({ blockedReason: result.blockedReason, detail: result.detail }, { status: result.status, headers: pssaNoStoreHeaders() });
  }
  const refreshedStudentReadyCount = (await getStudentReadyPssaItems(db, { gradeLevel: 3, subject: "ELA" })).length;
  return NextResponse.json(pssaMinimalMutationResponse(result, refreshedStudentReadyCount), { headers: pssaNoStoreHeaders() });
}

function requireSameOrigin(req: Request): { ok: true } | { ok: false; error: string } {
  const expected = new URL(req.url).origin;
  const origin = req.headers.get("origin");
  if (origin) return origin === expected ? { ok: true } : { ok: false, error: "Cross-origin mutation rejected." };
  const referer = req.headers.get("referer");
  if (!referer) return { ok: false, error: "Missing Origin/Referer for mutation." };
  return new URL(referer).origin === expected ? { ok: true } : { ok: false, error: "Cross-origin mutation rejected." };
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
