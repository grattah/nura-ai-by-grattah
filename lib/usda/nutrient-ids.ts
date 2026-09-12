export const USDA_NUTRIENT_IDS = {
  1008: "energy_kcal",
  1003: "protein_g",
  1004: "total_fat_g",
  1258: "sat_fat_g",
  1005: "carbs_g",
  1079: "fiber_g",
  2000: "total_sugar_g",
  1093: "sodium_mg",
  1087: "calcium_mg",
  1162: "vitamin_c_mg",
  1089: "iron_mg",
  1092: "potassium_mg",
  1051: "water_g",

  1090: "magnesium_mg",
  1095: "zinc_mg",
  1210: "tryptophan_g",

  1404: "ala_g",
  1278: "epa_g",
  1272: "dha_g",

  1165: "thiamin_mg",
  1166: "riboflavin_mg",
  1167: "niacin_mg",
  1175: "b6_mg",
  1177: "folate_ug",
  1178: "b12_ug",
} as const;

export type UsdaNutrientField = (typeof USDA_NUTRIENT_IDS)[keyof typeof USDA_NUTRIENT_IDS];

export const DAILY_VALUES = {
  calcium_mg: 1300,
  vitamin_c_mg: 90,
  iron_mg: 18,
  magnesium_mg: 420,
  zinc_mg: 11,
  thiamin_mg: 1.2,
  riboflavin_mg: 1.3,
  niacin_mg: 16,
  b6_mg: 1.7,
  folate_ug: 400,
  b12_ug: 2.4,
} as const;

const B_VITAMIN_FIELDS = [
  "thiamin_mg",
  "riboflavin_mg",
  "niacin_mg",
  "b6_mg",
  "folate_ug",
  "b12_ug",
] as const;

/** Derives omega-3 (ALA+EPA+DHA) and the max B-vitamin %DV. */
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
