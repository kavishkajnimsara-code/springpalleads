interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();

// Periodically prune stale buckets to prevent unbounded memory growth
const MAX_BUCKETS = 5000;

function pruneBuckets(now: number, windowMs: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets.entries()) {
    const active = bucket.timestamps.filter((ts) => now - ts < windowMs);
    if (active.length === 0) {
      buckets.delete(key);
    } else {
      bucket.timestamps = active;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-window in-memory rate limiter for API routes.
 * Note: For multi-region/high-scale deployments, back this with Upstash Redis or Vercel KV.
 */
export function checkRateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  pruneBuckets(now, options.windowMs);

  const existing = buckets.get(key) ?? { timestamps: [] };
  const recent = existing.timestamps.filter(
    (ts) => now - ts < options.windowMs
  );

  if (recent.length >= options.maxRequests) {
    const oldest = recent[0];
    const retryAfterMs = Math.max(1000, options.windowMs - (now - oldest));
    buckets.set(key, { timestamps: recent });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent });

  return {
    allowed: true,
    remaining: Math.max(0, options.maxRequests - recent.length),
    retryAfterSeconds: 0,
  };
}

/**
 * Extracts the best available client IP address from request headers.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}
