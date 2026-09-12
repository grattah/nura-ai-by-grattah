import { describe, it, expect } from "vitest";
import {
  matchRow,
  matchRowsForRecipe,
  ROW_MATCHERS,
  NUTRIENT_THRESHOLDS,
  type IngredientFacts,
} from "@/lib/scoring/tier-match";
import { CATEGORY_TABLE_BY_KEY } from "@/lib/scoring/tier-tables";
import { TIER_POINTS } from "@/lib/scoring/tier-score";

const ing = (name: string, over: Partial<IngredientFacts> = {}): IngredientFacts => ({
  name,
  ...over,
});

describe("name matching tolerates plurals", () => {
  const heart = CATEGORY_TABLE_BY_KEY.get("heart-health")!;

  it("matches beetroot in 'medium beetroots'", () => {
    expect(matchRow(ing("medium beetroots"), heart.entries)?.ingredient).toBe(
      "Beetroot nitrates",
    );
  });

  it.each([
    ["tart cherries", "Tart cherry", "sleep"],
    ["fresh or frozen blueberries", "Blueberry", "focus"],
    ["3–4 fresh carrots", "Vitamin A precursors (carrot, sweet potato)", "beauty"],
  ])("matches %s", (name, _row, _cat) => {
    const matcher = ROW_MATCHERS[_row];
    expect(matcher, `no matcher for "${_row}"`).toBeDefined();
    expect(matcher(ing(name))).toBe(true);
  });

  it("does not match a substring that isn't the word", () => {
    expect(ROW_MATCHERS["Garlic"](ing("garlicky kale salad"))).toBe(false);
  });
});

describe("a row is satisfied once, not once per ingredient", () => {
  const hydration = CATEGORY_TABLE_BY_KEY.get("hydration")!;
  const max = hydration.entries.reduce((s, e) => s + TIER_POINTS[e.tier], 0);

  it("does not let five watery ingredients claim Water content five times", () => {
    const watery = ["beetroot", "green apple", "lemon", "water", "cucumber"].map((n) =>
      ing(n, { water_pct: 92 }),
    );
    const matched = matchRowsForRecipe(watery, hydration.entries);
    const raw = [...matched.values()].reduce((s, r) => s + TIER_POINTS[r.tier], 0);

    expect(matched.get("Water content")).toBeDefined();
    expect(raw).toBeLessThanOrEqual(max);
  });

  it("takes the best tier when several ingredients satisfy one row", () => {
    const beauty = CATEGORY_TABLE_BY_KEY.get("beauty")!;
    const matched = matchRowsForRecipe(
      [ing("spinach", { protein_g: 3 }), ing("greek yogurt", { protein_g: 10 })],
      beauty.entries,
    );
    expect(matched.get("Protein / biotin sources")?.tier).toBe("secondary");
    expect(matched.size).toBe(1);
  });
});

describe("nutrient thresholds", () => {
  it("requires a real vitamin C contribution", () => {
    const m = ROW_MATCHERS["Vitamin C"];
    expect(m(ing("lemon", { vitamin_c_dv: NUTRIENT_THRESHOLDS.vitaminCDV }))).toBe(true);
    expect(m(ing("apple", { vitamin_c_dv: 5 }))).toBe(false);
    expect(m(ing("water", {}))).toBe(false);
  });

  it("treats a missing value as not qualifying, never as zero-passes", () => {
    for (const [row, matcher] of Object.entries(ROW_MATCHERS)) {
      const fires = matcher(ing("zzz-nonexistent"));
      expect(fires, `"${row}" fires on an empty ingredient`).toBe(false);
    }
  });
});

describe("rows that used to have no matcher", () => {
  it("all match now, because an unmatched row is not free", () => {
    for (const row of [
      "Omega-3",
      "Zinc",
      "Magnesium",
      "Tryptophan",
      "B vitamins",
      "Antioxidant polyphenols",
      "Polyphenols",
      "L-theanine",
    ]) {
      expect(ROW_MATCHERS[row], `"${row}" needs a matcher`).toBeTypeOf("function");
    }
  });
});
