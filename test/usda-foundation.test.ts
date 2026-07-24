import { describe, it, expect } from "vitest";
import { parseIngredient } from "@/lib/usda/parse-ingredient";
import { toGrams } from "@/lib/usda/units";
import { rollupRecipe, type ResolvedIngredient } from "@/lib/usda/rollup";
import { extractNutrients } from "@/lib/usda/nutrient-ids";

describe("parseIngredient", () => {
  it("splits quantity, unit, and name", () => {
    expect(parseIngredient("1 cup brewed green tea")).toMatchObject({
      quantity: 1,
      unit: "cup",
      name: "brewed green tea",
    });
  });
  it("handles unicode + mixed fractions", () => {
    expect(parseIngredient("1 ½ tbsp honey").quantity).toBeCloseTo(1.5);
    expect(parseIngredient("½ cup oats").quantity).toBeCloseTo(0.5);
    expect(parseIngredient("1/4 tsp salt").quantity).toBeCloseTo(0.25);
  });
  it("defaults quantity to 1 and count items have no unit", () => {
    expect(parseIngredient("banana")).toMatchObject({ quantity: 1, unit: null, name: "banana" });
    expect(parseIngredient("1 medium banana")).toMatchObject({ unit: null, name: "medium banana" });
  });
  it("strips parentheticals and 'of'", () => {
    expect(parseIngredient("2 tbsp of almond butter (raw)")).toMatchObject({
      quantity: 2,
      unit: "tbsp",
      name: "almond butter",
    });
  });
  it("drops comma descriptors and 'piece'", () => {
    expect(parseIngredient("3 Medjool dates, pitted")).toMatchObject({ quantity: 3, name: "medjool dates" });
    expect(parseIngredient("1-inch piece fresh ginger, peeled")).toMatchObject({ quantity: 1, unit: "inch", name: "fresh ginger" });
  });
  it("strips 'juice of' and keeps the fruit + fraction", () => {
    expect(parseIngredient("Juice of 1/2 lime")).toMatchObject({ quantity: 0.5, name: "lime" });
  });
  it("captures a gram hint from a parenthetical", () => {
    expect(parseIngredient("1 scoop (approx. 25g) protein powder").gramsHint).toBe(25);
    expect(parseIngredient("1 (100g) packet frozen acai purée").gramsHint).toBe(100);
  });
});

describe("toGrams", () => {
  it("converts the PRD banana example (118g/item)", () => {
    const g = toGrams(parseIngredient("1 medium banana")).grams;
    expect(g).toBeCloseTo(118, 0);
  });
  it("mass units are exact", () => {
    expect(toGrams(parseIngredient("30 g spinach")).grams).toBeCloseTo(30);
    expect(toGrams(parseIngredient("1 oz almonds")).grams).toBeCloseTo(28.35, 1);
  });
  it("volume × density (honey is denser than water)", () => {
    expect(toGrams(parseIngredient("1 tbsp honey")).grams).toBeCloseTo(21, 0); // 15ml × 1.4
    expect(toGrams(parseIngredient("1 cup water")).grams).toBeCloseTo(240, 0); // 240ml × 1.0
  });
  it("flags scoop for manual review (no gram hint)", () => {
    const r = toGrams(parseIngredient("1 scoop protein powder"));
    expect(r.grams).toBeNull();
    expect(r.needsReview).toBe(true);
  });
  it("a gram hint overrides an unweighable unit", () => {
    const r = toGrams(parseIngredient("1 scoop (approx. 25g) protein powder"));
    expect(r.grams).toBe(25);
    expect(r.needsReview).toBe(false);
  });
  it("new units: inch of ginger, ice cubes, dates, mint leaves", () => {
    expect(toGrams(parseIngredient("1 inch fresh ginger")).grams).toBeCloseTo(6, 0);
    expect(toGrams(parseIngredient("4-5 ice cubes")).grams).toBeCloseTo(4.5 * 15, 0);
    expect(toGrams(parseIngredient("3 Medjool dates, pitted")).grams).toBeCloseTo(72, 0);
    expect(toGrams(parseIngredient("3-4 fresh mint leaves")).grams).toBeCloseTo(3.5 * 0.5, 1);
  });
});

describe("extractNutrients", () => {
  it("maps USDA nutrient ids to fields (banana fiber 2.6/100g)", () => {
    const out = extractNutrients([
      { nutrientId: 1079, amount: 2.6 },
      { nutrient: { id: 1003 }, amount: 1.1 },
      { nutrientNumber: "9999", amount: 5 }, // ignored (not in the 12)
    ]);
    expect(out.fiber_g).toBe(2.6);
    expect(out.protein_g).toBe(1.1);
    expect(Object.keys(out)).toHaveLength(2);
  });
});

describe("rollupRecipe", () => {
  it("standardizes per-100, FVL%, water, and NOVA IngredientScore", () => {
    const zero = {
      protein_g: 0, total_fat_g: 0, sat_fat_g: 0, carbs_g: 0, fiber_g: 0,
      total_sugar_g: 0, sodium_mg: 0, calcium_dv: 0, vitamin_c_dv: 0, iron_mg: 0,
    };
    const ingredients: ResolvedIngredient[] = [
      // 100g banana: whole food (NOVA1, FVL), 2.6 fiber/100g, ~75% water.
      { name: "banana", grams: 100, nova_group: 1, is_fvl: true, iron_rich: false,
        energy_kcal: 89, water_pct: 75, ...zero, fiber_g: 2.6 },
      // 100ml water: excluded from FVL + NOVA base.
      { name: "water", grams: 100, nova_group: 1, is_fvl: false, iron_rich: false,
        energy_kcal: 0, water_pct: 100, ...zero },
    ];
    const r = rollupRecipe(ingredients, 1);
    expect(r.totalWeight).toBe(200);
    expect(r.added_sugar_per100).toBe(0); // no added-sweetener ingredient
    expect(r.sweetener_present).toBe(false);
    // FVL% denominator excludes water → banana is 100% of solids.
    expect(r.fvl_pct).toBeCloseTo(100);
    // per-100 fiber over 200g total = 1.3.
    expect(r.per100.fiber_g).toBeCloseTo(1.3);
    // NOVA-weighted (water excluded) → all NOVA1 → 100.
    expect(r.ingredient_score).toBeCloseTo(100);
    // water content: (75 + 100) / 200 = 0.875.
    expect(r.water_content_pct).toBeCloseTo(0.875);
  });

  it("iron_rich propagates if any ingredient is iron-rich", () => {
    const base = {
      energy_kcal: 0, protein_g: 0, total_fat_g: 0, sat_fat_g: 0, carbs_g: 0,
      fiber_g: 0, total_sugar_g: 0, sodium_mg: 0, calcium_dv: 0, vitamin_c_dv: 0,
      iron_mg: 0, water_pct: 0,
    };
    const r = rollupRecipe(
      [
        { name: "spinach", grams: 50, nova_group: 1, is_fvl: true, iron_rich: true, ...base },
        { name: "apple", grams: 50, nova_group: 1, is_fvl: true, iron_rich: false, ...base },
      ],
      1,
    );
    expect(r.iron_rich).toBe(true);
  });
});
