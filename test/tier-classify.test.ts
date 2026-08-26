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

// ── The pipeline is authoritative for RawSubtotal ───────────────────────────
//
// §6 calls the tables "starting calibration examples, not exhaustive", so a
// table row seeds the outcome — it does not override a classified tier. The
// live score therefore comes entirely from ingredient_tiers.
//
// This is the decision that makes a classified tier able to disagree with a
// printed table row (beetroot classifies `secondary` for Heart Health while
// §8's worked example prints Primary), so it is pinned rather than left to
// be inferred from the code.
describe("scoring source of truth", () => {
  it("builds RawSubtotal from the tier cache, never from table tiers", async () => {
    const src = (await import("node:fs")).readFileSync(
      "lib/scoring/tier-server.ts",
      "utf8",
    );
    // The subtotal is summed from ingredient_tiers rows...
    expect(src).toContain('.from("ingredient_tiers" as never)');
    expect(src).toContain("TIER_POINTS[row.tier]");
    // ...and the table is consulted only for the denominator and penalties.
    expect(src).toContain("table.entries.reduce");
    expect(src).toContain("table.penalties.filter");
  });

  it("still takes MaxPossible from the table, keeping the denominator fixed", async () => {
    const { CATEGORY_TABLE_BY_KEY } = await import("@/lib/scoring/tier-tables");
    const { maxPossible } = await import("@/lib/scoring/tier-score");
    // A cache-derived denominator would drift as unrelated ingredients were
    // classified, moving every recipe's score with no recipe change.
    expect(maxPossible(CATEGORY_TABLE_BY_KEY.get("heart-health")!)).toBe(240);
  });
});
