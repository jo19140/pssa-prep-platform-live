import { del } from "@vercel/blob";
import { db } from "@/lib/db";

export async function deleteVoiceAudioObject(audioStorageKey: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(`Voice audio delete blocked: BLOB_READ_WRITE_TOKEN is not configured for ${audioStorageKey}`);
    throw new Error("Voice audio storage is not configured; audio was not deleted.");
  }
  await del(audioStorageKey);
}

export async function purgeVoiceSessionAudio(input: {
  voiceSessionId: string;
  deletionReason: string;
  triggeredByUserId?: string | null;
}) {
  const session = await db.voiceSession.findUnique({ where: { id: input.voiceSessionId }, include: { literacyProfile: true } });
  if (!session?.audioStorageKey) return session;
  const audioStorageKey = session.audioStorageKey;
  await deleteVoiceAudioObject(audioStorageKey);
  const updated = await db.voiceSession.update({
    where: { id: session.id },
    data: { audioStorageKey: null, audioDeletedAt: new Date() },
  });
  await db.voiceAudioDeletionLog.create({
    data: {
      voiceSessionId: session.id,
      studentUserId: session.literacyProfile.studentUserId,
      audioStorageKey,
      deletionReason: input.deletionReason,
      triggeredByUserId: input.triggeredByUserId || undefined,
    },
  });
  return updated;
}

export async function purgeAudioForStudent(studentUserId: string, reason: string, triggeredByUserId?: string | null, retentionTier?: string) {
  const sessions = await db.voiceSession.findMany({
    where: { literacyProfile: { studentUserId }, audioStorageKey: { not: null }, audioDeletedAt: null, ...(retentionTier ? { retentionTier } : {}) },
    select: { id: true },
  });
  for (const session of sessions) {
    await purgeVoiceSessionAudio({ voiceSessionId: session.id, deletionReason: reason, triggeredByUserId });
  }
  return sessions.length;
}

export async function writeManifestJsonl(key: string, lines: string[]) {
  void lines;
  return key;
}
