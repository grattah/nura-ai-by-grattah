import type { NutrientPoints, Maxes } from "./match-metrics";

export const BONUS_VALUE = 0.15;

export const VITAMIN_C_DV_THRESHOLD = 20;

export const MEANINGFUL_POTASSIUM_DV = 10;
export const MEANINGFUL_SODIUM_DV = 5;

export const DV_POTASSIUM_MG = 4700;
export const DV_SODIUM_MG = 2300;

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
  vitaminCDV: number;
  waterContentPercent: number;
  sodiumMg: number;
  potassiumMg: number;
}

const ratio = (value: number, max: number) => (max > 0 ? value / max : 0);
const pctDV = (mg: number, dv: number) => (dv > 0 ? (mg / dv) * 100 : 0);

function hasMeaningfulElectrolytes(c: BonusContext): boolean {
  return (
    pctDV(c.sodiumMg, DV_SODIUM_MG) >= MEANINGFUL_SODIUM_DV &&
    pctDV(c.potassiumMg, DV_POTASSIUM_MG) >= MEANINGFUL_POTASSIUM_DV
  );
}

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

/** Returns 0 or BONUS_VALUE; OR-arms never stack. */
export function bonusFor(key: string, c: BonusContext): number {
  if (!isBonusKey(key)) return 0;
  return BONUS_TRIGGERS[key](c) ? BONUS_VALUE : 0;
}
