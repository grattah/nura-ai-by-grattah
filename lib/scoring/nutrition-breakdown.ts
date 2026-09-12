export interface NutritionPointRow {
  key: string;
  label: string;
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

const magnitude = (n: number | null): number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;

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
