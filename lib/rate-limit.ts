import "server-only";

/**
 * Shared rate limiter (audit findings H1/H3/H4/M1).
 *
 * In-memory Maps don't work in serverless — each instance has its own memory and
 * the limit resets on every cold start, so module-scoped counters provide almost
 * no protection under real traffic. This helper uses a durable, cross-instance
 * counter in Upstash Redis (via its REST API — no extra dependency required) when
 * configured, and degrades to a best-effort in-memory limiter otherwise.
 *
 * To enable the durable limiter, set:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

export interface RateLimitResult {
  success: boolean;
  /** Remaining requests in the current window (best-effort). */
  remaining: number;
  /** Approx. epoch ms when the window resets. */
  reset: number;
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ── Fallback: in-memory fixed window (per instance) ──────────────────────────
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const rec = memory.get(key);
  if (!rec || now > rec.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }
  rec.count++;
  return {
    success: rec.count <= limit,
    remaining: Math.max(0, limit - rec.count),
    reset: rec.resetAt,
  };
}

// ── Durable: Upstash Redis REST pipeline ─────────────────────────────────────
async function upstashLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      // INCR the counter, then set the window expiry only if not already set.
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, windowMs, "NX"],
      ]),
      // Don't let the limiter hang a request.
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    if (!count) return null;

    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: Date.now() + windowMs,
    };
  } catch {
    // Network/timeout/misconfig — fall back rather than failing the request.
    return null;
  }
}

/**
 * Increment and check the limit for `key`. Returns `success: false` when the
 * caller has exceeded `limit` requests within `windowMs`.
 *
 * @param key       Caller bucket, e.g. `check-email:1.2.3.4`.
 * @param limit     Max requests per window.
 * @param windowMs  Window length in ms.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const result = await upstashLimit(key, limit, windowMs);
    if (result) return result;
  }
  return memoryLimit(key, limit, windowMs);
}

/** Best-effort client IP from forwarding headers. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
