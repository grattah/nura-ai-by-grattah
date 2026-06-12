import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({ generateObject: vi.fn() }));
vi.mock("ai", () => ({ generateObject: (...a: unknown[]) => h.generateObject(...a) }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "model") }));

import { computeFinal, scoreSupports } from "@/lib/wellness-score";

describe("computeFinal (0.7 nutrition + 0.3 ingredient, clamped 0–100)", () => {
  it("applies the weighting and rounds", () => {
    expect(computeFinal(80, 90)).toBe(83); // 56 + 27
    expect(computeFinal(81, 84)).toBe(82); // 56.7 + 25.2 = 81.9
  });
  it("handles the bounds", () => {
    expect(computeFinal(0, 0)).toBe(0);
    expect(computeFinal(100, 100)).toBe(100);
  });
});

describe("scoreSupports", () => {
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

  it("keeps only assigned slugs, drops unknown + duplicates, preserves order", async () => {
    h.generateObject.mockResolvedValue({
      object: {
        supports: [
          { slug: "weight-loss", nutritionScore: 60, ingredientScore: 70, nutritionRationale: "", ingredientRationale: "" },
          { slug: "energy", nutritionScore: 99, ingredientScore: 99, nutritionRationale: "", ingredientRationale: "" }, // not assigned
          { slug: "detox", nutritionScore: 80, ingredientScore: 90, nutritionRationale: "", ingredientRationale: "" },
          { slug: "detox", nutritionScore: 10, ingredientScore: 10, nutritionRationale: "", ingredientRationale: "" }, // dupe
        ],
      },
    });

    const out = await scoreSupports({ title: "Acai", ingredients: [] }, assigned);

    expect(out.map((s) => s.slug)).toEqual(["detox", "weight-loss"]); // assigned order
    expect(out.find((s) => s.slug === "detox")).toMatchObject({
      support: "Detox",
      nutritionScore: 80,
      ingredientScore: 90,
      score: 83,
    });
    expect(out.find((s) => s.slug === "energy")).toBeUndefined();
  });

  it("drops supports the model failed to return", async () => {
    h.generateObject.mockResolvedValue({
      object: {
        supports: [
          { slug: "detox", nutritionScore: 50, ingredientScore: 50, nutritionRationale: "", ingredientRationale: "" },
        ],
      },
    });
    const out = await scoreSupports({ title: "x" }, assigned);
    expect(out.map((s) => s.slug)).toEqual(["detox"]);
  });
});
