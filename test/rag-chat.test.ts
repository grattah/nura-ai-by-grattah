import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  retrieve: vi.fn(),
  streamText: vi.fn(),
  getTokenState: vi.fn(),
  reserve: vi.fn(async () => ({
    id: "res-1",
    action: "followup",
    costUnits: 1,
    fromSubscription: 1,
    fromPurchased: 0,
  })),
  settle: vi.fn(),
  release: vi.fn(),
  meter: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: (...args: unknown[]) => h.streamText(...args),
  convertToModelMessages: (m: unknown) => m,
  stepCountIs: () => 0,
  tool: (t: unknown) => t,
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "model") }));
vi.mock("@/lib/rag", () => ({
  retrieve: (...args: unknown[]) => h.retrieve(...args),
  formatContext: () => "ctx",
}));
vi.mock("@/lib/credits-server", () => ({
  getTokenState: (...args: unknown[]) => h.getTokenState(...args),
  meter: (...args: unknown[]) => h.meter(...args),
}));
// The route reserves units up front now (spec §6). Default to a successful
// reservation so these tests exercise chat behaviour, not the token path.
vi.mock("@/lib/tokens/server", () => ({
  reserve: (userId: string, action: string) =>
    (h.reserve as (u: string, a: string) => unknown)(userId, action),
  settle: (r: unknown) => h.settle(r),
  release: (r: unknown) => h.release(r),
}));

// Authenticated subscriber by default — chainable stub for the auth + sub reads.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        // getEntitledSubscription reads via .in().order().limit() → array of rows.
        limit: async () => ({
          data: [{ status: "active", expires_at: null }],
        }),
        maybeSingle: async () => ({
          data: { status: "active", expires_at: null },
        }),
      };
      return chain;
    },
  }),
}));

import { POST } from "@/app/api/rag/chat/route";

function post(body: unknown, ip = "172.16.0.1") {
  return POST(
    new Request("http://test/api/rag/chat", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }) as never,
  );
}

function textMessage(text: string) {
  return { role: "user", parts: [{ type: "text", text }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.retrieve.mockResolvedValue({ chunks: [], hasGoodResults: false });
  h.streamText.mockReturnValue({
    toUIMessageStreamResponse: () => new Response("stream"),
  });
  h.getTokenState.mockResolvedValue({ totalRemaining: 50 });
  h.meter.mockResolvedValue({ totalRemaining: 49 });
});

describe("rag/chat — input clamping (audit M1)", () => {
  it("clamps oversized message lists and uses the latest question", async () => {
    const messages = Array.from({ length: 30 }, (_, i) => textMessage(`q${i}`));
    const res = await post({
      messages,
      contextId: "ctx1",
      contextType: "recipe",
      title: "x".repeat(5000),
      allowedDomains: Array.from({ length: 50 }, (_, i) => `d${i}.com`),
      description: "d",
    });
    expect(res.status).toBe(200);
    // retrieve gets the last user question, proving the clamped list still resolves.
    expect(h.retrieve).toHaveBeenCalledWith("q29", "ctx1", 6, 0.5);
  });

  it("does not throw on a malformed messages field", async () => {
    const res = await post({
      messages: "not-an-array",
      contextId: "ctx1",
      contextType: "recipe",
      title: "t",
      allowedDomains: [],
      description: "d",
    });
    expect(res.status).toBe(200);
    expect(h.retrieve).toHaveBeenCalledWith("", "ctx1", 6, 0.5);
  });
});

describe("rag/chat — rate limiting (audit M1)", () => {
  it("returns 429 after 20 requests/min from the same IP", async () => {
    const ip = "198.51.100.5";
    const body = {
      messages: [textMessage("hi")],
      contextId: "c",
      contextType: "recipe",
      title: "t",
      allowedDomains: [],
      description: "d",
    };
    const codes: number[] = [];
    for (let i = 0; i < 22; i++) codes.push((await post(body, ip)).status);
    expect(codes.filter((c) => c === 200).length).toBe(20);
    expect(codes.filter((c) => c === 429).length).toBe(2);
  });
});
