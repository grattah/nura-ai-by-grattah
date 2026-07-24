// Deterministic per-recipe nutrient roll-up (PRD: USDA §4/§5 consumption).
// Sums resolved per-ingredient USDA values (each stored per-100 basis) scaled by
// the ingredient's gram weight, then derives the per-100g/ml standardized values,
// FVL%, water content, iron flag, and the NOVA-weighted IngredientScore that the
// Base Nutrition Score and Recipe Match Score need. No LLM, no network.

// Per-100 nutrient fields carried on each resolved ingredient.
export interface Per100Nutrients {
  energy_kcal: number;
  protein_g: number;
  total_fat_g: number;
  sat_fat_g: number;
  carbs_g: number;
  fiber_g: number;
  total_sugar_g: number;
  sodium_mg: number;
  calcium_dv: number;
  vitamin_c_dv: number;
  iron_mg: number;
  water_pct: number;
}

export interface ResolvedIngredient extends Per100Nutrients {
  name: string;
  grams: number;
  nova_group: number; // 1..4
  is_fvl: boolean;
  iron_rich: boolean;
  is_added_sweetener?: boolean; // honey/syrup/juice concentrate — added sugar source
  is_sweetener_nnutritive?: boolean; // stevia/sucralose/aspartame — +4 beverage penalty
}

const NOVA_TIER_POINTS: Record<number, number> = { 1: 100, 2: 75, 3: 50, 4: 25 };
const WATER_RE = /\b(water|ice)\b/;

export interface RecipeRollup {
  totalWeight: number; // grams incl. water/ice
  servings: number;
  // Standardized per-100 (by mass; ≈ per-100ml for water-based beverages).
  per100: Per100Nutrients;
  added_sugar_per100: number; // sugar from added-sweetener ingredients only
  // Per-serving absolute amounts (for display nutrition).
  perServing: Per100Nutrients & { energy_kj: number };
  fvl_pct: number; // 0..100, water/ice excluded from denominator
  water_content_pct: number; // 0..1
  iron_rich: boolean;
  sweetener_present: boolean; // any non-nutritive sweetener present
  ingredient_score: number; // 0..100 NOVA-weighted average (water/ice excluded)
}

const NUTRIENT_KEYS: (keyof Per100Nutrients)[] = [
  "energy_kcal", "protein_g", "total_fat_g", "sat_fat_g", "carbs_g", "fiber_g",
  "total_sugar_g", "sodium_mg", "calcium_dv", "vitamin_c_dv", "iron_mg", "water_pct",
];

export function rollupRecipe(
  ingredients: ResolvedIngredient[],
  servings: number,
): RecipeRollup {
  const s = Math.max(1, servings || 1);
  const totalWeight = ingredients.reduce((a, i) => a + (i.grams || 0), 0);

  // Absolute totals: per-100 value ÷ 100 × grams.
  const totals = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [
      k,
      ingredients.reduce((a, i) => a + ((i[k] || 0) / 100) * (i.grams || 0), 0),
    ]),
  ) as unknown as Record<keyof Per100Nutrients, number>;

  const per100 = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [
      k,
      totalWeight > 0 ? (totals[k] / totalWeight) * 100 : 0,
    ]),
  ) as unknown as Per100Nutrients;

  const perServing = {
    ...(Object.fromEntries(
      NUTRIENT_KEYS.map((k) => [k, totals[k] / s]),
    ) as unknown as Per100Nutrients),
    energy_kj: (totals.energy_kcal / s) * 4.184,
  };

  // FVL% and IngredientScore exclude water/ice from the weight base.
  const solids = ingredients.filter((i) => !WATER_RE.test(i.name.toLowerCase()));
  const solidWeight = solids.reduce((a, i) => a + (i.grams || 0), 0);
  const fvlWeight = solids
    .filter((i) => i.is_fvl)
    .reduce((a, i) => a + (i.grams || 0), 0);
  const fvl_pct = solidWeight > 0 ? (fvlWeight / solidWeight) * 100 : 0;

  const novaWeighted = solids.reduce(
    (a, i) => a + (i.grams || 0) * (NOVA_TIER_POINTS[i.nova_group] ?? 50),
    0,
  );
  const ingredient_score = solidWeight > 0 ? novaWeighted / solidWeight : 0;

  // Water content = total water mass / total mass (0..1).
  const waterMass = ingredients.reduce(
    (a, i) => a + ((i.water_pct || 0) / 100) * (i.grams || 0),
    0,
  );
  const water_content_pct = totalWeight > 0 ? waterMass / totalWeight : 0;

  // Added sugar (per-100): sugar contributed only by added-sweetener ingredients.
  const addedSugarTotal = ingredients
    .filter((i) => i.is_added_sweetener)
    .reduce((a, i) => a + ((i.total_sugar_g || 0) / 100) * (i.grams || 0), 0);
  const added_sugar_per100 =
    totalWeight > 0 ? (addedSugarTotal / totalWeight) * 100 : 0;

  return {
    totalWeight,
    servings: s,
    per100,
    added_sugar_per100,
    perServing,
    fvl_pct,
    water_content_pct,
    iron_rich: ingredients.some((i) => i.iron_rich),
    sweetener_present: ingredients.some((i) => i.is_sweetener_nnutritive),
    ingredient_score,
  };
}
