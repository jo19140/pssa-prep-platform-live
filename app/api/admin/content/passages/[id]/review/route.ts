import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { reviewPassage } from "@/lib/literacy/passageReview";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "EDIT"]),
  reviewNotes: z.string().trim().max(4000).optional().nullable(),
  editedText: z.string().optional(),
  editedVocabularyAllowlist: z.array(z.string()).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;

  const rate = await consumeRateLimit({
    key: `admin-content-passages-review:${auth.user.id}:${getClientIp(req)}`,
    capacity: 60,
    refillIntervalMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
  }

  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const body = parsed.data;
  const result = await reviewPassage((await params).id, body.action === "EDIT"
    ? {
        action: "EDIT",
        reviewerUserId: auth.user.id,
        reviewNotes: body.reviewNotes,
        editedText: body.editedText || "",
        editedVocabularyAllowlist: body.editedVocabularyAllowlist,
      }
    : {
        action: body.action,
        reviewerUserId: auth.user.id,
        reviewNotes: body.reviewNotes,
      });

  if (result.ok === false) {
    return NextResponse.json({ error: result.error, blockers: "blockers" in result ? result.blockers : undefined, auditFailures: "auditFailures" in result ? result.auditFailures : undefined }, { status: result.status });
  }

  return NextResponse.json(result);
}
