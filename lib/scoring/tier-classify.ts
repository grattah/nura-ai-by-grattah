import type { CalibrationTable, Tier } from "./tier-score";
import {
  CATEGORY_TABLES,
  CONDITION_TABLES,
  GOAL_TABLES,
} from "./tier-tables";

export type TierAssignment = Tier | null;

export const TIER_VALUES = ["primary", "secondary", "tertiary", "not_tiered"] as const;
export type TierValue = (typeof TIER_VALUES)[number];

export const toAssignment = (v: string): TierAssignment =>
  v === "not_tiered" ? null : (v as Tier);

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

export interface Outcome {
  label: string;
  kinds: ("category" | "condition" | "goal")[];
}

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

export function penaltiesByOutcome(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const t of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
    if (!out.has(t.label)) out.set(t.label, t.penalties.map((p) => p.ingredient));
  }
  return out;
}
