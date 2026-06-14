import { del, get, put } from "@vercel/blob";
import { db } from "@/lib/db";

function voiceBlobToken() {
  const token = process.env.VOICE_BLOB_READ_WRITE_TOKEN?.trim().replace(/^['"]|['"]$/g, "");
  if (!token) {
    throw new Error("Voice audio storage is not configured; VOICE_BLOB_READ_WRITE_TOKEN is required.");
  }
  return token;
}

export async function addVoiceAudioObject(
  bytes: Buffer | ArrayBuffer | Blob,
  pathname: string,
  contentType: string,
): Promise<{ audioStorageKey: string; pathname: string }> {
  if (!contentType) throw new Error("contentType is required for voice audio uploads.");
  const token = voiceBlobToken();
  const blob = await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: true,
    token,
    contentType,
  });
  return { audioStorageKey: blob.pathname, pathname: blob.pathname };
}

export async function deleteVoiceAudioObject(audioStorageKey: string) {
  const token = voiceBlobToken();
  await del(audioStorageKey, { token });
}

export function voiceAudioPathnameForStudent(audioStorageKey: string, studentUserId: string) {
  const pathname = audioStorageKey.replace(/^https:\/\/[^/]+\//, "");
  const prefix = `voice/${studentUserId}/`;
  if (!pathname.startsWith(prefix)) {
    throw new Error("Voice audio storage key does not belong to the requested student.");
  }
  return pathname;
}

export async function getVoiceAudioObject(audioStorageKey: string, studentUserId: string) {
  const pathname = voiceAudioPathnameForStudent(audioStorageKey, studentUserId);
  return get(pathname, { access: "private", token: voiceBlobToken(), useCache: false });
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
