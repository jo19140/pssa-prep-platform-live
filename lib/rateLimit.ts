import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();
const upstashLimiters = new Map<string, Ratelimit>();
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.headers.get("x-real-ip") || "unknown";
}

export async function consumeRateLimit({
  key,
  capacity,
  refillIntervalMs,
}: {
  key: string;
  capacity: number;
  refillIntervalMs: number;
}) {
  if (redis) {
    const limiterKey = `${capacity}:${refillIntervalMs}`;
    let limiter = upstashLimiters.get(limiterKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(capacity, `${Math.max(1, Math.ceil(refillIntervalMs / 1000))} s`),
        prefix: "pssa-prep-rate-limit",
      });
      upstashLimiters.set(limiterKey, limiter);
    }
    const result = await limiter.limit(key);
    return {
      allowed: result.success,
      retryAfterSec: result.success ? 0 : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  }

  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: capacity, updatedAt: now };
  const refill = Math.floor((now - bucket.updatedAt) / refillIntervalMs);
  const tokens = Math.min(capacity, bucket.tokens + refill);
  const updatedAt = refill > 0 ? bucket.updatedAt + refill * refillIntervalMs : bucket.updatedAt;

  if (tokens <= 0) {
    buckets.set(key, { tokens, updatedAt });
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((refillIntervalMs - (now - updatedAt)) / 1000)) };
  }

  buckets.set(key, { tokens: tokens - 1, updatedAt });
  return { allowed: true, retryAfterSec: 0 };
}
