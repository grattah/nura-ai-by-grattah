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

  // ── Category Score PRD-3 §6 ──────────────────────────────────────────────
  // Added because their calibration rows were UNSCOREABLE without them. A row
  // with no data behind it still counts toward MaxPossible (§4 Step 2), so
  // Sleep and Focus could not exceed 50% however good a recipe was, and
  // Beauty, Energy, Detox, Immunity, Gut Health, Hormones and Heart Health
  // were each capped well under 100%.
  //
  // Ids confirmed against the live FDC API (fdcId 170567, "Nuts, almonds").
  1090: "magnesium_mg", // Sleep (Primary)
  1095: "zinc_mg", // Immunity (Primary), Beauty (Tertiary)
  1210: "tryptophan_g", // Sleep (Secondary)

  // Omega-3 is three separate USDA entries, summed into one field below.
  // Hormones (Secondary), Focus (Primary), Heart Health (Primary).
  1404: "ala_g",
  1278: "epa_g",
  1272: "dha_g",

  // "B vitamins" is a class, not a USDA field — the six below roll up into one
  // %DV figure below. Energy (Primary).
  1165: "thiamin_mg",
  1166: "riboflavin_mg",
  1167: "niacin_mg",
  1175: "b6_mg",
  1177: "folate_ug",
  1178: "b12_ug",
} as const;

export type UsdaNutrientField = (typeof USDA_NUTRIENT_IDS)[keyof typeof USDA_NUTRIENT_IDS];

// FDA Daily Values used to convert raw amounts to %DV. Iron is stored as mg
// (PRD lists mg/%DV).
export const DAILY_VALUES = {
  calcium_mg: 1300, // mg
  vitamin_c_mg: 90, // mg
  iron_mg: 18, // mg (available if a %DV is ever needed)
  magnesium_mg: 420, // mg
  zinc_mg: 11, // mg
  // The six B vitamins, for the composite below.
  thiamin_mg: 1.2,
  riboflavin_mg: 1.3,
  niacin_mg: 16, // mg NE
  b6_mg: 1.7,
  folate_ug: 400, // µg DFE
  b12_ug: 2.4, // µg
} as const;

/** The six USDA fields that roll up into the single "B vitamins" figure. */
const B_VITAMIN_FIELDS = [
  "thiamin_mg",
  "riboflavin_mg",
  "niacin_mg",
  "b6_mg",
  "folate_ug",
  "b12_ug",
] as const;

/**
 * Values that are not single USDA entries and have to be derived.
 *
 * `omega3_g` sums ALA + EPA + DHA, which is how the total is normally quoted.
 *
 * `b_vitamin_dv` takes the HIGHEST %DV among the six B vitamins, not the mean.
 * A mean punishes exactly the foods the Energy row is meant to catch —
 * nutritional yeast is an enormous B12 source and unremarkable elsewhere, and
 * plant foods report no B12 at all, which a mean would read as a zero rather
 * than as "not measured". The max maps cleanly onto the FDA's own wording: at
 * a 20% threshold it means "an excellent source of at least one B vitamin".
 */
export function deriveComposites(
  n: Partial<Record<UsdaNutrientField, number>>,
): { omega3_g?: number; b_vitamin_dv?: number } {
  const out: { omega3_g?: number; b_vitamin_dv?: number } = {};

  const omega = [n.ala_g, n.epa_g, n.dha_g].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (omega.length) out.omega3_g = omega.reduce((a, b) => a + b, 0);

  const dvs = B_VITAMIN_FIELDS.map((f) => {
    const raw = n[f];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    return (raw / DAILY_VALUES[f]) * 100;
  }).filter((v): v is number => v !== null);
  if (dvs.length) out.b_vitamin_dv = Math.max(...dvs);

  return out;
}

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
