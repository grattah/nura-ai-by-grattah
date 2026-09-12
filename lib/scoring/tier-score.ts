import { matchRowsForRecipe, type IngredientFacts } from "./tier-match";

export type Tier = "primary" | "secondary" | "tertiary";

export const TIER_POINTS: Record<Tier, number> = {
  primary: 100,
  secondary: 20,
  tertiary: 10,
};

export type PenaltyType = "flat" | "multiplier";

export const FLAT_PENALTY = 2;

export interface TierEntry {
  ingredient: string;
  tier: Tier;
}

export interface PenaltyEntry {
  ingredient: string;
  type: PenaltyType;
}

export interface CalibrationTable {
  key: string;
  label: string;
  entries: TierEntry[];
  penalties: PenaltyEntry[];
}

/** Sum of every tier point in the table (PRD §4 Step 2). */
export function maxPossible(table: CalibrationTable): number {
  return table.entries.reduce((sum, e) => sum + TIER_POINTS[e.tier], 0);
}

export interface TierScoreInput {
  table: CalibrationTable;
  present: string[];
  penaltiesPresent?: string[];
  penaltyFactor?: number;
}

export interface TierScore {
  rawSubtotal: number;
  maxPossible: number;
  score1to10: number;
  finalScore: number;
  credit: number;
  percent: number;
  penaltiesApplied: string[];
}

const norm = (s: string) => s.trim().toLowerCase();

/** PRD §4 steps 1–5 against matched row labels. */
export function scoreTable({
  table,
  present,
  penaltiesPresent = [],
  penaltyFactor = 1,
}: TierScoreInput): TierScore {
  const presentSet = new Set(present.map(norm));

  const rawSubtotal = table.entries.reduce(
    (sum, e) => (presentSet.has(norm(e.ingredient)) ? sum + TIER_POINTS[e.tier] : sum),
    0,
  );

  const max = maxPossible(table);
  const score1to10 = max > 0 ? 1 + (rawSubtotal / max) * 9 : 1;

  const penaltySet = new Set(penaltiesPresent.map(norm));
  const applied = table.penalties.filter((p) => penaltySet.has(norm(p.ingredient)));

  let finalScore = score1to10;
  const multiplier = applied.find((p) => p.type === "multiplier");
  if (multiplier) {
    finalScore = score1to10 * penaltyFactor;
  }
  const flatCount = applied.filter((p) => p.type === "flat").length;
  if (flatCount > 0) {
    finalScore -= FLAT_PENALTY * flatCount;
  }
  finalScore = Math.max(1, finalScore);

  const credit = (finalScore - 1) / 9;

  return {
    rawSubtotal,
    maxPossible: max,
    score1to10,
    finalScore,
    credit,
    percent: credit * 100,
    penaltiesApplied: applied.map((p) => p.ingredient),
  };
}

export const DISPLAY_FLOOR_PERCENT = 40;
export const STRONG_SUPPORT_PERCENT = 60;

export type SupportStrength = "strong" | "moderate" | "none";

export function supportStrength(percent: number): SupportStrength {
  if (percent >= STRONG_SUPPORT_PERCENT) return "strong";
  if (percent >= DISPLAY_FLOOR_PERCENT) return "moderate";
  return "none";
}

export function supportLabel(percent: number): string | null {
  const s = supportStrength(percent);
  if (s === "strong") return "Strong support";
  if (s === "moderate") return "Moderate support";
  return null;
}

export interface MatchSelection {
  key: string;
  label: string;
  kind: "condition" | "goal";
  score: TierScore;
}

export interface CombinedMatch {
  highest: MatchSelection | null;
  averagePercent: number | null;
  breakdown: MatchSelection[];
}

/** Combines per-selection credits into highest, breakdown and average. */
export function combineMatch(selections: MatchSelection[]): CombinedMatch {
  if (selections.length === 0) {
    return { highest: null, averagePercent: null, breakdown: [] };
  }

  const breakdown = [...selections].sort((a, b) => {
    if (b.score.credit !== a.score.credit) return b.score.credit - a.score.credit;
    if (a.kind !== b.kind) return a.kind === "condition" ? -1 : 1;
    return 0;
  });

  const total = selections.reduce((sum, s) => sum + s.score.credit, 0);

  return {
    highest: breakdown[0],
    averagePercent: (total / selections.length) * 100,
    breakdown,
  };
}

/** Scores ingredients against a table; shared by the app and the recompute script. */
export function scoreFromRaw(
  table: CalibrationTable,
  ingredients: IngredientFacts[],
  penaltiesPresent: string[],
  penaltyFactor?: number,
): TierScore {
  const max = table.entries.reduce((s, e) => s + TIER_POINTS[e.tier], 0);

  const matchedRows = matchRowsForRecipe(ingredients, table.entries);
  let subtotal = 0;
  for (const row of matchedRows.values()) subtotal += TIER_POINTS[row.tier];

  const score1to10 = max > 0 ? 1 + (subtotal / max) * 9 : 1;

  const penaltySet = new Set(penaltiesPresent.map((p) => p.trim().toLowerCase()));
  const applied = table.penalties.filter((p) =>
    penaltySet.has(p.ingredient.trim().toLowerCase()),
  );

  let finalScore = score1to10;
  if (applied.some((p) => p.type === "multiplier")) {
    finalScore = score1to10 * (penaltyFactor ?? 1);
  }
  const flat = applied.filter((p) => p.type === "flat").length;
  if (flat > 0) finalScore -= FLAT_PENALTY * flat;
  finalScore = Math.max(1, finalScore);

  const credit = (finalScore - 1) / 9;
  return {
    rawSubtotal: subtotal,
    maxPossible: max,
    score1to10,
    finalScore,
    credit,
    percent: credit * 100,
    penaltiesApplied: applied.map((p) => p.ingredient),
  };
}
