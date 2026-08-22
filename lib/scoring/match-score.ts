// Recipe Match Score (PRD: Recipe Match Score). Deterministic, no LLM.
//
// Produces one credit (0..1) per disclosed condition and selected goal, then the
// three values the PRD's display spec (§7) needs:
//   • highest   — the single best credit + the label of what produced it (§7.1,
//                 the PRIMARY display: averaging penalises users for selecting
//                 more goals, so the headline must be the best match, not the mean)
//   • breakdown — every credit, sorted best-first (§7.2)
//   • average   — the mean (§7.3); MAY be shown, but never as the headline
//
// All callers (recipe detail page + the batch endpoint behind listings/search)
// go through this one function, which is what satisfies §7.4's requirement that
// a recipe never shows one percentage on a listing and a different one on detail.

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
  bioBySlug: Record<string, number>; // recipe_tags: slug → score (0..100)
  points: NutrientPoints; // recipe's stored BNS point fields
  track: string; // "Beverage" | "Solid Food" (sets maxSugar)
  ironRich: boolean;
  waterContentPercent: number; // 0..1
  // PRD v2 bonus inputs (§2.3), per serving. Default to 0/false so a recipe not
  // yet re-scored simply misses its bonuses rather than throwing.
  probiotic?: boolean;
  vitaminCDV?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  conditions: string[]; // app health-profile condition keys
  goals: string[]; // app health-profile goal keys
}

export interface MatchCredit {
  key: string; // app health-profile key, e.g. "diabetes"
  kind: "condition" | "goal";
  prd: string; // PRD formula name, e.g. "Diabetes"
  label: string; // display label the user actually picked, e.g. "Body detox"
  credit: number; // 0..1
  percent: number; // credit × 100 (unrounded — round at the display edge)
}

export interface MatchScoreResult {
  /** §7.1 primary display: best credit + its source. Null when nothing matched. */
  highest: MatchCredit | null;
  /** §7.2 every credit, sorted best-first. */
  breakdown: MatchCredit[];
  /** §7.3 mean of all credits as a percentage. Never the headline. */
  average: number | null;
  creditCount: number;
}

// Display label for a selection. Prefer what the picker shows (options.ts) over
// the PRD formula name — they differ for `detox` ("Body detox" vs "Support my
// body's detox"). Legacy keys no longer in the picker fall back to the PRD name.
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

  // Built conditions-first, each in the user's selection order — this ordering IS
  // the PRD's tie-break rule (condition beats goal; earlier selection beats later).
  const credits: MatchCredit[] = [];

  const seenFormulas = new Set<string>();
  const push = (
    key: string,
    kind: "condition" | "goal",
    prd: string,
    credit: number,
  ) => {
    const formulaId = `${kind}:${prd}`;
    if (seenFormulas.has(formulaId)) return;
    seenFormulas.add(formulaId);
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

  // Array.prototype.sort is stable, so equal credits keep the insertion order
  // above — meaning breakdown[0] already satisfies §7.1's tie-breaking and no
  // separate max pass is needed.
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
