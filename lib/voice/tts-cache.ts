import { createHash } from "crypto";

type CachedTtsAudio = {
  audio: Buffer;
  contentType: string;
  expiresAt: number;
  lastAccessedAt: number;
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 200;
const cache = new Map<string, CachedTtsAudio>();

export function ttsCacheKey({ text, voice, model }: { text: string; voice: string; model: string }) {
  return createHash("sha256").update(JSON.stringify({ model, text, voice })).digest("hex");
}

export function getCachedTtsAudio(cacheKey: string, now = Date.now()) {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(cacheKey);
    return null;
  }
  entry.lastAccessedAt = now;
  return { audio: Buffer.from(entry.audio), contentType: entry.contentType };
}

export function setCachedTtsAudio({
  cacheKey,
  audio,
  contentType = "audio/mpeg",
  ttlMs = DEFAULT_TTL_MS,
  maxEntries = DEFAULT_MAX_ENTRIES,
  now = Date.now(),
}: {
  cacheKey: string;
  audio: Buffer;
  contentType?: string;
  ttlMs?: number;
  maxEntries?: number;
  now?: number;
}) {
  cache.set(cacheKey, {
    audio: Buffer.from(audio),
    contentType,
    expiresAt: now + ttlMs,
    lastAccessedAt: now,
  });
  trimCache(maxEntries);
}

export function clearTtsCacheForTest() {
  cache.clear();
}

function trimCache(maxEntries: number) {
  if (cache.size <= maxEntries) return;
  const entries = [...cache.entries()].sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt);
  for (const [key] of entries.slice(0, Math.max(0, cache.size - maxEntries))) {
    cache.delete(key);
  }
}
