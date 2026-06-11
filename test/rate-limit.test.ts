import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// No UPSTASH_* env in tests → exercises the in-memory fallback path.

describe("rateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows up to `limit` requests then blocks", async () => {
    const key = `t:${Math.random()}`;
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      results.push((await rateLimit(key, 5, 60_000)).success);
    }
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });

  it("decrements remaining as the window fills", async () => {
    const key = `t:${Math.random()}`;
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(2);
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(1);
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(0);
    expect((await rateLimit(key, 3, 60_000)).success).toBe(false);
  });

  it("resets after the window elapses", async () => {
    vi.useFakeTimers();
    const key = `t:${Math.random()}`;
    for (let i = 0; i < 5; i++) await rateLimit(key, 5, 1_000);
    expect((await rateLimit(key, 5, 1_000)).success).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect((await rateLimit(key, 5, 1_000)).success).toBe(true);
    vi.useRealTimers();
  });

  it("isolates separate keys", async () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    for (let i = 0; i < 5; i++) await rateLimit(a, 5, 60_000);
    expect((await rateLimit(a, 5, 60_000)).success).toBe(false);
    expect((await rateLimit(b, 5, 60_000)).success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(getClientIp(h)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip then 'unknown'", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
