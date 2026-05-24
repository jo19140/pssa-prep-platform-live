import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enforceVoiceRetention } from "@/lib/voice/retentionJobs";

export async function enforceDataFlywheelRetention(limit = 500) {
  const now = new Date();
  const [voicePurged, decisions, events] = await Promise.all([
    enforceVoiceRetention(limit),
    db.modelDecision.findMany({ where: { deleteAfterDate: { lt: now } }, select: { id: true }, take: limit }),
    db.studentEvent.findMany({ where: { deleteAfterDate: { lt: now } }, select: { id: true, studentUserId: true }, take: limit }),
  ]);
  const decisionIds = decisions.map((decision) => decision.id);
  const eventIds = events.map((event) => event.id);
  if (decisionIds.length) await db.modelDecision.deleteMany({ where: { id: { in: decisionIds } } });
  if (eventIds.length) await db.studentEvent.deleteMany({ where: { id: { in: eventIds } } });
  if (decisionIds.length || eventIds.length) {
    await db.dataDeletionLog.create({
      data: {
        recordType: "DATA_FLYWHEEL_RETENTION_BATCH",
        deletionReason: "RETENTION_EXPIRY",
        metadataJson: {
          studentEventCount: eventIds.length,
          modelDecisionCount: decisionIds.length,
          studentEventIds: eventIds,
          modelDecisionIds: decisionIds,
        } as Prisma.InputJsonValue,
      },
    });
  }
  return { voicePurged, studentEventsPurged: eventIds.length, modelDecisionsPurged: decisionIds.length };
}
