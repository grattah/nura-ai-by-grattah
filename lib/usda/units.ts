// Household unit → grams conversion (PRD: USDA Nutrient Data Integration §4).
// Deterministic. Mass units are exact; volume units convert via ml × density
// (default 1.0, water-like, overridable per ingredient); count/size units use a
// curated per-item weight map. "scoop" is intentionally NOT convertible — scoop
// size is product-specific and must be flagged for manual entry, never defaulted.

import type { ParsedIngredient } from "./parse-ingredient";

const ML_PER_UNIT: Record<string, number> = {
  cup: 240, tbsp: 15, tsp: 5, fl_oz: 30, ml: 1, l: 1000,
};

const GRAMS_PER_MASS_UNIT: Record<string, number> = {
  g: 1, kg: 1000, oz: 28.3495, lb: 453.592,
};

// Small fixed-weight units (approximate, ingredient-agnostic).
const FIXED_UNIT_GRAMS: Record<string, number> = {
  pinch: 0.36, dash: 0.6, handful: 30, clove: 3, sprig: 3, stalk: 40, slice: 15,
  can: 400, inch: 6, leaf: 0.5, leaves: 0.5,
};

// Per-item gram weights for count-based ingredients (no unit, e.g. "1 banana",
// "1 medium apple"). Matched by keyword contained in the name. Size adjectives
// scale a medium baseline.
const ITEM_GRAMS: Array<{ match: RegExp; grams: number }> = [
  { match: /banana/, grams: 118 },
  { match: /apple/, grams: 182 },
  { match: /orange/, grams: 131 },
  { match: /lemon/, grams: 58 },
  { match: /lime/, grams: 67 },
  { match: /avocado/, grams: 150 },
  { match: /carrot/, grams: 61 },
  { match: /beet(root)?/, grams: 82 },
  { match: /kiwi/, grams: 69 },
  { match: /dates?\b/, grams: 24 }, // incl. plural "dates" / "medjool dates"
  { match: /egg\b/, grams: 50 },
  { match: /tomato/, grams: 123 },
  { match: /cucumber/, grams: 300 },
  { match: /pear/, grams: 178 },
  { match: /mango/, grams: 200 },
  { match: /peach/, grams: 150 },
  { match: /ice\b/, grams: 15 }, // ice cube (melts to water; excluded from FVL)
  { match: /mint/, grams: 0.5 }, // mint leaf
  { match: /celery/, grams: 40 }, // celery stalk
  { match: /aloe/, grams: 100 }, // aloe vera leaf (gel)
];

const SIZE_SCALE: Record<string, number> = { small: 0.7, medium: 1, large: 1.4 };

// Volume-unit density overrides (g/ml) for common non-water liquids/solids.
const DENSITY_OVERRIDES: Array<{ match: RegExp; density: number }> = [
  { match: /honey|syrup|molasses|agave/, density: 1.4 },
  { match: /oil\b/, density: 0.92 },
  { match: /nut butter|peanut butter|almond butter|tahini/, density: 1.05 },
  { match: /flour|powder|cocoa|matcha|protein/, density: 0.5 },
  { match: /oats|rolled oats/, density: 0.4 },
  { match: /yogurt|yoghurt/, density: 1.03 },
  { match: /milk/, density: 1.03 },
];

function densityFor(name: string): number {
  for (const d of DENSITY_OVERRIDES) if (d.match.test(name)) return d.density;
  return 1.0;
}

export interface GramResult {
  grams: number | null;
  needsReview: boolean;
  reason?: string;
}

export function toGrams(parsed: ParsedIngredient): GramResult {
  const { quantity, unit, name, gramsHint } = parsed;
  const qty = quantity ?? 1;

  // An explicit gram value in the label ("(approx. 25g)") always wins.
  if (gramsHint != null) return { grams: gramsHint, needsReview: false };

  if (unit === "scoop") {
    return { grams: null, needsReview: true, reason: "scoop is not standardized" };
  }

  if (unit && GRAMS_PER_MASS_UNIT[unit] !== undefined) {
    return { grams: qty * GRAMS_PER_MASS_UNIT[unit], needsReview: false };
  }

  if (unit && ML_PER_UNIT[unit] !== undefined) {
    const ml = qty * ML_PER_UNIT[unit];
    return { grams: ml * densityFor(name), needsReview: false };
  }

  if (unit && FIXED_UNIT_GRAMS[unit] !== undefined) {
    return { grams: qty * FIXED_UNIT_GRAMS[unit], needsReview: false };
  }

  // No unit → count-based item lookup by name keyword.
  if (!unit) {
    const sizeWord = Object.keys(SIZE_SCALE).find((s) => name.includes(s));
    const scale = sizeWord ? SIZE_SCALE[sizeWord] : 1;
    const item = ITEM_GRAMS.find((it) => it.match.test(name));
    if (item) return { grams: qty * item.grams * scale, needsReview: false };
  }

  // Unknown → let the caller resolve via USDA portion data or flag for review.
  return { grams: null, needsReview: true, reason: `unresolved unit/name: "${name}"` };
}
