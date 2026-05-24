import { db } from "@/lib/db";
import { markTrainingSegmentsExcluded } from "@/lib/voice/consent";
import { purgeAudioForStudent, purgeVoiceSessionAudio } from "@/lib/voice/storage";

export async function enforceVoiceRetention(limit = 500) {
  const expired = await db.voiceSession.findMany({
    where: {
      deleteAfterDate: { lt: new Date() },
      audioStorageKey: { not: null },
      audioDeletedAt: null,
      retentionTier: { in: ["SERVICE", "NONE"] },
    },
    select: { id: true },
    take: limit,
  });
  for (const session of expired) {
    await purgeVoiceSessionAudio({ voiceSessionId: session.id, deletionReason: "RETENTION_EXPIRY" });
  }
  return expired.length;
}

export async function purgeTrainingOptOuts() {
  const optOuts = await db.voiceConsent.findMany({
    where: { trainingPurgeRequestedAt: { not: null }, trainingCorpusOptedIn: false },
    select: { studentUserId: true },
  });
  for (const consent of optOuts) {
    await markTrainingSegmentsExcluded(consent.studentUserId);
    await purgeAudioForStudent(consent.studentUserId, "TRAINING_OPT_OUT", undefined, "TRAINING");
  }
  return optOuts.length;
}
