// Recipe Match Score credit formulas (PRD: Recipe Match Score §3–§5). Each
// condition/goal returns a credit in [0,1]; the Match Score is their average ×100.
// All bioactivity terms are /100; nutrient point terms use (1 − points/max) when a
// LOW point value is good, or points/max directly when a HIGH value is good.

import type { BioScores } from "./bioactivity-map";

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
export const CONDITION_CREDITS: Record<string, (c: MatchContext) => number> = {
  Diabetes: (c) => avg([c.bio.BloodSugar / 100, 1 - c.points.sugar / c.maxes.sugar]),
  "Heart disease": (c) =>
    avg([c.bio.Heart / 100, 1 - c.points.salt / c.maxes.salt, 1 - c.points.satFat / c.maxes.satFat]),
  "High blood pressure": (c) => avg([c.bio.Heart / 100, 1 - c.points.salt / c.maxes.salt]),
  "High cholesterol": (c) => avg([c.bio.CholLipid / 100, 1 - c.points.satFat / c.maxes.satFat]),
  PCOS: (c) => avg([c.bio.Hormonal / 100, 1 - c.points.sugar / c.maxes.sugar]),
  "Kidney disease": (c) => avg([c.bio.Kidney / 100, 1 - c.points.salt / c.maxes.salt]),
  "Liver disease": (c) =>
    avg([c.bio.Liver / 100, 1 - c.points.sugar / c.maxes.sugar, 1 - c.points.satFat / c.maxes.satFat]),
  Menopause: (c) => avg([c.bio.Hormonal / 100, c.bio.Temperature / 100, c.bio.BoneJoint / 100]),
  "Digestive Sensitivities": (c) => avg([c.bio.Gut / 100, c.bio.Inflammation / 100]),
  Osteoporosis: (c) => c.bio.BoneJoint / 100,
  Arthritis: (c) => avg([c.bio.Inflammation / 100, c.bio.PainComfort / 100]),
  Anemia: (c) => (c.ironRich ? 1 : 0),
};

// ── Health Goals (§5) ────────────────────────────────────────────────────────
export const GOAL_CREDITS: Record<string, (c: MatchContext) => number> = {
  "Have more energy": (c) =>
    avg([
      bioSubtotal(c.bio, { WeightMetabolic: 90, CellWellness: 85, BloodSugar: 75, BrainCognitive: 55, Antioxidant: 50 }) / 100,
      c.points.protein / c.maxes.protein,
      c.points.energy / c.maxes.energy,
    ]),
  "Balance my hormones": (c) =>
    bioSubtotal(c.bio, { Hormonal: 95, Mood: 65, StressResilience: 60 }) / 100,
  "Get more hydration": (c) =>
    avg([bioSubtotal(c.bio, { Kidney: 95, Temperature: 60 }) / 100, c.waterContentPercent]),
  "Improve my fitness": (c) =>
    avg([
      bioSubtotal(c.bio, { WeightMetabolic: 85, Heart: 75, BoneJoint: 60, PainComfort: 50 }) / 100,
      c.points.protein / c.maxes.protein,
      c.points.energy / c.maxes.energy,
    ]),
  "Sharpen my focus": (c) =>
    bioSubtotal(c.bio, { BrainCognitive: 95, Mood: 60, StressResilience: 55, SleepRelaxation: 50 }) / 100,
  "Improve my skin & hair": (c) =>
    bioSubtotal(c.bio, { SkinHealth: 95, HealthyAging: 80, Antioxidant: 70 }) / 100,
  "Sleep better": (c) =>
    bioSubtotal(c.bio, { SleepRelaxation: 95, StressResilience: 65, Mood: 55 }) / 100,
  "Support my body's detox": (c) =>
    bioSubtotal(c.bio, { Liver: 95, Kidney: 65, Antioxidant: 55 }) / 100,
  "Improve my gut health": (c) =>
    avg([bioSubtotal(c.bio, { Gut: 95, Microbiome: 90 }) / 100, c.points.fiber / c.maxes.fiber]),
  "Boost my immunity": (c) =>
    bioSubtotal(c.bio, { Immune: 95, NaturalDefense: 90, Inflammation: 55, Antioxidant: 50 }) / 100,
  "Lose weight": (c) =>
    avg([
      bioSubtotal(c.bio, { WeightMetabolic: 95, BloodSugar: 70 }) / 100,
      1 - c.points.energy / c.maxes.energy,
      c.points.fiber / c.maxes.fiber,
    ]),
  "Reduce stress": (c) =>
    bioSubtotal(c.bio, { StressResilience: 95, Mood: 65, SleepRelaxation: 55, Gut: 30, Inflammation: 25, BrainCognitive: 25, Hormonal: 20 }) / 100,
  "Improve my mood": (c) =>
    bioSubtotal(c.bio, { Mood: 95, StressResilience: 65, Gut: 35, SleepRelaxation: 30, BrainCognitive: 30, Hormonal: 25, Microbiome: 20 }) / 100,
};

// ── App health-profile key → PRD formula name ───────────────────────────────
// Keys with no PRD formula (thyroid-condition, celiac-disease, and the
// diabetes/menopause/heart *goal* slugs) are intentionally absent → they
// contribute no credit and are excluded from the average.
export const CONDITION_KEY_TO_PRD: Record<string, string> = {
  "type-1-diabetes": "Diabetes",
  "type-2-diabetes": "Diabetes",
  prediabetes: "Diabetes",
  "heart-disease": "Heart disease",
  "high-blood-pressure": "High blood pressure",
  "high-cholesterol": "High cholesterol",
  pcos: "PCOS",
  "kidney-disease": "Kidney disease",
  "liver-disease": "Liver disease",
  menopause: "Menopause",
  perimenopause: "Menopause",
  ibs: "Digestive Sensitivities",
  ibd: "Digestive Sensitivities",
  gerd: "Digestive Sensitivities",
  gout: "Arthritis",
  osteoporosis: "Osteoporosis",
  anemia: "Anemia",
};
export const GOAL_KEY_TO_PRD: Record<string, string> = {
  energy: "Have more energy",
  hormones: "Balance my hormones",
  hydration: "Get more hydration",
  fitness: "Improve my fitness",
  focus: "Sharpen my focus",
  beauty: "Improve my skin & hair",
  sleep: "Sleep better",
  detox: "Support my body's detox",
  "gut-health": "Improve my gut health",
  immunity: "Boost my immunity",
  "weight-loss": "Lose weight",
  stress: "Reduce stress",
  mood: "Improve my mood",
};
