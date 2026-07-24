// Ties the USDA roll-up to the deterministic Base Nutrition Score. Produces both
// the `nutrition_scoring` input blob (persisted so re-scoring needs no re-join)
// and the BNS output columns. Pure — no LLM, no DB.

import type { RecipeRollup } from "@/lib/usda/rollup";
import type { Track, Preparation } from "./track";
import { scoreBaseNutrition, type BnsInput, type BnsResult } from "./base-nutrition";

// The per-100 inputs the scorer needs, minus classification (which comes from
// the recipe name / prep text). Stored in recipes.nutrition_scoring.
export type ScoringInput = Omit<BnsInput, "track" | "preparation">;

export function rollupToScoringInput(r: RecipeRollup): ScoringInput {
  return {
    energy_kcal: r.per100.energy_kcal,
    total_sugar_g: r.per100.total_sugar_g,
    added_sugar_g: r.added_sugar_per100,
    sat_fat_g: r.per100.sat_fat_g,
    sodium_mg: r.per100.sodium_mg,
    protein_g: r.per100.protein_g,
    fiber_g: r.per100.fiber_g,
    fvl_pct: r.fvl_pct,
    sweetener_present: r.sweetener_present,
    ingredient_score: r.ingredient_score,
  };
}

/** Map a BnsResult to the recipes BNS-v2 columns (DB write shape). */
export function bnsColumns(res: BnsResult) {
  return {
    bns_grade: res.grade,
    nutrition_score_10: res.nutrition_score,
    ingredient_score_10: res.ingredient_score_10,
    final_score_10: res.final_score,
    sugar_points: res.sugar_points,
    salt_points: res.salt_points,
    sat_fat_points: res.sat_fat_points,
    energy_points: res.energy_points,
    fiber_points: res.fiber_points,
    protein_points: res.protein_points,
    fvl_points: res.fvl_points,
    sweetener_penalty: res.track === "Beverage" && !!res.sweetener_penalty_applied,
  };
}

/** Full deterministic score from a scoring input + classification. */
export function scoreFromInput(
  input: ScoringInput,
  track: Track,
  preparation: Preparation,
): BnsResult {
  return scoreBaseNutrition({ ...input, track, preparation });
}
