import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  genObj: vi.fn(),
  genText: vi.fn(),
  existing: null as
    | { title: string; description: string; image_url: string | null }
    | null,
  upsert: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: (...a: unknown[]) => h.genObj(...a),
  generateText: (...a: unknown[]) => h.genText(...a),
}));
vi.mock("@ai-sdk/google", () => ({ google: vi.fn(() => "model") }));
vi.mock("sharp", () => ({
  default: () => ({
    resize: () => ({
      webp: () => ({ toBuffer: () => Promise.resolve(Buffer.from([1, 2, 3])) }),
    }),
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => Promise.resolve({ success: true }),
  getClientIp: () => "ip",
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: h.existing }) }),
      }),
      upsert: (...a: unknown[]) => {
        h.upsert(...a);
        return Promise.resolve({ error: null });
      },
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: "https://cdn.test/daily-tips/x.webp" },
        }),
      }),
    },
  }),
}));

import { GET } from "@/app/api/daily-tip/route";

function get() {
  return GET(new Request("http://test/api/daily-tip") as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  h.existing = null;
  h.genObj.mockResolvedValue({
    object: { title: "Move more often", description: "A short daily nudge." },
  });
  h.genText.mockResolvedValue({
    files: [{ mediaType: "image/png", uint8Array: new Uint8Array([1, 2, 3]) }],
  });
});

describe("daily-tip route", () => {
  it("returns the existing tip without generating", async () => {
    h.existing = { title: "Cached", description: "Cached desc", image_url: "u" };
    const res = await get();
    const body = await res.json();
    expect(body).toEqual({
      title: "Cached",
      description: "Cached desc",
      imageUrl: "u",
    });
    expect(h.genObj).not.toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
  });

  // Feature retired: the daily-tip cron + generation are disabled
  // (DAILY_TIP_ENABLED = false). The route still serves any existing tip (above)
  // but never generates a new one — it returns null instead of spending tokens.
  it("does NOT generate when missing (feature disabled) — returns null", async () => {
    const res = await get();
    const body = await res.json();
    expect(body).toBeNull();
    expect(h.genObj).not.toHaveBeenCalled();
    expect(h.genText).not.toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
  });
});
