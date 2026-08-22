// Recipe Match Score credit formulas (PRD: Recipe Match Score §3–§5). Each
// condition/goal returns a credit in [0,1]; the Match Score is their average ×100.
// All bioactivity terms are /100; nutrient point terms use (1 − points/max) when a
// LOW point value is good, or points/max directly when a HIGH value is good.

import type { BioScores } from "./bioactivity-map";
import { bonusFor, type BonusContext, type BonusKey } from "./bonuses";

export interface NutrientPoints {
  sugar: number;
  salt: number;
  satFat: number;
  energy: number;
  fiber: number;
  protein: number;
}
// Reference constants (PRD §3). maxSugar depends on Track (15 Solid / 10 Beverage).
export interface Maxes {
  sugar: number;
  salt: number; // 20
  satFat: number; // 10
  energy: number; // 10
  fiber: number; // 5
  protein: number; // 7
}
export function maxesForTrack(track: string): Maxes {
  return {
    sugar: track === "Beverage" ? 10 : 15,
    salt: 20,
    satFat: 10,
    energy: 10,
    fiber: 5,
    protein: 7,
  };
}

export interface MatchContext {
  bio: BioScores;
  points: NutrientPoints;
  maxes: Maxes;
  ironRich: boolean;
  waterContentPercent: number; // 0..1
  probiotic: boolean;
  vitaminCDV: number; // % of Daily Value, per serving
  sodiumMg: number; // per serving
  potassiumMg: number; // per serving
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
// Relevance-weighted BioSubtotal (0..100) — PRD §5.
function bioSubtotal(bio: BioScores, weights: Record<string, number>): number {
  let num = 0;
  let den = 0;
  for (const [abbr, w] of Object.entries(weights)) {
    num += (bio[abbr] ?? 0) * w;
    den += w;
  }
  return den > 0 ? num / den : 0;
}

// ── Existing Conditions (§4) ─────────────────────────────────────────────────
// Every condition uses a relevance-weighted BioSubtotal (only bioactivities with
// relevance ≥ 50 qualify — the PRD's cutoff, so the weight maps below ARE the
// complete qualifying list). Nutrient terms use (1 − points/max) so a LOW point
// value (good) contributes a HIGH credit.
export const CONDITION_CREDITS: Record<string, (c: MatchContext) => number> = {
  Diabetes: (c) =>
    avg([
      bioSubtotal(c.bio, { BloodSugar: 95, WeightMetabolic: 65 }) / 100,
      1 - c.points.sugar / c.maxes.sugar,
    ]),
  "Heart disease": (c) =>
    avg([
      bioSubtotal(c.bio, { Heart: 95, CholLipid: 85, Inflammation: 50 }) / 100,
      1 - c.points.salt / c.maxes.salt,
      1 - c.points.satFat / c.maxes.satFat,
    ]),
  "High blood pressure": (c) =>
    avg([
      bioSubtotal(c.bio, { Heart: 95, Kidney: 60, CholLipid: 55, Inflammation: 50 }) / 100,
      1 - c.points.salt / c.maxes.salt,
    ]),
  "High cholesterol": (c) =>
    avg([
      bioSubtotal(c.bio, { CholLipid: 95, Heart: 70, WeightMetabolic: 50, Inflammation: 50 }) / 100,
      1 - c.points.satFat / c.maxes.satFat,
    ]),
  PCOS: (c) =>
    avg([
      bioSubtotal(c.bio, { Hormonal: 95, BloodSugar: 75, WeightMetabolic: 65, Inflammation: 55 }) / 100,
      1 - c.points.sugar / c.maxes.sugar,
    ]),
  Menopause: (c) =>
    bioSubtotal(c.bio, { Hormonal: 95, Temperature: 70, SleepRelaxation: 55, BoneJoint: 50, Mood: 50 }) / 100,
  "Digestive Sensitivities": (c) =>
    bioSubtotal(c.bio, { Gut: 95, Microbiome: 85, Inflammation: 55 }) / 100,
  "Kidney disease": (c) =>
    avg([
      bioSubtotal(c.bio, { Kidney: 95, Heart: 50 }) / 100,
      1 - c.points.salt / c.maxes.salt,
    ]),
  "Liver disease": (c) =>
    avg([
      bioSubtotal(c.bio, { Liver: 95, Antioxidant: 60, CholLipid: 55, Inflammation: 50 }) / 100,
      1 - c.points.sugar / c.maxes.sugar,
      1 - c.points.satFat / c.maxes.satFat,
    ]),
  Osteoporosis: (c) =>
    bioSubtotal(c.bio, { BoneJoint: 95, HealthyAging: 55 }) / 100,
  Arthritis: (c) =>
    bioSubtotal(c.bio, { Inflammation: 95, PainComfort: 80, BoneJoint: 65, Antioxidant: 50 }) / 100,
  // Not a bare flag: the iron-rich flag is averaged with a BrainCognitive subtotal.
  Anemia: (c) =>
    avg([
      bioSubtotal(c.bio, { BrainCognitive: 50 }) / 100,
      c.ironRich ? 1 : 0,
    ]),
};

// ── Health Goals (§5) ────────────────────────────────────────────────────────
// Unlike conditions, a goal's supporting nutrient/ingredient factor is added as a
// BONUS on top of BioSubtotal, never averaged into it (§5). Averaging capped a
// recipe that supports the goal strongly through one pathway just because it
// lacked another — §1: "A recipe strong in relevant bioactivity is never
// penalised for lacking one specific supporting nutrient if it supports the goal
// through another valid pathway."
export function bonusContext(c: MatchContext): BonusContext {
  return {
    points: c.points,
    maxes: c.maxes,
    ironRich: c.ironRich,
    probiotic: c.probiotic,
    vitaminCDV: c.vitaminCDV,
    waterContentPercent: c.waterContentPercent,
    sodiumMg: c.sodiumMg,
    potassiumMg: c.potassiumMg,
  };
}

/** §5: Credit = min(1, BioSubtotal÷100 + bonus). */
const withBonus =
  (weights: Record<string, number>, key: BonusKey) => (c: MatchContext) =>
    Math.min(1, bioSubtotal(c.bio, weights) / 100 + bonusFor(key, bonusContext(c)));

/** §5: Goals without a bonus term — Credit = BioSubtotal÷100. */
const bioOnly = (weights: Record<string, number>) => (c: MatchContext) =>
  bioSubtotal(c.bio, weights) / 100;

export const GOAL_CREDITS: Record<string, (c: MatchContext) => number> = {
  // §5.1 — with a bonus term.
  "Have more energy": withBonus(
    { WeightMetabolic: 90, CellWellness: 85, BloodSugar: 75, BrainCognitive: 55, Antioxidant: 50 },
    "energy",
  ),
  "Improve my fitness": withBonus(
    { WeightMetabolic: 85, Heart: 75, BoneJoint: 60, BloodSugar: 55, PainComfort: 50 },
    "fitness",
  ),
  "Lose weight": withBonus(
    { WeightMetabolic: 95, BloodSugar: 70 },
    "weight-loss",
  ),
  "Improve my gut health": withBonus(
    { Gut: 95, Microbiome: 90 },
    "gut-health",
  ),
  "Drink more water": withBonus({ Kidney: 95, Temperature: 60 }, "hydration"),
  "Improve my skin & hair": withBonus(
    { SkinHealth: 95, HealthyAging: 80, Antioxidant: 70, CellWellness: 55 },
    "beauty",
  ),
  "Boost my immunity": withBonus(
    { Immune: 95, NaturalDefense: 90, Inflammation: 55, Antioxidant: 50 },
    "immunity",
  ),
  "Support my body's detox": withBonus(
    { Liver: 95, Kidney: 65, Antioxidant: 55 },
    "detox",
  ),

  // §5.2 — bioactivity only.
  "Balance my hormones": bioOnly({ Hormonal: 95, Mood: 65, StressResilience: 60 }),
  "Sharpen my focus": bioOnly({ BrainCognitive: 95, Mood: 60, StressResilience: 55, SleepRelaxation: 50 }),
  "Sleep better": bioOnly({ SleepRelaxation: 95, StressResilience: 65, Mood: 55 }),
  "Reduce stress": bioOnly({ StressResilience: 95, Mood: 65, SleepRelaxation: 55 }),
  "Improve my mood": bioOnly({ Mood: 95, StressResilience: 65, SleepRelaxation: 50 }),
};

// ── App health-profile key → PRD formula name ───────────────────────────────
// EVERY live key in lib/health-profile/options.ts (CONDITIONS / GOALS) must have
// a row here: computeMatchScore silently skips unmapped keys, so a missing row
// doesn't error — it just drops that condition/goal from the average, or hides
// the Match Score entirely when nothing maps. test/match-score-coverage.test.ts
// enforces this; add a row here whenever an option is added or renamed.
//
// Rows marked "legacy" are keys the picker no longer offers but that older
// profiles still hold in health_profiles — keep them so those users keep scoring.
export const CONDITION_KEY_TO_PRD: Record<string, string> = {
  diabetes: "Diabetes",
  "type-1-diabetes": "Diabetes", // legacy
  "type-2-diabetes": "Diabetes", // legacy
  prediabetes: "Diabetes", // legacy
  "heart-disease": "Heart disease",
  "high-blood-pressure": "High blood pressure",
  "high-cholesterol": "High cholesterol",
  pcos: "PCOS",
  "kidney-disease": "Kidney disease",
  "liver-disease": "Liver disease",
  menopause: "Menopause",
  perimenopause: "Menopause", // legacy
  "digestive-sensitivities": "Digestive Sensitivities",
  ibs: "Digestive Sensitivities", // legacy
  ibd: "Digestive Sensitivities", // legacy
  gerd: "Digestive Sensitivities", // legacy
  arthritis: "Arthritis",
  // gout is DELIBERATELY absent (PRD §9: "Gout has no defined credit formula and
  // should not be included in the credit average if disclosed, until a metric is
  // defined for it"). It previously borrowed Arthritis, which scored users for a
  // formula that was never designed for their condition. computeMatchScore skips
  // unmapped keys, so a gout-only profile now correctly shows no Match Score.
  osteoporosis: "Osteoporosis",
  anemia: "Anemia",
};
/**
 * Goal key → PRD formula name.
 *
 * The AUG 21 picker offers 24 goals but only 13 formulas exist, so this map is
 * deliberately partial. computeMatchScore skips a key that isn't here, which is
 * the correct failure mode — inventing a formula for "UTI & yeast balance
 * support" would fabricate a health claim — but it is silent, so the goals with
 * no formula are listed in UNSCORED_GOALS below and pinned by a test.
 */
export const GOAL_KEY_TO_PRD: Record<string, string> = {
  // ── Direct matches ────────────────────────────────────────────────────────
  stress: "Reduce stress",
  mood: "Improve my mood",
  immunity: "Boost my immunity",
  focus: "Sharpen my focus",
  "gut-health": "Improve my gut health",
  sleep: "Sleep better",

  // ── Several picker goals share one formula ────────────────────────────────
  // match-score.ts de-duplicates by formula, so a user picking all three skin
  // goals is credited once rather than having skin counted three times.
  "skin-brighten": "Improve my skin & hair",
  "hair-growth": "Improve my skin & hair",
  "clear-skin": "Improve my skin & hair",

  // ── Renamed in the design, same underlying formula ────────────────────────
  "fat-metabolism": "Lose weight",
  "muscle-recovery": "Improve my fitness",
  "hydrate-skin": "Drink more water",
  testosterone: "Balance my hormones",

  // ── Legacy keys kept so existing saved profiles keep scoring ──────────────
  // Users who completed the questionnaire before AUG 21 hold these keys in
  // health_profiles. Dropping them would silently zero their Match Score.
  energy: "Have more energy",
  hormones: "Balance my hormones",
  hydration: "Drink more water",
  fitness: "Improve my fitness",
  "skin-hair": "Improve my skin & hair",
  beauty: "Improve my skin & hair",
  detox: "Support my body's detox",
  "weight-loss": "Lose weight",
};

/**
 * Goals the picker offers that have NO Match Score formula.
 *
 * Selecting one is not an error — it is recorded on the profile and used for
 * personalization elsewhere — but it contributes nothing to the Match Score.
 * Five of these (blood-sugar, iron-levels, joint-comfort, blood-pressure,
 * cholesterol) have a CONDITION formula with the same clinical meaning; wiring
 * them up needs a product decision, because a user who selects the goal AND
 * declares the condition would otherwise be counted twice.
 */
export const UNSCORED_GOALS = [
  "reduce-bloating",
  "blood-sugar",
  "uti-yeast",
  "iron-levels",
  "libido",
  "constipation",
  "puffiness",
  "joint-comfort",
  "blood-pressure",
  "cholesterol",
  "mucus-congestion",
] as const;
