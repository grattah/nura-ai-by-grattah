import { describe, it, expect } from "vitest";
import {
  CLASSIFY_SYSTEM,
  classifyPrompt,
  allOutcomes,
  toAssignment,
  TIER_VALUES,
  penaltiesByOutcome,
} from "@/lib/scoring/tier-classify";
import {
  CATEGORY_TABLES,
  CONDITION_TABLES,
  GOAL_TABLES,
} from "@/lib/scoring/tier-tables";

// ── §7.1 the prompt is the whole quality control ────────────────────────────
//
// v7 removed the live web search, so nothing external checks the answer. The
// prompt's own guardrails are all that stand between a tier and an invention.
describe("PRD §7.1 — classification prompt", () => {
  it("defines all four tiers", () => {
    for (const t of ["Primary", "Secondary", "Tertiary", "Not tiered"]) {
      expect(CLASSIFY_SYSTEM).toContain(t);
    }
  });

  it("forbids fabricating a study or citation", () => {
    // Without a search tool the model cannot verify a reference, so an invented
    // one is strictly worse than none — especially in a health context.
    expect(CLASSIFY_SYSTEM).toMatch(/do not fabricate a specific study or citation/i);
  });

  it("asks for a tier and nothing else", () => {
    expect(CLASSIFY_SYSTEM).toMatch(/Output: tier assignment only/i);
  });

  it("does not ask for a live search — v7 dropped it", () => {
    // \bsearch\b, not /search/ — "research" legitimately appears in the PRD's
    // own wording ("clinical and nutrition research").
    expect(CLASSIFY_SYSTEM).not.toMatch(/\bsearch\b|pubmed|cochrane|clinicaltrials|examine\.com/i);
    expect(CLASSIFY_SYSTEM).toMatch(/your own training knowledge/i);
  });

  it("names both the ingredient and the outcome", () => {
    const p = classifyPrompt("turmeric", "Heart Health");
    expect(p).toContain("INGREDIENT: turmeric");
    expect(p).toContain("OUTCOME: Heart Health");
  });
});

describe("tier assignment parsing", () => {
  it("maps not_tiered to null, the PRD's fourth answer", () => {
    expect(toAssignment("not_tiered")).toBeNull();
  });

  it.each(["primary", "secondary", "tertiary"] as const)("keeps %s", (t) => {
    expect(toAssignment(t)).toBe(t);
  });

  it("offers exactly the four documented values to the model", () => {
    expect([...TIER_VALUES]).toEqual([
      "primary",
      "secondary",
      "tertiary",
      "not_tiered",
    ]);
  });
});

// ── The outcome registry drives the whole pipeline's cost ───────────────────
describe("outcome registry", () => {
  const outcomes = allOutcomes();

  it("covers every table in both PRDs", () => {
    const labels = new Set(outcomes.map((o) => o.label));
    for (const t of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
      expect(labels, `missing outcome "${t.label}"`).toContain(t.label);
    }
  });

  it("deduplicates a label shared between kinds", () => {
    // Menopause is both a category and a condition with identical tables.
    // Classifying it twice would double that outcome's cost and let the two
    // copies disagree.
    const menopause = outcomes.filter((o) => o.label === "Menopause");
    expect(menopause).toHaveLength(1);
    expect(menopause[0].kinds.sort()).toEqual(["category", "condition"]);
  });

  it("is smaller than the raw table count", () => {
    const rawCount =
      CATEGORY_TABLES.length + CONDITION_TABLES.length + GOAL_TABLES.length;
    expect(outcomes.length).toBeLessThan(rawCount);
  });
});

describe("penalties are not tiered", () => {
  it("never sends a penalty ingredient through classification", () => {
    // Penalties are a separate presence check (§4 Step 4); they carry no tier
    // points and must not inflate MaxPossible.
    const penalties = penaltiesByOutcome();
    for (const table of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
      const listed = penalties.get(table.label) ?? [];
      const scored = new Set(table.entries.map((e) => e.ingredient));
      for (const p of listed) expect(scored.has(p)).toBe(false);
    }
  });
});

// ── The TABLE is authoritative for RawSubtotal ──────────────────────────────
//
// REVERSED. This previously pinned the opposite rule — that ingredient_tiers
// was authoritative and a table row merely "seeded" the outcome — and that rule
// is what broke the score:
//
//   • The numerator drew on every ingredient in the recipe while MaxPossible
//     stayed the table's four rows, so RawSubtotal could exceed it and a cap
//     rounded the overflow to a clean 100%.
//   • Water classifies Secondary for most outcomes and is in nearly every
//     drink, so every recipe collected free points for every category.
//
// It also broke §8. The worked example prints beetroot as Primary for Heart
// Health, while the classifier calls it `secondary` — under the old rule the
// classified tier won and the PRD's own example could not be reproduced. Under
// this one the table wins and §8 returns its stated 41.7%.
//
// ingredient_tiers is now used to VALIDATE the row matchers, not to score.
describe("scoring source of truth", () => {
  // Comments are stripped before matching. The scorer's own comments explain
  // the reversal below and name both `ingredient_tiers` and the old
  // `Math.min(subtotal, max)` cap, so matching raw source would fail on the
  // explanation rather than on the code.
  const code = async () => {
    const src = (await import("node:fs")).readFileSync(
      "lib/scoring/tier-score.ts",
      "utf8",
    );
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  };

  it("builds RawSubtotal from matched table rows, not the tier cache", async () => {
    const src = await code();
    // Subtotal comes from rows the recipe actually satisfies...
    expect(src).toContain("matchRowsForRecipe(ingredients, table.entries)");
    expect(src).toContain("TIER_POINTS[row.tier]");
    // ...and nothing reads a classified tier while scoring.
    expect(src).not.toContain("ingredient_tiers");
    expect(src).not.toMatch(/tiersByIngredient/);
  });

  it("needs no cap, because the subtotal is bounded by construction", async () => {
    // matchRowsForRecipe keys by row label, so each row counts at most once and
    // the subtotal cannot exceed MaxPossible. `Math.min(subtotal, max)` is not a
    // safety net — it is what hid the overflow for as long as it did.
    const src = await code();
    expect(src).not.toMatch(/Math\.min\(\s*subtotal/);
  });

  it("still takes MaxPossible from the table, keeping the denominator fixed", async () => {
    const { CATEGORY_TABLE_BY_KEY } = await import("@/lib/scoring/tier-tables");
    const { maxPossible } = await import("@/lib/scoring/tier-score");
    // A cache-derived denominator would drift as unrelated ingredients were
    // classified, moving every recipe's score with no recipe change.
    expect(maxPossible(CATEGORY_TABLE_BY_KEY.get("heart-health")!)).toBe(240);
  });
});
