// Fixed-window, in-memory rate limiter. State is per server instance, so on
// serverless hosts it only limits bursts hitting the same instance — enough to
// keep a single client from hammering YouTube through our API routes.

interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

/** Returns true if the request is allowed, false if `key` exceeded `limit` within `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}
