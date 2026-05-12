type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.headers.get("x-real-ip") || "unknown";
}

export function consumeRateLimit({
  key,
  capacity,
  refillIntervalMs,
}: {
  key: string;
  capacity: number;
  refillIntervalMs: number;
}) {
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
