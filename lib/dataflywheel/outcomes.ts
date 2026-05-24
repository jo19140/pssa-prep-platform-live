import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function computeDataFlywheelOutcomes(limit = 500) {
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [masteryDelta24h, retentionPass7d] = await Promise.all([
    computeMasteryDelta24h(cutoff24h, limit),
    computeRetentionPass7d(cutoff7d, limit),
  ]);
  return { masteryDelta24h, retentionPass7d };
}

async function computeMasteryDelta24h(cutoff: Date, limit: number) {
  const events = await db.studentEvent.findMany({
    where: {
      occurredAt: { lte: cutoff },
      outcomes: { none: { outcomeType: "MASTERY_DELTA_24H" } },
    },
    take: limit,
    orderBy: { occurredAt: "asc" },
  });
  let created = 0;
  for (const event of events) {
    const context = event.contextJson as Record<string, unknown>;
    const standardCode = typeof context.standardCode === "string" ? context.standardCode : null;
    const after = standardCode ? await latestResponseScore(event.studentUserId, standardCode, event.occurredAt, addHours(event.occurredAt, 24)) : null;
    await db.studentEventOutcome.upsert({
      where: { studentEventId_outcomeType: { studentEventId: event.id, outcomeType: "MASTERY_DELTA_24H" } },
      create: {
        studentEventId: event.id,
        outcomeType: "MASTERY_DELTA_24H",
        outcomeScore: after?.score ?? null,
        outcomeLabel: after ? "OBSERVED" : "NO_FOLLOWUP_SIGNAL",
        metricJson: { standardCode, score: after?.score ?? null } as Prisma.InputJsonValue,
      },
      update: {},
    });
    created += 1;
  }
  return created;
}

async function computeRetentionPass7d(cutoff: Date, limit: number) {
  const events = await db.studentEvent.findMany({
    where: {
      occurredAt: { lte: cutoff },
      outcomes: { none: { outcomeType: "RETENTION_PASS_7D" } },
    },
    take: limit,
    orderBy: { occurredAt: "asc" },
  });
  let created = 0;
  for (const event of events) {
    const context = event.contextJson as Record<string, unknown>;
    const standardCode = typeof context.standardCode === "string" ? context.standardCode : null;
    const followup = standardCode ? await latestResponseScore(event.studentUserId, standardCode, addDays(event.occurredAt, 1), addDays(event.occurredAt, 7)) : null;
    await db.studentEventOutcome.upsert({
      where: { studentEventId_outcomeType: { studentEventId: event.id, outcomeType: "RETENTION_PASS_7D" } },
      create: {
        studentEventId: event.id,
        outcomeType: "RETENTION_PASS_7D",
        outcomeScore: followup?.score ?? null,
        outcomeLabel: followup ? (followup.score >= 0.7 ? "PASS" : "NOT_YET") : "NO_FOLLOWUP_SIGNAL",
        metricJson: { standardCode, score: followup?.score ?? null } as Prisma.InputJsonValue,
      },
      update: {},
    });
    created += 1;
  }
  return created;
}

async function latestResponseScore(studentUserId: string, standardCode: string, from: Date, to: Date) {
  const response = await db.responseRecord.findFirst({
    where: {
      standardCode,
      session: { userId: studentUserId },
      createdAt: { gt: from, lte: to },
    },
    orderBy: { createdAt: "desc" },
    select: { scorePointsEarned: true, maxPoints: true },
  });
  if (!response) return null;
  return { score: response.scorePointsEarned / Math.max(1, response.maxPoints) };
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
