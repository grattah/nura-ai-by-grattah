import { describe, it, expect } from "vitest";
import { scoreBaseNutrition, type BnsInput } from "@/lib/scoring/base-nutrition";
import { classifyTrack, classifyPreparation } from "@/lib/scoring/track";

const base: Omit<BnsInput, "track" | "preparation"> = {
  energy_kcal: 0, total_sugar_g: 0, added_sugar_g: 0, sat_fat_g: 0, sodium_mg: 0,
  protein_g: 0, fiber_g: 0, fvl_pct: 0, ingredient_score: 0,
};

describe("Base Nutrition Score — PRD worked examples", () => {
  it("Almond Maca Shake (Beverage, Blended) → 5.9 / 10", () => {
    // per-100ml: ~350 kJ → 8pts; sugar exempt (Blended) → 0; satfat 0.22 → 0;
    // salt 0.094g ⇒ sodium ≈ 37.6mg; fiber 2.31 → 0; protein 1.77 → 2; FVL 34.8 → 0.
    const r = scoreBaseNutrition({
      ...base,
      track: "Beverage",
      preparation: "Blended",
      energy_kcal: 350 / 4.184, // kJ→kcal so kJ() returns ~350
      total_sugar_g: 12, // intrinsic; exempt because Blended
      added_sugar_g: 0,
      sat_fat_g: 0.22,
      sodium_mg: 0.094 * 1000 / 2.5, // salt 0.094g → sodium mg
      protein_g: 1.77,
      fiber_g: 2.31,
      fvl_pct: 34.8,
      ingredient_score: 69.4,
    });
    expect(r.energy_points).toBe(8);
    expect(r.sugar_points).toBe(0);
    expect(r.protein_points).toBe(2);
    expect(r.negative_total).toBe(8);
    expect(r.positive_total).toBe(2);
    expect(r.raw_score).toBe(6);
    expect(r.grade).toBe("C");
    expect(r.nutrition_score).toBe(5.5);
    expect(r.final_score).toBe(5.9);
  });

  it("Ginger Turmeric Tea (Beverage, Juiced) → 6.6 / 10", () => {
    // ~38 kJ → 1pt; sugar 2.1 (all, Juiced) → 2; rest 0; FVL 6.4 → 0.
    const r = scoreBaseNutrition({
      ...base,
      track: "Beverage",
      preparation: "Juiced",
      energy_kcal: 38 / 4.184,
      total_sugar_g: 2.1,
      added_sugar_g: 2.1,
      protein_g: 0,
      fiber_g: 0,
      fvl_pct: 6.4,
      ingredient_score: 90.7,
    });
    expect(r.energy_points).toBe(1);
    expect(r.sugar_points).toBe(2);
    expect(r.negative_total).toBe(3);
    expect(r.positive_total).toBe(0);
    expect(r.raw_score).toBe(3);
    expect(r.grade).toBe("C");
    expect(r.final_score).toBe(6.6);
  });
});

describe("Track / Preparation classification", () => {
  it("beverage keywords vs solid override", () => {
    expect(classifyTrack("Ginger Turmeric Tea")).toBe("Beverage");
    expect(classifyTrack("Smoothie Bowl")).toBe("Solid Food");
    expect(classifyTrack("Chia Pudding")).toBe("Solid Food");
  });

  it("yogurt decides the track only when nothing says it's a drink", () => {
    // Eaten with a spoon — was scored against BEVERAGE thresholds (sugar max 10,
    // per-100ml bands) before yogurt was recognised.
    expect(classifyTrack("Greek Yogurt with Chia Seeds")).toBe("Solid Food");
    // …but these are drunk, and a blanket yogurt override would have broken them.
    expect(classifyTrack("Banana Yogurt Smoothie")).toBe("Beverage");
    expect(classifyTrack("Greek Yogurt Chia Smoothie")).toBe("Beverage");
  });

  it("matches whole words, so solid keywords don't hide inside other foods", () => {
    // "bar" is inside "rhubarb"/"barley"; "bite" is inside "bitter".
    expect(classifyTrack("Rhubarb Ginger Juice")).toBe("Beverage");
    expect(classifyTrack("Barley Water")).toBe("Beverage");
    expect(classifyTrack("Bitter Melon Juice")).toBe("Beverage");
    // The real keywords still work.
    expect(classifyTrack("Almond Energy Bar")).toBe("Solid Food");
    expect(classifyTrack("Protein Bite")).toBe("Solid Food");
  });
  it("prep-based Juiced/Blended with Juiced default", () => {
    expect(classifyPreparation("Beverage", "Blend until smooth")).toBe("Blended");
    expect(classifyPreparation("Beverage", "Cold-press and strain the pulp")).toBe("Juiced");
    expect(classifyPreparation("Beverage", "Steep for 5 minutes")).toBe("Juiced"); // default
    expect(classifyPreparation("Solid Food", "Blend")).toBe("N/A");
  });
});

describe("Combining rule — protein exclusion when NegTotal ≥ 11 (Solid)", () => {
  it("excludes protein from the raw score at high negatives", () => {
    const r = scoreBaseNutrition({
      ...base,
      track: "Solid Food",
      preparation: "N/A",
      energy_kcal: 4000 / 4.184, // very high energy → many neg points
      total_sugar_g: 40,
      sat_fat_g: 12,
      sodium_mg: (2.5 / 2.5) * 1000, // salt ~2.5g
      protein_g: 20, // would be 7 protein points, but excluded
      fiber_g: 10,
      fvl_pct: 0,
    });
    expect(r.negative_total).toBeGreaterThanOrEqual(11);
    // raw = neg - fiber - fvl (protein NOT subtracted)
    expect(r.raw_score).toBe(r.negative_total - r.fiber_points - r.fvl_points);
  });
});
