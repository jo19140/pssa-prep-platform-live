import type { Prisma, StudentEvent } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays } from "@/lib/voice/retention";
import { ensureVoiceConsent } from "@/lib/voice/consent";
import type { EventType } from "./eventTypes";

type ImmediateOutcome = "CORRECT" | "INCORRECT" | "PARTIAL" | "ABANDONED" | "SELF_CORRECTED" | "TIMED_OUT" | "SKIPPED";

export interface RecordStudentEventInput {
  studentUserId: string;
  eventType: EventType;
  context: Record<string, unknown>;
  response?: Record<string, unknown>;
  durationMs?: number;
  immediateOutcome?: ImmediateOutcome;
  sessionId?: string;
  occurredAt?: Date;
  clientPlatform?: string;
  appVersion?: string;
}

export async function recordStudentEvent(input: RecordStudentEventInput): Promise<StudentEvent | null> {
  try {
    const occurredAt = input.occurredAt || new Date();
    const retention = await retentionForStudentEvent(input.studentUserId, occurredAt);
    return await db.studentEvent.create({
      data: {
        studentUserId: input.studentUserId,
        sessionId: input.sessionId,
        eventType: input.eventType,
        occurredAt,
        contextJson: input.context as Prisma.InputJsonValue,
        responseJson: input.response as Prisma.InputJsonValue | undefined,
        durationMs: input.durationMs,
        immediateOutcome: input.immediateOutcome,
        clientPlatform: input.clientPlatform || "WEB",
        appVersion: input.appVersion,
        retentionTier: retention.retentionTier,
        deleteAfterDate: retention.deleteAfterDate,
      },
    });
  } catch (error) {
    console.warn("Student event capture failed", { eventType: input.eventType, studentUserId: input.studentUserId, error });
    return null;
  }
}

export async function retentionForStudentEvent(studentUserId: string, occurredAt: Date) {
  const consent = await ensureVoiceConsent(studentUserId);
  if (!consent.generalDataRetained) return { retentionTier: "NONE", deleteAfterDate: occurredAt };
  if (consent.trainingCorpusOptedIn) return { retentionTier: "TRAINING", deleteAfterDate: null };
  return { retentionTier: "SERVICE", deleteAfterDate: addDays(occurredAt, consent.generalDataRetentionDays) };
}
