export interface IngredientFacts {
  name: string;
  protein_g?: number | null;
  fiber_g?: number | null;
  potassium_mg?: number | null;
  sodium_mg?: number | null;
  calcium_dv?: number | null;
  vitamin_c_dv?: number | null;
  iron_mg?: number | null;
  iron_rich?: boolean | null;
  water_pct?: number | null;
  is_probiotic?: boolean | null;
  sat_fat_g?: number | null;
  total_sugar_g?: number | null;
  calorie_density?: number | null;
  is_added_sweetener?: boolean | null;
  magnesium_dv?: number | null;
  zinc_dv?: number | null;
  omega3_g?: number | null;
  tryptophan_g?: number | null;
  b_vitamin_dv?: number | null;
}

export const NUTRIENT_THRESHOLDS = {
  vitaminCDV: 20,
  proteinG: 5,
  fiberG: 3,
  potassiumMg: 200,
  calciumDV: 10,
  ironMg: 1.8,
  waterPct: 80,

  magnesiumDV: 10,
  zincDV: 10,
  bVitaminDV: 20,
  omega3G: 0.5,
  tryptophanG: 0.05,
} as const;

type Predicate = (f: IngredientFacts) => boolean;

const has = (v: number | null | undefined, min: number) => (v ?? 0) >= min;

const plural = (w: string): string =>
  w.endsWith("y") ? `${w.slice(0, -1)}(?:y|ies)` : `${w}(?:e?s)?`;

const named =
  (...words: string[]): Predicate =>
  (f) => {
    const n = f.name.toLowerCase();
    return words.some((w) => new RegExp(`\\b${plural(w)}\\b`, "i").test(n));
  };

const either =
  (...ps: Predicate[]): Predicate =>
  (f) => ps.some((p) => p(f));

export const ROW_MATCHERS: Record<string, Predicate> = {
  "Vitamin C": (f) => has(f.vitamin_c_dv, NUTRIENT_THRESHOLDS.vitaminCDV),
  Protein: (f) => has(f.protein_g, NUTRIENT_THRESHOLDS.proteinG),
  "Protein / biotin sources": (f) => has(f.protein_g, NUTRIENT_THRESHOLDS.proteinG),
  "Protein / amino acids": (f) => has(f.protein_g, NUTRIENT_THRESHOLDS.proteinG),
  "Soluble fiber": (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  Fiber: (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  "Prebiotic fiber": (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  "Low-FODMAP fiber": (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  Potassium: (f) => has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  Calcium: (f) => has(f.calcium_dv, NUTRIENT_THRESHOLDS.calciumDV),
  Iron: (f) => f.iron_rich === true || has(f.iron_mg, NUTRIENT_THRESHOLDS.ironMg),
  "Iron (plant sources)": (f) =>
    f.iron_rich === true || has(f.iron_mg, NUTRIENT_THRESHOLDS.ironMg),
  "Water content": (f) => has(f.water_pct, NUTRIENT_THRESHOLDS.waterPct),
  Hydration: (f) => has(f.water_pct, NUTRIENT_THRESHOLDS.waterPct),
  Electrolytes: (f) => has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  "Electrolytes (potassium, sodium, magnesium)": (f) =>
    has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  "Electrolytes (potassium, magnesium)": (f) =>
    has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  Probiotics: (f) => f.is_probiotic === true,
  "Probiotics / fermented ingredients": (f) => f.is_probiotic === true,

  Magnesium: (f) => has(f.magnesium_dv, NUTRIENT_THRESHOLDS.magnesiumDV),
  Zinc: (f) => has(f.zinc_dv, NUTRIENT_THRESHOLDS.zincDV),
  "B vitamins": (f) => has(f.b_vitamin_dv, NUTRIENT_THRESHOLDS.bVitaminDV),
  "Omega-3": either(
    (f) => has(f.omega3_g, NUTRIENT_THRESHOLDS.omega3G),
    named("flax", "flaxseed", "linseed", "chia", "walnut", "hemp",
          "salmon", "mackerel", "sardine", "algae", "algal"),
  ),
  Tryptophan: either(
    (f) => has(f.tryptophan_g, NUTRIENT_THRESHOLDS.tryptophanG),
    named("oat", "pumpkin seed", "sesame", "cashew", "tofu", "turkey", "egg"),
  ),

  "Antioxidant polyphenols": named(
    "berry", "blueberry", "blackberry", "raspberry", "strawberry", "cranberry",
    "acai", "elderberry", "pomegranate", "grape", "cherry", "plum",
    "cacao", "cocoa", "green tea", "matcha", "hibiscus", "roselle",
    "beet", "beetroot", "turmeric", "olive",
  ),
  Polyphenols: (f) => ROW_MATCHERS["Antioxidant polyphenols"](f),
  "L-theanine": named("green tea", "matcha", "black tea", "white tea", "tea leaf"),

  "Turmeric / curcumin": named("turmeric", "curcumin"),
  Cinnamon: named("cinnamon"),
  "Ginger, cinnamon": named("ginger", "cinnamon"),
  "Ginger, peppermint": named("ginger", "peppermint", "mint"),
  "Carminatives (ginger, peppermint, fennel)": named(
    "ginger",
    "peppermint",
    "mint",
    "fennel",
  ),
  Ashwagandha: named("ashwagandha"),
  Maca: named("maca"),
  Ginseng: named("ginseng"),
  "Flaxseed (lignans)": named("flax", "flaxseed", "linseed"),
  "Beetroot nitrates": named("beet", "beetroot"),
  "Beetroot (nitrates)": named("beet", "beetroot"),
  Garlic: named("garlic"),
  Spearmint: named("spearmint"),
  Chamomile: named("chamomile"),
  Hibiscus: named("hibiscus", "roselle"),
  "Mild diuretics (hibiscus, dandelion)": named("hibiscus", "roselle", "dandelion"),
  Elderberry: named("elderberry", "elderflower"),
  Blueberry: named("blueberry", "blueberries"),
  "Tart cherry": named("cherry", "cherries"),
  "Tart cherry (melatonin)": named("cherry", "cherries"),
  "Raw cacao": named("cacao", "cocoa"),
  Saffron: named("saffron"),
  Honey: named("honey"),
  "Coconut water": named("coconut water"),
  "Apple cider vinegar": named("apple cider vinegar", "acv"),
  "Cranberry compounds": named("cranberry", "cranberries"),
  "Red clover": named("red clover"),
  "Green tea (EGCG)": named("green tea", "matcha"),
  "Thermogenic polyphenols (green tea, capsaicin)": named(
    "green tea",
    "matcha",
    "cayenne",
    "chili",
    "chilli",
    "capsaicin",
  ),
  "Banana / tryptophan": named("banana", "bananas"),
  "Vitamin A precursors (carrot, sweet potato)": named(
    "carrot",
    "carrots",
    "sweet potato",
    "pumpkin",
    "butternut",
  ),
  "Insoluble fiber, psyllium, prunes": either(
    named("psyllium", "prune", "prunes"),
    (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  ),
  "Nuts / unsaturated fats": named(
    "almond",
    "almonds",
    "walnut",
    "walnuts",
    "cashew",
    "cashews",
    "pecan",
    "peanut",
    "nut butter",
    "avocado",
  ),
  "Caffeine (moderate)": named("coffee", "espresso", "green tea", "matcha", "black tea"),
};

type Row = { ingredient: string; tier: "primary" | "secondary" | "tertiary" };

const RANK = { primary: 3, secondary: 2, tertiary: 1 } as const;

export function matchRow(facts: IngredientFacts, rows: Row[]): Row | null {
  let best: Row | null = null;
  for (const row of rows) {
    const match = ROW_MATCHERS[row.ingredient];
    if (!match || !match(facts)) continue;
    if (!best || RANK[row.tier] > RANK[best.tier]) best = row;
  }
  return best;
}

/** Table rows a recipe satisfies, each counted once. */
export function matchRowsForRecipe(
  ingredients: IngredientFacts[],
  rows: Row[],
): Map<string, Row> {
  const matched = new Map<string, Row>();
  for (const facts of ingredients) {
    for (const row of rows) {
      const match = ROW_MATCHERS[row.ingredient];
      if (!match || !match(facts)) continue;
      const existing = matched.get(row.ingredient);
      if (!existing || RANK[row.tier] > RANK[existing.tier]) {
        matched.set(row.ingredient, row);
      }
    }
  }
  return matched;
}


export const PENALTY_THRESHOLDS = {
  sodiumMg: 200,
  satFatG: 5,
  calorieDensity: 200,
} as const;

export const PENALTY_MATCHERS: Record<string, Predicate> = {
  "Added sugar": (f) =>
    f.is_added_sweetener === true || named("sugar", "syrup", "agave", "molasses")(f),
  Sodium: (f) => has(f.sodium_mg, PENALTY_THRESHOLDS.sodiumMg) || named("salt")(f),
  "Saturated fat": (f) => has(f.sat_fat_g, PENALTY_THRESHOLDS.satFatG),
  Caffeine: named("coffee", "espresso", "green tea", "black tea", "matcha"),
  "Energy density": (f) => has(f.calorie_density, PENALTY_THRESHOLDS.calorieDensity),
  "Tannins (black tea)": named("black tea"),
  "Calcium / dairy (if combined)": named("milk", "yogurt", "yoghurt", "kefir", "cheese"),
  "Flaxseed / lignans": named("flax", "flaxseed", "linseed"),
};

export const UNIMPLEMENTABLE_PENALTIES = [
  "Glycemic load",
  "Trans fat",
  "High-FODMAP / fermentable carbs",
] as const;

export function matchPenalties(
  ingredients: IngredientFacts[],
  penalties: { ingredient: string }[],
): string[] {
  const hit = new Set<string>();
  for (const p of penalties) {
    const match = PENALTY_MATCHERS[p.ingredient];
    if (!match) continue;
    if (ingredients.some((f) => match(f))) hit.add(p.ingredient);
  }
  return [...hit];
}
