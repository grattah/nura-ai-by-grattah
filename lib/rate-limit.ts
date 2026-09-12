import "server-only";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, windowMs, "NX"],
      ]),
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
    return null;
  }
}

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

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
