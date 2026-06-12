import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "./helpers/supabase-mock";

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  admin: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null,
  scoreSupports: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: h.getUser } })),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => h.admin!.client) }));
vi.mock("@/lib/wellness-score", () => ({
  scoreSupports: (...a: unknown[]) => h.scoreSupports(...a),
}));

import { POST } from "@/app/api/recipes/support-scores/route";

const ID = "11111111-1111-1111-1111-111111111111";

function post(body: unknown, ip = "10.1.1.1") {
  return POST(
    new Request("http://test/api/recipes/support-scores", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }) as never,
  );
}

const tagRow = (slug: string, name: string) => ({ tags: { slug, name } });

beforeEach(() => {
  vi.clearAllMocks();
  h.admin = makeSupabaseMock();
  h.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

describe("support-scores route", () => {
  it("401s unauthenticated callers", async () => {
    h.getUser.mockResolvedValue({ data: { user: null } });
    const res = await post({ recipeId: ID }, "10.1.1.2");
    expect(res.status).toBe(401);
    expect(h.admin!.calls.length).toBe(0);
  });

  it("400s when recipeId is missing", async () => {
    const res = await post({}, "10.1.1.3");
    expect(res.status).toBe(400);
  });

  it("returns cached scores without scoring (fill-once)", async () => {
    h.admin!.setResult("recipes", {
      data: {
        id: ID,
        support_scores: [{ slug: "detox", support: "Detox", score: 84 }],
        recipe_tags: [tagRow("detox", "Detox")],
      },
      error: null,
    });
    const res = await post({ recipeId: ID }, "10.1.1.4");
    expect(res.status).toBe(200);
    expect((await res.json()).scores[0].score).toBe(84);
    expect(h.scoreSupports).not.toHaveBeenCalled();
    expect(h.admin!.callsFor("recipes", "update").length).toBe(0);
  });

  it("computes, persists, and returns when uncached", async () => {
    h.admin!.setResult("recipes", {
      data: {
        id: ID,
        support_scores: null,
        recipe_tags: [tagRow("detox", "Detox"), tagRow("weight-loss", "Weight Loss")],
      },
      error: null,
    });
    h.scoreSupports.mockResolvedValue([
      { slug: "detox", support: "Detox", nutritionScore: 80, ingredientScore: 90, score: 83 },
    ]);

    const res = await post({ recipeId: ID }, "10.1.1.5");
    expect(res.status).toBe(200);
    expect(h.scoreSupports).toHaveBeenCalledOnce();
    const supportsArg = h.scoreSupports.mock.calls[0][1];
    expect(supportsArg).toEqual([
      { name: "Detox", slug: "detox" },
      { name: "Weight Loss", slug: "weight-loss" },
    ]);
    const updates = h.admin!.callsFor("recipes", "update");
    expect(updates.length).toBe(1);
    expect((await res.json()).scores[0].score).toBe(83);
  });

  it("returns empty scores for a recipe with no tags (never invents supports)", async () => {
    h.admin!.setResult("recipes", {
      data: { id: ID, support_scores: null, recipe_tags: [] },
      error: null,
    });
    const res = await post({ recipeId: ID }, "10.1.1.6");
    expect(res.status).toBe(200);
    expect((await res.json()).scores).toEqual([]);
    expect(h.scoreSupports).not.toHaveBeenCalled();
  });
});
