import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "./helpers/supabase-mock";

const h = vi.hoisted(() => ({
  client: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null,
  getTokenState: vi.fn(),
  meter: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(h.client!.client)),
}));

vi.mock("@/lib/credits-server", () => ({
  getTokenState: (...args: unknown[]) => h.getTokenState(...args),
  meter: (...args: unknown[]) => h.meter(...args),
}));

vi.mock("@/lib/free-trial-server", () => ({
  tryConsumeFreeView: vi.fn().mockResolvedValue(false),
}));

vi.mock("ai", () => ({ generateObject: vi.fn(), generateText: vi.fn() }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn() }));

import { POST } from "@/app/api/personalized-search/route";

function post(body: unknown) {
  return POST(
    new Request("http://test/api/personalized-search", {
      method: "POST",
      body: JSON.stringify(body),
    }) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.client = makeSupabaseMock();
  h.getTokenState.mockResolvedValue({ totalRemaining: 100 });
});

describe("personalized-search — access control (audit M3)", () => {
  it("returns 401 when getUser() finds no user", async () => {
    h.client!.client.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await post({ query: "bloating" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for an authenticated user with no active subscription", async () => {
    h.client!.client.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    h.client!.setResult("subscriptions", { data: null, error: null });
    const res = await post({ query: "bloating" });
    expect(res.status).toBe(403);
  });

  it("returns 403 when the subscription has expired", async () => {
    h.client!.client.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    h.client!.setResult("subscriptions", {
      data: [
        { status: "active", expires_at: new Date(Date.now() - 1000).toISOString() },
      ],
      error: null,
    });
    const res = await post({ query: "bloating" });
    expect(res.status).toBe(403);
  });
});
