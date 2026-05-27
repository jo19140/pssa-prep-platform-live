import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { reviewDiagnosticItem } from "@/lib/content/diagnosticItemReview";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "EDIT"]),
  reviewNotes: z.string().trim().max(4000).optional().nullable(),
  promptJson: z.unknown().optional(),
  scoringRubricJson: z.unknown().optional().nullable(),
  correctAnswer: z.string().trim().max(400).optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;

  const rate = await consumeRateLimit({
    key: `admin-content-diagnostic-items-review:${auth.user.id}:${getClientIp(req)}`,
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

  const { action, reviewNotes, correctAnswer } = parsed.data;
  const promptJson = parseJsonLike(parsed.data.promptJson, "promptJson");
  if (promptJson.ok === false) return NextResponse.json({ error: promptJson.error }, { status: 400 });
  const scoringRubricJson = parseJsonLike(parsed.data.scoringRubricJson, "scoringRubricJson");
  if (scoringRubricJson.ok === false) return NextResponse.json({ error: scoringRubricJson.error }, { status: 400 });

  if (action === "EDIT" && promptJson.value === undefined && scoringRubricJson.value === undefined && correctAnswer === undefined) {
    return NextResponse.json({ error: "Edit requires promptJson, scoringRubricJson, or correctAnswer." }, { status: 400 });
  }

  const result = await reviewDiagnosticItem((await params).id, {
    action,
    reviewerUserId: auth.user.id,
    reviewNotes,
    correctAnswer,
    promptJson: promptJson.value as Prisma.InputJsonValue | undefined,
    scoringRubricJson: scoringRubricJson.value as Prisma.InputJsonValue | null | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ item: result.updated, outcome: result.outcome });
}

function parseJsonLike(value: unknown, label: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: true, value };
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false, error: `${label} must be valid JSON.` };
  }
}
