import { Prisma } from "@prisma/client";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { db } from "@/lib/db";

const DEFAULT_DAILY_PLAY_CAP = 100;

export async function checkTtsDailyPlayCap(studentUserId: string, now = new Date()) {
  const cap = Number(process.env.TTS_PER_STUDENT_DAILY_PLAY_CAP || DEFAULT_DAILY_PLAY_CAP);
  const used = await db.modelDecision.count({
    where: {
      decisionType: DECISION_TYPES.TTS_GENERATION,
      occurredAt: { gte: startOfUtcDay(now) },
      inputContextJson: {
        path: ["studentUserId"],
        equals: studentUserId,
      } as Prisma.JsonFilter,
    },
  });
  return { allowed: used < cap, used, cap };
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
