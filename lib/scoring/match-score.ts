import { bioFromSlugScores } from "./bioactivity-map";
import { CONDITIONS, GOALS, labelFor } from "@/lib/health-profile/options";
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
  bioBySlug: Record<string, number>;
  points: NutrientPoints;
  track: string;
  ironRich: boolean;
  waterContentPercent: number;
  probiotic?: boolean;
  vitaminCDV?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  conditions: string[];
  goals: string[];
}

export interface MatchCredit {
  key: string;
  kind: "condition" | "goal";
  prd: string;
  label: string;
  credit: number;
  percent: number;
}

export interface MatchScoreResult {
  highest: MatchCredit | null;
  breakdown: MatchCredit[];
  average: number | null;
  creditCount: number;
}

function labelForSelection(
  key: string,
  kind: "condition" | "goal",
  prd: string,
): string {
  const options = kind === "condition" ? CONDITIONS : GOALS;
  const label = labelFor(options, key);
  return label === key ? prd : label;
}

export function computeMatchScore(input: MatchScoreInput): MatchScoreResult {
  const ctx: MatchContext = {
    bio: bioFromSlugScores(input.bioBySlug),
    points: input.points,
    maxes: maxesForTrack(input.track),
    ironRich: input.ironRich,
    waterContentPercent: input.waterContentPercent,
    probiotic: input.probiotic ?? false,
    vitaminCDV: input.vitaminCDV ?? 0,
    sodiumMg: input.sodiumMg ?? 0,
    potassiumMg: input.potassiumMg ?? 0,
  };

  const credits: MatchCredit[] = [];

  const push = (
    key: string,
    kind: "condition" | "goal",
    prd: string,
    credit: number,
  ) => {
    credits.push({
      key,
      kind,
      prd,
      label: labelForSelection(key, kind, prd),
      credit,
      percent: credit * 100,
    });
  };

  for (const key of input.conditions ?? []) {
    const prd = CONDITION_KEY_TO_PRD[key];
    const fn = prd && CONDITION_CREDITS[prd];
    if (fn) push(key, "condition", prd, fn(ctx));
  }
  for (const key of input.goals ?? []) {
    const prd = GOAL_KEY_TO_PRD[key];
    const fn = prd && GOAL_CREDITS[prd];
    if (fn) push(key, "goal", prd, fn(ctx));
  }

  if (credits.length === 0) {
    return { highest: null, breakdown: [], average: null, creditCount: 0 };
  }

  const breakdown = [...credits].sort((a, b) => b.credit - a.credit);
  const average =
    (credits.reduce((a, b) => a + b.credit, 0) / credits.length) * 100;

  return {
    highest: breakdown[0],
    breakdown,
    average,
    creditCount: credits.length,
  };
}
