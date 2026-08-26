// Ingredient classification — Category Score PRD §7.1 / Match Score PRD §7.1.
//
// v7 changed this materially: classification now runs on the model's own
// training knowledge, with NO live web search and no citation. Both PRDs call
// that out as a deliberate cost tradeoff — cheaper at scale, at the price of
// losing an external audit trail per assignment. It is what makes tiering the
// whole library affordable (roughly $3-20 rather than tens of thousands).

import type { CalibrationTable, Tier } from "./tier-score";
import {
  CATEGORY_TABLES,
  CONDITION_TABLES,
  GOAL_TABLES,
} from "./tier-tables";

/** The four possible answers. `null` is the PRD's "Not tiered". */
export type TierAssignment = Tier | null;

export const TIER_VALUES = ["primary", "secondary", "tertiary", "not_tiered"] as const;
export type TierValue = (typeof TIER_VALUES)[number];

export const toAssignment = (v: string): TierAssignment =>
  v === "not_tiered" ? null : (v as Tier);

/**
 * §7.1, reproduced as written. The instruction not to fabricate a citation is
 * load-bearing: without a search tool the model cannot verify one, and an
 * invented study reference in a health context is worse than no reference.
 */
export const CLASSIFY_SYSTEM = `You are classifying an ingredient's evidence strength for a specific health outcome (a condition, goal, or category), based on your own training knowledge.

Based on what you know from clinical and nutrition research, assign ONE tier:
- Primary: strong, direct evidence — typically human RCTs, with a meaningful effect size specific to this outcome
- Secondary: real but weaker evidence — smaller trials, less consistent results, or evidence for a related-but-not-identical outcome
- Tertiary: traditional/folk use, animal studies, or in-vitro research only
- Not tiered: no meaningful evidence you're aware of

Base this on your general knowledge of nutrition and clinical research — do not fabricate a specific study or citation.

Output: tier assignment only.`;

export const classifyPrompt = (ingredient: string, outcome: string) =>
  `INGREDIENT: ${ingredient}\nOUTCOME: ${outcome}`;

// ── The outcome registry ────────────────────────────────────────────────────

export interface Outcome {
  /** The PRD label — the identity used in the cache and in the prompt. */
  label: string;
  kinds: ("category" | "condition" | "goal")[];
}

/**
 * Every distinct outcome across both PRDs, keyed by label.
 *
 * Deduplicated on purpose: "Menopause" is both a category and a condition with
 * identical tables, so classifying it twice would double the cost of that
 * outcome and risk the two copies disagreeing.
 */
export function allOutcomes(): Outcome[] {
  const byLabel = new Map<string, Outcome>();

  const add = (tables: CalibrationTable[], kind: Outcome["kinds"][number]) => {
    for (const t of tables) {
      const existing = byLabel.get(t.label);
      if (existing) {
        if (!existing.kinds.includes(kind)) existing.kinds.push(kind);
      } else {
        byLabel.set(t.label, { label: t.label, kinds: [kind] });
      }
    }
  };

  add(CATEGORY_TABLES, "category");
  add(CONDITION_TABLES, "condition");
  add(GOAL_TABLES, "goal");

  return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Penalty rows an ingredient can trigger, by outcome label.
 *
 * Penalties are NOT tiered — they are a separate yes/no ("is this penalty
 * ingredient present"), so they never enter the classification pipeline and
 * never contribute to MaxPossible.
 */
export function penaltiesByOutcome(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const t of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
    if (!out.has(t.label)) out.set(t.label, t.penalties.map((p) => p.ingredient));
  }
  return out;
}
