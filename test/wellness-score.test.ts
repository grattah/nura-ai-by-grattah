import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({ generateObject: vi.fn() }));
vi.mock("ai", () => ({ generateObject: (...a: unknown[]) => h.generateObject(...a) }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "model") }));

import { scoreSupports } from "@/lib/wellness-score";

describe("scoreSupports (single 0–100 bioactivityScore per slug)", () => {
  const assigned = [
    { name: "Detox", slug: "detox" },
    { name: "Weight Loss", slug: "weight-loss" },
  ];

  beforeEach(() => vi.clearAllMocks());

  it("returns [] without calling the model when there are no supports", async () => {
    const out = await scoreSupports({ title: "x" }, []);
    expect(out).toEqual([]);
    expect(h.generateObject).not.toHaveBeenCalled();
  });

  it("keeps only assigned slugs, drops unknown + duplicates, uses the score directly", async () => {
    h.generateObject.mockResolvedValue({
      object: {
        supports: [
          { slug: "weight-loss", bioactivityScore: 65 },
          { slug: "energy", bioactivityScore: 99 }, // not assigned
          { slug: "detox", bioactivityScore: 84 },
          { slug: "detox", bioactivityScore: 10 }, // dupe → ignored
        ],
      },
    });

    const out = await scoreSupports({ title: "Acai", ingredients: [] }, assigned);

    // Top N by score, strongest first.
    expect(out.map((s) => s.slug)).toEqual(["detox", "weight-loss"]);
    expect(out.find((s) => s.slug === "detox")).toEqual({
      slug: "detox",
      support: "Detox",
      score: 84,
    });
    expect(out.find((s) => s.slug === "energy")).toBeUndefined();
  });

  it("drops supports the model failed to return", async () => {
    h.generateObject.mockResolvedValue({
      object: { supports: [{ slug: "detox", bioactivityScore: 50 }] },
    });
    const out = await scoreSupports({ title: "x" }, assigned);
    expect(out.map((s) => s.slug)).toEqual(["detox"]);
  });
});
