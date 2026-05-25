import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { EVENT_TYPES } from "@/lib/events/eventTypes";
import { recordStudentEvent } from "@/lib/events/recordStudentEvent";

const schema = z.object({
  surface: z.string().trim().min(1).max(80),
  itemId: z.string().trim().min(1).max(120),
  itemType: z.string().trim().min(1).max(80).default("placeholder"),
  isCorrect: z.boolean().optional(),
  responseKind: z.string().trim().min(1).max(80).optional(),
  durationMs: z.coerce.number().int().min(0).max(30 * 60 * 1000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const event = await recordStudentEvent({
    studentUserId: auth.user!.id,
    eventType: EVENT_TYPES.ITEM_ANSWER_SUBMITTED,
    context: {
      surface: parsed.data.surface,
      itemId: parsed.data.itemId,
      itemType: parsed.data.itemType,
      contentSource: "TODO_FROM_CONTENT_PIPELINE",
    },
    response: { responseKind: parsed.data.responseKind || "placeholder_selection" },
    durationMs: parsed.data.durationMs,
    immediateOutcome: typeof parsed.data.isCorrect === "boolean" ? (parsed.data.isCorrect ? "CORRECT" : "INCORRECT") : undefined,
  });
  return NextResponse.json({ ok: true, eventId: event?.id || null });
}
