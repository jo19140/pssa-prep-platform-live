import { stableHash } from "@/lib/decisions/withModelDecisionLogging";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 500;

type CacheEntry = {
  bytes: Uint8Array;
  contentType: string;
  expiresAt: number;
  lastAccessedAt: number;
};

const cache = new Map<string, CacheEntry>();

export function ttsCacheKey(input: { text: string; voice: string; model: string }) {
  return stableHash({ text: input.text, voice: input.voice, model: input.model });
}

export function getCachedTtsAudio(cacheKey: string, now = Date.now()) {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(cacheKey);
    return null;
  }
  entry.lastAccessedAt = now;
  return { bytes: entry.bytes, contentType: entry.contentType };
}

export function setCachedTtsAudio(cacheKey: string, bytes: Uint8Array, contentType = "audio/mpeg", now = Date.now()) {
  cache.set(cacheKey, {
    bytes,
    contentType,
    expiresAt: now + DEFAULT_TTL_MS,
    lastAccessedAt: now,
  });
  evictTtsCache();
}

export function clearTtsCache() {
  cache.clear();
}

function evictTtsCache() {
  if (cache.size <= DEFAULT_MAX_ENTRIES) return;
  const entries = [...cache.entries()].sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
  for (const [key] of entries.slice(0, cache.size - DEFAULT_MAX_ENTRIES)) cache.delete(key);
}
