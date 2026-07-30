// lib/scoring/nutrition-breakdown.ts — the Nutri score drawer's two lists.
//
// Turns the seven point columns stored on `recipes` into the "Points earned" /
// "Points lost" rows. Deliberately separate from NutrientPoints in
// ./match-metrics.ts, which carries only the six fields the match formulas use —
// the fruit/vegetable/legume credit has no part in matching but is shown here.

export interface NutritionPointRow {
  key: string;
  label: string;
  /** Magnitude, always ≥ 0. The sign is a display concern of the section. */
  points: number;
}

export interface NutritionBreakdown {
  earned: NutritionPointRow[];
  lost: NutritionPointRow[];
}

export interface NutritionPointInput {
  fiber: number | null;
  protein: number | null;
  fvl: number | null;
  energy: number | null;
  sugar: number | null;
  satFat: number | null;
  salt: number | null;
}

// scoreBaseNutrition stores both sides as positive magnitudes (that's how
// negative_total sums them), so a partially scored recipe can still hand us a
// null. Clamp so the drawer can never render "-null" or a stray minus sign.
const magnitude = (n: number | null): number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;

/**
 * Row order matches the design: Fiber → Protein → FVL, then Calories → Sugar →
 * Saturated fat → Salt. Every row is always present, zero included — a recipe
 * that earned nothing for fiber should say so rather than omit the line.
 */
export function nutritionBreakdown(
  points: NutritionPointInput,
): NutritionBreakdown {
  return {
    earned: [
      { key: "fiber", label: "Fiber", points: magnitude(points.fiber) },
      { key: "protein", label: "Protein", points: magnitude(points.protein) },
      {
        key: "fvl",
        label: "Fruit, vegetable & legume content",
        points: magnitude(points.fvl),
      },
    ],
    lost: [
      { key: "energy", label: "Calories", points: magnitude(points.energy) },
      { key: "sugar", label: "Sugar", points: magnitude(points.sugar) },
      { key: "satFat", label: "Saturated fat", points: magnitude(points.satFat) },
      { key: "salt", label: "Salt", points: magnitude(points.salt) },
    ],
  };
}
