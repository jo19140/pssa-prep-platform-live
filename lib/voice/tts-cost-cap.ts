import { createHash } from "crypto";
import { db } from "@/lib/db";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";

export const DEFAULT_TTS_PER_STUDENT_DAILY_CAP = 100;

export function ttsStudentHash(studentUserId: string) {
  return createHash("sha256").update(`tts-student:${studentUserId}`).digest("hex");
}

export function configuredTtsDailyCap() {
  const raw = process.env.TTS_PER_STUDENT_DAILY_CAP;
  const parsed = raw ? Number(raw) : DEFAULT_TTS_PER_STUDENT_DAILY_CAP;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_TTS_PER_STUDENT_DAILY_CAP;
}

export async function ttsUsageCountForStudentToday(studentUserId: string, now = new Date()) {
  const start = startOfUtcDay(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return db.modelDecision.count({
    where: {
      decisionType: DECISION_TYPES.TTS_GENERATION,
      occurredAt: { gte: start, lt: end },
      inputContextJson: {
        path: ["studentHash"],
        equals: ttsStudentHash(studentUserId),
      },
    },
  });
}

export async function checkTtsDailyCap(studentUserId: string, now = new Date()) {
  const cap = configuredTtsDailyCap();
  const used = await ttsUsageCountForStudentToday(studentUserId, now);
  return { allowed: used < cap, cap, used, remaining: Math.max(0, cap - used) };
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
