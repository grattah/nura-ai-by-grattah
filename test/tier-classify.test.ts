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

describe("PRD §7.1 — classification prompt", () => {
  it("defines all four tiers", () => {
    for (const t of ["Primary", "Secondary", "Tertiary", "Not tiered"]) {
      expect(CLASSIFY_SYSTEM).toContain(t);
    }
  });

  it("forbids fabricating a study or citation", () => {
    expect(CLASSIFY_SYSTEM).toMatch(/do not fabricate a specific study or citation/i);
  });

  it("asks for a tier and nothing else", () => {
    expect(CLASSIFY_SYSTEM).toMatch(/Output: tier assignment only/i);
  });

  it("does not ask for a live search — v7 dropped it", () => {
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

describe("outcome registry", () => {
  const outcomes = allOutcomes();

  it("covers every table in both PRDs", () => {
    const labels = new Set(outcomes.map((o) => o.label));
    for (const t of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
      expect(labels, `missing outcome "${t.label}"`).toContain(t.label);
    }
  });

  it("deduplicates a label shared between kinds", () => {
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
    const penalties = penaltiesByOutcome();
    for (const table of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
      const listed = penalties.get(table.label) ?? [];
      const scored = new Set(table.entries.map((e) => e.ingredient));
      for (const p of listed) expect(scored.has(p)).toBe(false);
    }
  });
});

describe("scoring source of truth", () => {
  const code = async () => {
    const src = (await import("node:fs")).readFileSync(
      "lib/scoring/tier-score.ts",
      "utf8",
    );
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  };

  it("builds RawSubtotal from matched table rows, not the tier cache", async () => {
    const src = await code();
    expect(src).toContain("matchRowsForRecipe(ingredients, table.entries)");
    expect(src).toContain("TIER_POINTS[row.tier]");
    expect(src).not.toContain("ingredient_tiers");
    expect(src).not.toMatch(/tiersByIngredient/);
  });

  it("needs no cap, because the subtotal is bounded by construction", async () => {
    const src = await code();
    expect(src).not.toMatch(/Math\.min\(\s*subtotal/);
  });

  it("still takes MaxPossible from the table, keeping the denominator fixed", async () => {
    const { CATEGORY_TABLE_BY_KEY } = await import("@/lib/scoring/tier-tables");
    const { maxPossible } = await import("@/lib/scoring/tier-score");
    expect(maxPossible(CATEGORY_TABLE_BY_KEY.get("heart-health")!)).toBe(240);
  });
});
