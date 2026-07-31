// USDA FoodData Central nutrient-number → Nuko field map (PRD: USDA Nutrient
// Data Integration §3). USDA's API tags nutrients by numeric id, not name. We
// extract exactly these 13 fields and ignore the rest of USDA's 50+ panel.
//
// Note: 2000 "Total sugars" reflects ALL sugar (intrinsic + added). The
// intrinsic-vs-added distinction (Base Nutrition Score Beverage Juiced/Blended
// rule) is applied later in scoring — USDA does not make that distinction.

export const USDA_NUTRIENT_IDS = {
  1008: "energy_kcal",
  1003: "protein_g",
  1004: "total_fat_g",
  1258: "sat_fat_g",
  1005: "carbs_g",
  1079: "fiber_g",
  2000: "total_sugar_g",
  1093: "sodium_mg",
  1087: "calcium_mg", // raw mg — converted to %DV downstream
  1162: "vitamin_c_mg", // raw mg — converted to %DV downstream
  1089: "iron_mg",
  1092: "potassium_mg", // raw mg — the Hydration bonus's electrolyte arm
  1051: "water_g", // grams per 100g == water_pct on a 100g basis
} as const;

export type UsdaNutrientField = (typeof USDA_NUTRIENT_IDS)[keyof typeof USDA_NUTRIENT_IDS];

// FDA Daily Values used to convert raw amounts to %DV for the two micronutrients
// stored as %DV (calcium, vitamin C). Iron is stored as mg (PRD lists mg/%DV).
export const DAILY_VALUES = {
  calcium_mg: 1300, // mg
  vitamin_c_mg: 90, // mg
  iron_mg: 18, // mg (available if a %DV is ever needed)
} as const;

/**
 * Reduce a USDA food's `foodNutrients[]` into our 12-field record. Accepts the
 * shape returned by both the Search and Foods endpoints (nutrient id may live at
 * `nutrientId`, `nutrient.id`, or `nutrientNumber`).
 */
export function extractNutrients(
  foodNutrients: Array<Record<string, unknown>>,
): Partial<Record<UsdaNutrientField, number>> {
  const out: Partial<Record<UsdaNutrientField, number>> = {};
  for (const fn of foodNutrients ?? []) {
    const id = Number(
      fn.nutrientId ??
        (fn.nutrient as Record<string, unknown> | undefined)?.id ??
        fn.nutrientNumber,
    );
    const field = USDA_NUTRIENT_IDS[id as keyof typeof USDA_NUTRIENT_IDS];
    if (!field) continue;
    const amount = Number(fn.amount ?? fn.value);
    if (Number.isFinite(amount)) out[field] = amount;
  }
  return out;
}
