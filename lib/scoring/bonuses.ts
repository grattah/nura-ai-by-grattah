// lib/scoring/bonuses.ts — the ONE implementation of the nutrient/ingredient
// bonus, shared by the Recipe Match Score's goals (Match PRD §5.1) and the
// Category Score's categories (Category PRD §4).
//
// Category PRD §8 is explicit about this: "For the 8 categories with a bonus
// term, this is the SAME formula used by the Recipe Match Score for the
// equivalent goal. Implement this calculation once and have both systems read
// the same stored value, rather than maintaining two separate calculations that
// could drift apart." The 8 bonus categories map 1:1 onto the 8 bonus goals, and
// the keys below are the category slugs, so categories index this directly and
// goals come through GOAL_BONUS_KEY in ./match-metrics.
//
// The bonus only ever ADDS credit — it can never reduce a score — and it does
// not stack: one flat 0.15 when any trigger arm passes.

import type { NutrientPoints, Maxes } from "./match-metrics";

/** PRD §3: flat, applied once per goal/category if any trigger condition is met. */
export const BONUS_VALUE = 0.15;

/** Vitamin C trigger for Beauty / Immunity (PRD §5.1). */
export const VITAMIN_C_DV_THRESHOLD = 20;

// The PRD says "sodium present AND potassium present in meaningful amount"
// without defining either. These are the interpretation, kept named and adjacent
// so they can be tuned once real data shows the distribution:
//   • Potassium at 10% DV = 470 mg of the FDA's 4700 mg — a genuine contribution.
//   • Sodium needs a floor too; without one "present" is true of nearly every
//     recipe and the AND stops discriminating at all.
export const MEANINGFUL_POTASSIUM_DV = 10;
export const MEANINGFUL_SODIUM_DV = 5;

export const DV_POTASSIUM_MG = 4700;
export const DV_SODIUM_MG = 2300;

/** The 8 keys with a bonus term. Identical between goals and categories. */
export const BONUS_KEYS = [
  "energy",
  "fitness",
  "weight-loss",
  "gut-health",
  "hydration",
  "beauty",
  "immunity",
  "detox",
] as const;

export type BonusKey = (typeof BONUS_KEYS)[number];

export interface BonusContext {
  points: NutrientPoints;
  maxes: Maxes;
  ironRich: boolean;
  probiotic: boolean;
  /** Vitamin C as % of Daily Value, per serving. */
  vitaminCDV: number;
  /** 0..1 */
  waterContentPercent: number;
  /** Per serving. */
  sodiumMg: number;
  /** Per serving. */
  potassiumMg: number;
}

const ratio = (value: number, max: number) => (max > 0 ? value / max : 0);
const pctDV = (mg: number, dv: number) => (dv > 0 ? (mg / dv) * 100 : 0);

/** "sodium present AND potassium present in meaningful amount" (Hydration). */
function hasMeaningfulElectrolytes(c: BonusContext): boolean {
  return (
    pctDV(c.sodiumMg, DV_SODIUM_MG) >= MEANINGFUL_SODIUM_DV &&
    pctDV(c.potassiumMg, DV_POTASSIUM_MG) >= MEANINGFUL_POTASSIUM_DV
  );
}

/**
 * Trigger conditions, verbatim from Match PRD §5.1 / Category PRD §4. Note
 * `fitness` is the only AND — every other multi-arm trigger is an OR.
 */
export const BONUS_TRIGGERS: Record<BonusKey, (c: BonusContext) => boolean> = {
  energy: (c) =>
    ratio(c.points.protein, c.maxes.protein) >= 0.6 || c.ironRich,

  fitness: (c) =>
    ratio(c.points.protein, c.maxes.protein) >= 0.6 &&
    ratio(c.points.energy, c.maxes.energy) >= 0.5,

  "weight-loss": (c) =>
    1 - ratio(c.points.energy, c.maxes.energy) >= 0.6 ||
    ratio(c.points.fiber, c.maxes.fiber) >= 0.6 ||
    ratio(c.points.protein, c.maxes.protein) >= 0.6,

  "gut-health": (c) =>
    ratio(c.points.fiber, c.maxes.fiber) >= 0.6 || c.probiotic,

  hydration: (c) =>
    c.waterContentPercent >= 0.7 || hasMeaningfulElectrolytes(c),

  beauty: (c) => c.vitaminCDV >= VITAMIN_C_DV_THRESHOLD,

  immunity: (c) => c.vitaminCDV >= VITAMIN_C_DV_THRESHOLD,

  detox: (c) => ratio(c.points.fiber, c.maxes.fiber) >= 0.6,
};

export function isBonusKey(key: string): key is BonusKey {
  return (BONUS_KEYS as readonly string[]).includes(key);
}

/**
 * 0 or BONUS_VALUE — never more, however many OR arms pass. Unknown keys score
 * 0, which is what makes the 6 bonus-less categories work without a branch.
 */
export function bonusFor(key: string, c: BonusContext): number {
  if (!isBonusKey(key)) return 0;
  return BONUS_TRIGGERS[key](c) ? BONUS_VALUE : 0;
}
