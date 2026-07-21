// Personalized Nutrition Score — Modifier Table (PRD §5), in code for reliable,
// deterministic arithmetic. Each disclosed condition/goal multiplies the
// negative-point weight of a specific factor; the highest applicable multiplier
// wins per factor (never stacked). Positive factors are never modified.
//
// Keys match lib/health-profile/options.ts (CONDITIONS / GOALS).

export type NutritionFactor = "addedSugar" | "saturatedFat" | "sodium";

interface Modifier {
  // "calorieDensity" has no corresponding base-score factor (PRD "if tracked"),
  // so it is intentionally a no-op here — kept for documentation.
  factor: NutritionFactor | "calorieDensity";
  multiplier: number;
}

const CONDITION_MODIFIERS: Record<string, Modifier[]> = {
  "type-1-diabetes": [{ factor: "addedSugar", multiplier: 2 }],
  "type-2-diabetes": [{ factor: "addedSugar", multiplier: 2 }],
  prediabetes: [{ factor: "addedSugar", multiplier: 2 }],
  pcos: [{ factor: "addedSugar", multiplier: 2 }],
  "high-cholesterol": [{ factor: "saturatedFat", multiplier: 2 }],
  "high-blood-pressure": [{ factor: "sodium", multiplier: 2 }],
  "kidney-disease": [{ factor: "sodium", multiplier: 2 }],
  "heart-disease": [
    { factor: "sodium", multiplier: 2 },
    { factor: "saturatedFat", multiplier: 2 },
  ],
  "liver-disease": [
    { factor: "addedSugar", multiplier: 2 },
    { factor: "saturatedFat", multiplier: 2 },
  ],
};

const GOAL_MODIFIERS: Record<string, Modifier[]> = {
  "weight-loss": [{ factor: "calorieDensity", multiplier: 1.5 }], // no-op
};

export type FactorMultipliers = Record<NutritionFactor, number>;

/** Highest multiplier per factor across all disclosed conditions/goals. */
export function computeMultipliers(
  conditions: string[],
  goals: string[],
): FactorMultipliers {
  const m: FactorMultipliers = { addedSugar: 1, saturatedFat: 1, sodium: 1 };
  const apply = (mods: Modifier[] | undefined) => {
    for (const mod of mods ?? []) {
      if (mod.factor === "calorieDensity") continue; // untracked → skip
      m[mod.factor] = Math.max(m[mod.factor], mod.multiplier);
    }
  };
  for (const c of conditions) apply(CONDITION_MODIFIERS[c]);
  for (const g of goals) apply(GOAL_MODIFIERS[g]);
  return m;
}

/** Human-readable list of the modifiers that actually applied (for storage). */
export function describeModifiers(m: FactorMultipliers): string[] {
  const label: Record<NutritionFactor, string> = {
    addedSugar: "Added sugar",
    saturatedFat: "Saturated fat",
    sodium: "Sodium",
  };
  return (Object.keys(m) as NutritionFactor[])
    .filter((f) => m[f] > 1)
    .map((f) => `${label[f]} ×${m[f]}`);
}
