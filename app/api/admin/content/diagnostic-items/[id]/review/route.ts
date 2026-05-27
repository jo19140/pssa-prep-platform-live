import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { reviewDiagnosticItem } from "@/lib/content/diagnosticItemReview";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "EDIT"]),
  reviewNotes: z.string().trim().max(4000).optional().nullable(),
  studentPromptJson: z.unknown().optional(),
  stimulusJson: z.unknown().optional().nullable(),
  expectedResponseJson: z.unknown().optional(),
  scoringRubricJson: z.unknown().optional(),
  adminReviewJson: z.unknown().optional().nullable(),
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

  const { action, reviewNotes } = parsed.data;
  const studentPromptJson = parseJsonLike(parsed.data.studentPromptJson, "studentPromptJson");
  if (studentPromptJson.ok === false) return NextResponse.json({ error: studentPromptJson.error }, { status: 400 });
  const stimulusJson = parseJsonLike(parsed.data.stimulusJson, "stimulusJson");
  if (stimulusJson.ok === false) return NextResponse.json({ error: stimulusJson.error }, { status: 400 });
  const expectedResponseJson = parseJsonLike(parsed.data.expectedResponseJson, "expectedResponseJson");
  if (expectedResponseJson.ok === false) return NextResponse.json({ error: expectedResponseJson.error }, { status: 400 });
  const scoringRubricJson = parseJsonLike(parsed.data.scoringRubricJson, "scoringRubricJson");
  if (scoringRubricJson.ok === false) return NextResponse.json({ error: scoringRubricJson.error }, { status: 400 });
  const adminReviewJson = parseJsonLike(parsed.data.adminReviewJson, "adminReviewJson");
  if (adminReviewJson.ok === false) return NextResponse.json({ error: adminReviewJson.error }, { status: 400 });

  if (
    action === "EDIT" &&
    studentPromptJson.value === undefined &&
    stimulusJson.value === undefined &&
    expectedResponseJson.value === undefined &&
    scoringRubricJson.value === undefined &&
    adminReviewJson.value === undefined
  ) {
    return NextResponse.json({ error: "Edit requires at least one diagnostic item JSON field." }, { status: 400 });
  }

  const result = await reviewDiagnosticItem((await params).id, {
    action,
    reviewerUserId: auth.user.id,
    reviewNotes,
    studentPromptJson: studentPromptJson.value as Prisma.InputJsonValue | undefined,
    stimulusJson: stimulusJson.value as Prisma.InputJsonValue | null | undefined,
    expectedResponseJson: expectedResponseJson.value as Prisma.InputJsonValue | undefined,
    scoringRubricJson: scoringRubricJson.value as Prisma.InputJsonValue | undefined,
    adminReviewJson: adminReviewJson.value as Prisma.InputJsonValue | null | undefined,
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
