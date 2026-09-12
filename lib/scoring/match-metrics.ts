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
export interface Maxes {
  sugar: number;
  salt: number;
  satFat: number;
  energy: number;
  fiber: number;
  protein: number;
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
  waterContentPercent: number;
  probiotic: boolean;
  vitaminCDV: number;
  sodiumMg: number;
  potassiumMg: number;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Relevance-weighted BioSubtotal (0–100). */
function bioSubtotal(bio: BioScores, weights: Record<string, number>): number {
  let num = 0;
  let den = 0;
  for (const [abbr, w] of Object.entries(weights)) {
    num += (bio[abbr] ?? 0) * w;
    den += w;
  }
  return den > 0 ? num / den : 0;
}

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
  Anemia: (c) =>
    avg([
      bioSubtotal(c.bio, { BrainCognitive: 50 }) / 100,
      c.ironRich ? 1 : 0,
    ]),
};

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

const withBonus =
  (weights: Record<string, number>, key: BonusKey) => (c: MatchContext) =>
    Math.min(1, bioSubtotal(c.bio, weights) / 100 + bonusFor(key, bonusContext(c)));

const bioOnly = (weights: Record<string, number>) => (c: MatchContext) =>
  bioSubtotal(c.bio, weights) / 100;

export const GOAL_CREDITS: Record<string, (c: MatchContext) => number> = {
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

  "Balance my hormones": bioOnly({ Hormonal: 95, Mood: 65, StressResilience: 60 }),
  "Sharpen my focus": bioOnly({ BrainCognitive: 95, Mood: 60, StressResilience: 55, SleepRelaxation: 50 }),
  "Sleep better": bioOnly({ SleepRelaxation: 95, StressResilience: 65, Mood: 55 }),
  "Reduce stress": bioOnly({ StressResilience: 95, Mood: 65, SleepRelaxation: 55 }),
  "Improve my mood": bioOnly({ Mood: 95, StressResilience: 65, SleepRelaxation: 50 }),

};

export const CONDITION_KEY_TO_PRD: Record<string, string> = {
  diabetes: "Diabetes",
  "heart-disease": "Heart disease",
  "high-blood-pressure": "High blood pressure",
  "high-cholesterol": "High cholesterol",
  pcos: "PCOS",
  menopause: "Menopause",
  "digestive-sensitivities": "Digestive Sensitivities",
  "kidney-disease": "Kidney disease",
  "liver-disease": "Liver disease",
  osteoporosis: "Osteoporosis",
  arthritis: "Arthritis",
  anemia: "Anemia",
};

export const GOAL_KEY_TO_PRD: Record<string, string> = {
  energy: "Have more energy",
  fitness: "Improve my fitness",
  "weight-loss": "Lose weight",
  "gut-health": "Improve my gut health",
  hydration: "Drink more water",
  "skin-hair": "Improve my skin & hair",
  immunity: "Boost my immunity",
  detox: "Support my body's detox",
  hormones: "Balance my hormones",
  focus: "Sharpen my focus",
  sleep: "Sleep better",
  stress: "Reduce stress",
  mood: "Improve my mood",
};



