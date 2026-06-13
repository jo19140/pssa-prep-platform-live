"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EVENT_TYPES, type EventType } from "@/lib/events/eventTypes";
import { recordStudentEvent } from "@/lib/events/recordStudentEvent";

type LessonPlayerEventType =
  | typeof EVENT_TYPES.LESSON_STARTED
  | typeof EVENT_TYPES.LESSON_STEP_COMPLETED
  | typeof EVENT_TYPES.LESSON_COMPLETED
  | typeof EVENT_TYPES.VOICE_WORD_READ
  | typeof EVENT_TYPES.VOICE_MISCUE_DETECTED;

type LessonPlayerEventInput = {
  eventType: LessonPlayerEventType;
  sessionId: string;
  partNumber: number | null;
  targetCode: string;
  extra?: Record<string, unknown>;
  response?: Record<string, unknown>;
  durationMs?: number;
  immediateOutcome?: string;
};

const ALLOWED_LESSON_EVENT_TYPES = new Set<EventType>([
  EVENT_TYPES.LESSON_STARTED,
  EVENT_TYPES.LESSON_STEP_COMPLETED,
  EVENT_TYPES.LESSON_COMPLETED,
  EVENT_TYPES.VOICE_WORD_READ,
  EVENT_TYPES.VOICE_MISCUE_DETECTED,
]);

export async function recordLessonPlayerEvent(input: LessonPlayerEventInput) {
  const session = await getServerSession(authOptions);
  const userId = typeof (session?.user as { id?: unknown } | undefined)?.id === "string" ? (session!.user as { id: string }).id : "";
  const role = String((session?.user as { role?: unknown } | undefined)?.role || "");
  if (!userId || !["STUDENT", "ADMIN"].includes(role)) return { ok: false };
  if (!ALLOWED_LESSON_EVENT_TYPES.has(input.eventType)) return { ok: false };

  await recordStudentEvent({
    studentUserId: userId,
    eventType: input.eventType,
    sessionId: input.sessionId,
    context: {
      source: "content-v3-lesson-player",
      targetCode: input.targetCode,
      partNumber: input.partNumber,
      ...(input.extra ? { activity: input.extra } : {}),
    },
    response: input.response,
    durationMs: input.durationMs,
    immediateOutcome: input.immediateOutcome as Parameters<typeof recordStudentEvent>[0]["immediateOutcome"],
  });

  return { ok: true };
}
