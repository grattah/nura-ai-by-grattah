// Base Nutrition Score — deterministic rewrite (PRD: Base Nutrition Score,
// Updated). Real Nutri-Score thresholds → A–E grade → 1–10 NutritionScore,
// blended 70/30 with the NOVA IngredientScore. No LLM. Reproduces the PRD worked
// examples exactly (see test/base-nutrition.test.ts).

import type { Track, Preparation } from "./track";

export type Grade = "A" | "B" | "C" | "D" | "E";

export interface BnsInput {
  track: Track;
  preparation: Preparation;
  // Standardized per-100g (Solid) or per-100ml (Beverage).
  energy_kcal: number;
  total_sugar_g: number; // all sugar (intrinsic + added)
  added_sugar_g: number; // separately-added sweeteners only
  sat_fat_g: number;
  sodium_mg: number;
  protein_g: number;
  fiber_g: number;
  fvl_pct: number; // 0..100
  sweetener_present?: boolean; // non-nutritive sweetener → +4 beverage penalty
  ingredient_score: number; // 0..100 NOVA-weighted average
}

export interface BnsPoints {
  energy_points: number;
  sugar_points: number;
  sat_fat_points: number;
  salt_points: number;
  protein_points: number;
  fiber_points: number;
  fvl_points: number;
}

export interface BnsResult extends BnsPoints {
  track: Track;
  preparation: Preparation;
  negative_total: number;
  positive_total: number;
  raw_score: number;
  grade: Grade;
  nutrition_score: number; // 1..10
  ingredient_score_10: number; // 0..10
  final_score: number; // 1..10, one decimal
  sweetener_penalty_applied: boolean; // +4 beverage non-nutritive-sweetener penalty
}

// ── helpers ────────────────────────────────────────────────────────────────
const round1 = (n: number) => Math.round(n * 10) / 10;
// Count how many ascending thresholds `v` strictly exceeds (Nutri-Score ">" bands).
const stepsAbove = (v: number, thresholds: number[]) =>
  thresholds.reduce((c, t) => c + (v > t ? 1 : 0), 0);
// First band whose upper bound `v` is ≤ ("≤" ascending bands); else max.
const bandLeq = (v: number, thresholds: number[]) => {
  for (let i = 0; i < thresholds.length; i++) if (v <= thresholds[i]) return i;
  return thresholds.length;
};

// Salt(g) = Sodium(mg) × 2.5 ÷ 1000.
export const saltGrams = (sodium_mg: number) => (sodium_mg * 2.5) / 1000;
export const kJ = (kcal: number) => kcal * 4.184;

// Solid Food thresholds (per-100g).
const SOLID_ENERGY = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]; // 0..10
const SOLID_SATFAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 0..10
const SOLID_SUGAR = [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51]; // 0..15
const SOLID_SALT = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0]; // 0..20
const SOLID_PROTEIN = [2.4, 4.8, 7.2, 9.6, 12, 14, 17]; // 0..7
const SOLID_FIBER = [3.0, 4.1, 5.2, 6.3, 7.4]; // 0..5

// Beverage thresholds (per-100ml).
const BEV_ENERGY_LEQ = [30, 90, 150, 210, 240, 270, 300, 330, 360, 390]; // ≤ bands, else 10
const BEV_SUGAR_LEQ = [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11]; // ≤ bands, else 10
const BEV_SATFAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BEV_SALT = SOLID_SALT; // same 0.2-step scale, cap 20
const BEV_PROTEIN = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0]; // 0..7
const BEV_FIBER = [3, 4.1, 5.2, 6.3, 7.4]; // 0..5

function fvlPointsSolid(pct: number): number {
  if (pct >= 80) return 5;
  if (pct > 60) return 2;
  if (pct > 40) return 1;
  return 0;
}
function fvlPointsBeverage(pct: number): number {
  if (pct >= 80) return 6;
  if (pct > 60) return 4;
  if (pct > 40) return 2;
  return 0;
}

function gradeSolid(raw: number): Grade {
  if (raw <= -1) return "A";
  if (raw <= 2) return "B";
  if (raw <= 10) return "C";
  if (raw <= 18) return "D";
  return "E";
}
function gradeBeverage(raw: number): Grade {
  if (raw <= 2) return "B";
  if (raw <= 6) return "C";
  if (raw <= 9) return "D";
  return "E";
}

const GRADE_TO_SCORE: Record<Grade, number> = { A: 9.5, B: 7.5, C: 5.5, D: 3.5, E: 1.5 };

export function scoreBaseNutrition(input: BnsInput): BnsResult {
  const solid = input.track === "Solid Food";
  const energy_kJ = kJ(input.energy_kcal);
  const salt_g = saltGrams(input.sodium_mg);

  // Sugar factor: beverage Blended exempts intrinsic sugar (added only); else all.
  const sugarForScore =
    input.track === "Beverage" && input.preparation === "Blended"
      ? input.added_sugar_g
      : input.total_sugar_g;

  let points: BnsPoints;
  if (solid) {
    points = {
      energy_points: stepsAbove(energy_kJ, SOLID_ENERGY),
      sat_fat_points: stepsAbove(input.sat_fat_g, SOLID_SATFAT),
      sugar_points: stepsAbove(sugarForScore, SOLID_SUGAR),
      salt_points: stepsAbove(salt_g, SOLID_SALT),
      protein_points: stepsAbove(input.protein_g, SOLID_PROTEIN),
      fiber_points: stepsAbove(input.fiber_g, SOLID_FIBER),
      fvl_points: fvlPointsSolid(input.fvl_pct),
    };
  } else {
    points = {
      energy_points: bandLeq(energy_kJ, BEV_ENERGY_LEQ),
      sugar_points: bandLeq(sugarForScore, BEV_SUGAR_LEQ),
      sat_fat_points: stepsAbove(input.sat_fat_g, BEV_SATFAT),
      salt_points: stepsAbove(salt_g, BEV_SALT),
      protein_points: stepsAbove(input.protein_g, BEV_PROTEIN),
      fiber_points: stepsAbove(input.fiber_g, BEV_FIBER),
      fvl_points: fvlPointsBeverage(input.fvl_pct),
    };
  }

  let negative_total =
    points.energy_points + points.sugar_points + points.sat_fat_points + points.salt_points;
  const sweetener_penalty_applied = !solid && !!input.sweetener_present;
  if (sweetener_penalty_applied) negative_total += 4; // flat sweetener penalty
  const positive_total = points.protein_points + points.fiber_points + points.fvl_points;

  // Combining rule.
  let raw_score: number;
  if (solid) {
    raw_score =
      negative_total < 11
        ? negative_total - positive_total
        : negative_total - points.fiber_points - points.fvl_points; // protein excluded
  } else {
    raw_score = negative_total - positive_total; // beverages always subtract all positives
  }

  const grade = solid ? gradeSolid(raw_score) : gradeBeverage(raw_score);
  const nutrition_score = GRADE_TO_SCORE[grade];
  const ingredient_score_10 = input.ingredient_score / 10;
  const final_score = round1(0.7 * nutrition_score + 0.3 * ingredient_score_10);

  return {
    ...points,
    track: input.track,
    preparation: input.preparation,
    negative_total,
    positive_total,
    raw_score,
    grade,
    nutrition_score,
    ingredient_score_10,
    final_score,
    sweetener_penalty_applied,
  };
}
