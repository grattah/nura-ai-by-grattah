// Ingredient-tier scoring — the shared engine behind BOTH scores.
//
// Category Score PRD §4 and Recipe Match Score PRD §4 specify an identical
// five-step calculation; they diverge only at the last step (Category displays
// a percent directly, Match keeps a 0–1 credit so several selections can be
// combined). Implementing it once is what stops the two drifting apart.
//
// This replaces the v2 method entirely — BioSubtotal from weighted bioactivity
// scores plus 0.15 goal bonuses. Under v6/v3 a recipe scores for an outcome
// only if it contains named ingredients with evidence for that exact outcome,
// and "near zero" for a recipe containing none of them is explicitly correct
// behaviour rather than a bug.

export type Tier = "primary" | "secondary" | "tertiary";

/** PRD §2. The gap is deliberately wide so weak ingredients cannot stack up
 *  to outweigh a single strong one. */
export const TIER_POINTS: Record<Tier, number> = {
  primary: 100,
  secondary: 20,
  tertiary: 10,
};

export type PenaltyType = "flat" | "multiplier";

/** PRD §4 Step 4 — flat penalties subtract 2 points each from the 1–10 score. */
export const FLAT_PENALTY = 2;

export interface TierEntry {
  /** Calibration-table row label, e.g. "Flaxseed (lignans)". */
  ingredient: string;
  tier: Tier;
}

export interface PenaltyEntry {
  ingredient: string;
  type: PenaltyType;
}

export interface CalibrationTable {
  /** App key — a category slug, condition key, or goal key. */
  key: string;
  /** The PRD's own name for this table, used in citations and labels. */
  label: string;
  entries: TierEntry[];
  penalties: PenaltyEntry[];
}

/**
 * PRD §4 Step 2 — MaxPossible is the sum of EVERY tier point listed in the
 * table, present or not. It is therefore a property of the table alone, which
 * is what makes a score comparable across recipes.
 */
export function maxPossible(table: CalibrationTable): number {
  return table.entries.reduce((sum, e) => sum + TIER_POINTS[e.tier], 0);
}

export interface TierScoreInput {
  table: CalibrationTable;
  /** Row labels present in the recipe (PRD §3 — listed with a real quantity). */
  present: string[];
  /** Penalty row labels present. */
  penaltiesPresent?: string[];
  /**
   * PRD §4 Step 4 — multiplier tables only (Clear my skin). 1.0 down to ~0.5.
   * Ignored for flat-penalty tables.
   */
  penaltyFactor?: number;
}

export interface TierScore {
  rawSubtotal: number;
  maxPossible: number;
  /** Before penalties. */
  score1to10: number;
  /** After penalties, floored at 1. */
  finalScore: number;
  /** PRD §5 — (FinalScore − 1) ÷ 9, always 0–1. */
  credit: number;
  /** credit × 100. Category displays this directly; Match uses it per selection. */
  percent: number;
  /** Which penalty rows actually applied — used to explain a low score. */
  penaltiesApplied: string[];
}

/** Case/whitespace-insensitive membership, so callers need not pre-normalise. */
const norm = (s: string) => s.trim().toLowerCase();

/**
 * The PRD §4 calculation, steps 1–5.
 *
 * Floors the final score at 1 for BOTH penalty types. The PRD states the floor
 * only for flat penalties, but a multiplier can also drive the 1–10 score below
 * 1 (e.g. 1.5 × 0.5 = 0.75), which would yield a negative credit and a negative
 * percentage on screen. Flooring both keeps every credit inside 0–1.
 */
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
  // A table with no entries cannot be scored; treat it as the floor rather than
  // dividing by zero.
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

// ── Display rules ───────────────────────────────────────────────────────────

/** Category PRD §5 — below this a recipe is not shown under the category. */
export const DISPLAY_FLOOR_PERCENT = 40;
/** Category PRD §5 — at or above this the support is labelled "Strong". */
export const STRONG_SUPPORT_PERCENT = 60;

export type SupportStrength = "strong" | "moderate" | "none";

/**
 * Category PRD §5. The wording matters: these pages must say "support" or
 * "strength" and never "match" — "match" is reserved for the personalized
 * Recipe Match Score, and using it here would imply personalization that the
 * Category Score does not have.
 */
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

// ── Combining into a Recipe Match Score (Match PRD §8) ───────────────────────

export interface MatchSelection {
  key: string;
  label: string;
  kind: "condition" | "goal";
  score: TierScore;
}

export interface CombinedMatch {
  /** PRD §8 — the PRIMARY displayed number: the single highest credit. */
  highest: MatchSelection | null;
  /** PRD §8 — secondary only, and must be labelled as an average. */
  averagePercent: number | null;
  /** PRD §8 — full breakdown, sorted highest first, as percentages. */
  breakdown: MatchSelection[];
}

/**
 * Match PRD §8.
 *
 * Highest is the primary display, never the average — showing the average as
 * the headline understates a recipe that is excellent for one of the user's
 * selections and irrelevant to another, which is the common case.
 */
export function combineMatch(selections: MatchSelection[]): CombinedMatch {
  if (selections.length === 0) {
    return { highest: null, averagePercent: null, breakdown: [] };
  }

  // Stable sort: equal credits keep conditions ahead of goals, then input order.
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
