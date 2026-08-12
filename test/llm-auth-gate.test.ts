import { describe, it, expect, beforeEach, vi } from "vitest";

// Audit H2: /api/rag/questions and /api/recipes/suggestions are LLM calls that
// must reject unauthenticated callers (no free Anthropic token burn).
const h = vi.hoisted(() => ({
  user: null as { id: string } | null,
  generateText: vi.fn(),
  generateObject: vi.fn(),
  hasActiveSubscription: vi.fn().mockResolvedValue(false),
  hasEverSubscribed: vi.fn().mockResolvedValue(false),
  tryConsumeFreeView: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => Promise.resolve({ success: true }),
  getClientIp: () => "ip",
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: h.user } }) },
    }),
}));
vi.mock("@/lib/subscription", () => ({
  hasActiveSubscription: (...a: unknown[]) => h.hasActiveSubscription(...a),
  hasEverSubscribed: (...a: unknown[]) => h.hasEverSubscribed(...a),
}));
vi.mock("@/lib/free-trial-server", () => ({
  tryConsumeFreeView: (...a: unknown[]) => h.tryConsumeFreeView(...a),
}));
vi.mock("ai", () => ({
  generateText: (...a: unknown[]) => h.generateText(...a),
  generateObject: (...a: unknown[]) => h.generateObject(...a),
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "model") }));

import { POST as questionsPOST } from "@/app/api/rag/questions/route";
import { POST as suggestionsPOST } from "@/app/api/recipes/suggestions/route";

function req(body: unknown, url: string) {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.user = null;
});

describe("LLM endpoints require authentication (audit H2)", () => {
  it("rag/questions returns 401 and skips the model when unauthenticated", async () => {
    const res = await questionsPOST(
      req(
        { contextType: "recipe", title: "T", description: "D" },
        "http://test/api/rag/questions",
      ),
    );
    expect(res.status).toBe(401);
    expect(h.generateText).not.toHaveBeenCalled();
  });

  it("recipes/suggestions returns 401 and skips the model when unauthenticated", async () => {
    const res = await suggestionsPOST(
      req(
        { query: `unique-${Date.now()}` }, // avoid the module-level cache
        "http://test/api/recipes/suggestions",
      ),
    );
    expect(res.status).toBe(401);
    expect(h.generateObject).not.toHaveBeenCalled();
  });

  it("rag/questions proceeds past the gate when authenticated", async () => {
    h.user = { id: "u1" };
    h.generateText.mockResolvedValue({ text: '["q1","q2"]' });
    const res = await questionsPOST(
      req(
        { contextType: "recipe", title: "T", description: "D" },
        "http://test/api/rag/questions",
      ),
    );
    expect(res.status).toBe(200);
    expect(h.generateText).toHaveBeenCalledTimes(1);
  });

  it("recipes/suggestions proceeds past the gate when authenticated with a free trial use available", async () => {
    h.user = { id: "u1" };
    h.hasActiveSubscription.mockResolvedValue(false);
    h.hasEverSubscribed.mockResolvedValue(false);
    h.tryConsumeFreeView.mockResolvedValue(true);
    h.generateObject.mockResolvedValue({
      object: { suggestions: [{ title: "Ginger Lemon Tea" }] },
    });
    const res = await suggestionsPOST(
      req(
        { query: `unique-${Date.now()}` }, // avoid the module-level cache
        "http://test/api/recipes/suggestions",
      ),
    );
    expect(res.status).toBe(200);
    expect(h.generateObject).toHaveBeenCalledTimes(1);
  });

  it("recipes/suggestions returns 403 when the free trial is exhausted", async () => {
    h.user = { id: "u1" };
    h.hasActiveSubscription.mockResolvedValue(false);
    h.hasEverSubscribed.mockResolvedValue(false);
    h.tryConsumeFreeView.mockResolvedValue(false);
    const res = await suggestionsPOST(
      req(
        { query: `unique-${Date.now()}` },
        "http://test/api/recipes/suggestions",
      ),
    );
    expect(res.status).toBe(403);
    expect(h.generateObject).not.toHaveBeenCalled();
  });

  it("recipes/suggestions returns 403 for a lapsed subscriber without spending a trial", async () => {
    h.user = { id: "u1" };
    h.hasActiveSubscription.mockResolvedValue(false);
    h.hasEverSubscribed.mockResolvedValue(true);
    const res = await suggestionsPOST(
      req(
        { query: `unique-${Date.now()}` },
        "http://test/api/recipes/suggestions",
      ),
    );
    expect(res.status).toBe(403);
    expect(h.tryConsumeFreeView).not.toHaveBeenCalled();
    expect(h.generateObject).not.toHaveBeenCalled();
  });
});
