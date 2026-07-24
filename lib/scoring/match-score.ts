// Recipe Match Score (PRD: Recipe Match Score). Deterministic, no LLM. Averages
// per-condition and per-goal credits (each 0..1) for the user's disclosed
// conditions + selected goals, expressed as a percentage. Replaces the old
// nutrient-point "personalized" re-weighting.

import { bioFromSlugScores } from "./bioactivity-map";
import {
  CONDITION_CREDITS,
  GOAL_CREDITS,
  CONDITION_KEY_TO_PRD,
  GOAL_KEY_TO_PRD,
  maxesForTrack,
  type MatchContext,
  type NutrientPoints,
} from "./match-metrics";

export interface MatchScoreInput {
  bioBySlug: Record<string, number>; // recipe_tags: slug → score (0..100)
  points: NutrientPoints; // recipe's stored BNS point fields
  track: string; // "Beverage" | "Solid Food" (sets maxSugar)
  ironRich: boolean;
  waterContentPercent: number; // 0..1
  conditions: string[]; // app health-profile condition keys
  goals: string[]; // app health-profile goal keys
}

export interface MatchScoreResult {
  score: number | null; // percentage 0..100, or null if nothing to average
  creditCount: number;
  breakdown: Array<{ key: string; kind: "condition" | "goal"; prd: string; credit: number }>;
}

export function computeMatchScore(input: MatchScoreInput): MatchScoreResult {
  const ctx: MatchContext = {
    bio: bioFromSlugScores(input.bioBySlug),
    points: input.points,
    maxes: maxesForTrack(input.track),
    ironRich: input.ironRich,
    waterContentPercent: input.waterContentPercent,
  };

  const breakdown: MatchScoreResult["breakdown"] = [];

  for (const key of input.conditions ?? []) {
    const prd = CONDITION_KEY_TO_PRD[key];
    const fn = prd && CONDITION_CREDITS[prd];
    if (fn) breakdown.push({ key, kind: "condition", prd, credit: fn(ctx) });
  }
  for (const key of input.goals ?? []) {
    const prd = GOAL_KEY_TO_PRD[key];
    const fn = prd && GOAL_CREDITS[prd];
    if (fn) breakdown.push({ key, kind: "goal", prd, credit: fn(ctx) });
  }

  if (breakdown.length === 0) return { score: null, creditCount: 0, breakdown };

  const sum = breakdown.reduce((a, b) => a + b.credit, 0);
  const score = (sum / breakdown.length) * 100;
  return { score, creditCount: breakdown.length, breakdown };
}
