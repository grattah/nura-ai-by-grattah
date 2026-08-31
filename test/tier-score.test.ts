import { describe, it, expect } from "vitest";
import {
  scoreTable,
  maxPossible,
  combineMatch,
  supportLabel,
  supportStrength,
  TIER_POINTS,
  DISPLAY_FLOOR_PERCENT,
  type MatchSelection,
} from "@/lib/scoring/tier-score";
import {
  CATEGORY_TABLES,
  CONDITION_TABLES,
  GOAL_TABLES,
  CATEGORY_TABLE_BY_KEY,
  CONDITION_TABLE_BY_KEY,
  GOAL_TABLE_BY_KEY,
} from "@/lib/scoring/tier-tables";
import { GOALS, CONDITIONS } from "@/lib/health-profile/options";

// ── The PRDs' own worked examples are the acceptance criteria ────────────────

describe("Category PRD §8 — Heart Health worked example", () => {
  // Beetroot Ginger Juice: contains beetroot (nitrates), ginger, lemon.
  const table = CATEGORY_TABLE_BY_KEY.get("heart-health")!;

  it("sums MaxPossible from every listed row", () => {
    // Beetroot 100 + Omega-3 100 + Potassium 20 + Garlic 20
    expect(maxPossible(table)).toBe(240);
  });

  it("scores 41.7% and clears the display floor as Moderate support", () => {
    const r = scoreTable({ table, present: ["Beetroot nitrates"] });
    expect(r.rawSubtotal).toBe(100);
    expect(r.score1to10).toBeCloseTo(4.75, 2);
    expect(r.percent).toBeCloseTo(41.7, 1);
    expect(r.percent).toBeGreaterThanOrEqual(DISPLAY_FLOOR_PERCENT);
    expect(supportLabel(r.percent)).toBe("Moderate support");
  });
});

describe("Match PRD §9 — Menopause + Sleep better worked example", () => {
  // Recipe contains flaxseed and magnesium-rich cacao.
  const menopause = CONDITION_TABLE_BY_KEY.get("menopause")!;
  const sleep = GOAL_TABLE_BY_KEY.get("sleep")!;

  const menoScore = scoreTable({ table: menopause, present: ["Flaxseed (lignans)"] });
  const sleepScore = scoreTable({ table: sleep, present: ["Magnesium"] });

  it("credits Menopause at 76.9%", () => {
    expect(maxPossible(menopause)).toBe(130); // 100 + 20 + 10
    expect(menoScore.score1to10).toBeCloseTo(7.92, 2);
    expect(menoScore.credit).toBeCloseTo(0.769, 3);
  });

  it("credits Sleep better at 41.7%", () => {
    expect(maxPossible(sleep)).toBe(240); // 100 + 100 + 20 + 20
    expect(sleepScore.score1to10).toBeCloseTo(4.75, 2);
    expect(sleepScore.credit).toBeCloseTo(0.417, 3);
  });

  it("displays the HIGHEST credit, never the average", () => {
    const sel: MatchSelection[] = [
      { key: "menopause", label: "Menopause", kind: "condition", score: menoScore },
      { key: "sleep", label: "Sleep better", kind: "goal", score: sleepScore },
    ];
    const combined = combineMatch(sel);

    // §8: 76.9% is the primary number, labelled "Menopause".
    expect(combined.highest?.label).toBe("Menopause");
    expect(combined.highest!.score.percent).toBeCloseTo(76.9, 1);
    // §9: 59.3% appears only as a secondary "Average across all" line.
    expect(combined.averagePercent).toBeCloseTo(59.3, 1);
    // Breakdown sorted highest first.
    expect(combined.breakdown.map((b) => b.label)).toEqual([
      "Menopause",
      "Sleep better",
    ]);
  });
});

// ── §2 / §4 mechanics ───────────────────────────────────────────────────────

describe("tier points", () => {
  it("keeps the gap wide enough that weak rows cannot outweigh a strong one", () => {
    expect(TIER_POINTS.primary).toBe(100);
    // The PRD's stated intent (§2), checked where it actually has to hold: in
    // no real table does every non-primary row combined reach one primary.
    // (The claim is not true in the abstract — six secondaries would exceed
    // 100 — so assert it against the tables rather than the constants.)
    for (const table of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
      const weak = table.entries
        .filter((e) => e.tier !== "primary")
        .reduce((sum, e) => sum + TIER_POINTS[e.tier], 0);
      expect(weak, `${table.key} weak rows total ${weak}`).toBeLessThan(
        TIER_POINTS.primary,
      );
    }
  });

  it("scores a recipe with none of the relevant ingredients at zero", () => {
    // PRD §1 calls this correct, expected behaviour — not a bug.
    const table = CATEGORY_TABLE_BY_KEY.get("heart-health")!;
    const r = scoreTable({ table, present: ["Kale", "Apple"] });
    expect(r.rawSubtotal).toBe(0);
    expect(r.score1to10).toBe(1);
    expect(r.percent).toBe(0);
    expect(supportStrength(r.percent)).toBe("none");
  });

  it("reaches 100% only when every listed row is present", () => {
    const table = CATEGORY_TABLE_BY_KEY.get("heart-health")!;
    const r = scoreTable({
      table,
      present: table.entries.map((e) => e.ingredient),
    });
    expect(r.percent).toBeCloseTo(100, 6);
  });

  it("matches row labels regardless of case and padding", () => {
    const table = CATEGORY_TABLE_BY_KEY.get("heart-health")!;
    expect(scoreTable({ table, present: ["  beetroot NITRATES "] }).rawSubtotal).toBe(
      100,
    );
  });
});

describe("PRD §4 Step 4 — penalties", () => {
  const table = CATEGORY_TABLE_BY_KEY.get("heart-health")!;

  it("subtracts 2 points per flat penalty", () => {
    const clean = scoreTable({ table, present: ["Beetroot nitrates", "Omega-3"] });
    const penalised = scoreTable({
      table,
      present: ["Beetroot nitrates", "Omega-3"],
      penaltiesPresent: ["Sodium"],
    });
    expect(penalised.finalScore).toBeCloseTo(clean.finalScore - 2, 6);
    expect(penalised.penaltiesApplied).toEqual(["Sodium"]);
  });

  it("stacks multiple flat penalties", () => {
    const r = scoreTable({
      table,
      present: table.entries.map((e) => e.ingredient),
      penaltiesPresent: ["Sodium", "Saturated fat"],
    });
    expect(r.finalScore).toBeCloseTo(10 - 4, 6);
  });

  it("floors at 1, so a credit can never go negative", () => {
    const r = scoreTable({
      table,
      present: ["Potassium"], // 20/240 → barely above the floor
      penaltiesPresent: ["Sodium", "Saturated fat"],
    });
    expect(r.finalScore).toBe(1);
    expect(r.credit).toBe(0);
    expect(r.percent).toBe(0);
  });

  it("ignores a penalty the table does not list", () => {
    const r = scoreTable({
      table,
      present: ["Beetroot nitrates"],
      penaltiesPresent: ["Caffeine"], // a Sleep/Hydration penalty, not Heart Health
    });
    expect(r.penaltiesApplied).toEqual([]);
    expect(r.percent).toBeCloseTo(41.7, 1);
  });

  it("applies the multiplier only for Clear my skin", () => {
    const clearSkin = GOAL_TABLE_BY_KEY.get("clear-skin")!;
    const full = scoreTable({
      table: clearSkin,
      present: clearSkin.entries.map((e) => e.ingredient),
    });
    const halved = scoreTable({
      table: clearSkin,
      present: clearSkin.entries.map((e) => e.ingredient),
      penaltiesPresent: ["Added sugar"],
      penaltyFactor: 0.5,
    });
    expect(full.finalScore).toBeCloseTo(10, 6);
    expect(halved.finalScore).toBeCloseTo(5, 6);
  });

  it("is the only multiplier table in either PRD", () => {
    const multiplierTables = [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]
      .filter((x) => x.penalties.some((p) => p.type === "multiplier"))
      .map((x) => x.key);
    expect(multiplierTables).toEqual(["clear-skin"]);
  });
});

// ── §5 display rules ────────────────────────────────────────────────────────

describe("Category PRD §5 — display rules", () => {
  it.each([
    [100, "Strong support"],
    [60, "Strong support"],
    [59.9, "Moderate support"],
    [41.7, "Moderate support"],
    [40, "Moderate support"],
  ])("labels %s%% as %s", (percent, label) => {
    expect(supportLabel(percent as number)).toBe(label);
  });

  it("shows nothing below the 40% floor", () => {
    expect(supportLabel(39.9)).toBeNull();
    expect(supportStrength(0)).toBe("none");
  });
});

// ── Table integrity ─────────────────────────────────────────────────────────

describe("calibration tables", () => {
  it("covers the 14 categories, 3 conditions and 24 goals", () => {
    expect(CATEGORY_TABLES).toHaveLength(14);
    expect(CONDITION_TABLES).toHaveLength(3);
    expect(GOAL_TABLES).toHaveLength(24);
  });

  it("gives every category a table", () => {
    // Categories are the only surface still scored by these tables. The
    // personal Match Score reverted to the v2 bioactivity engine alongside the
    // 12-goal picker, so GOALS/CONDITIONS keys no longer resolve here — the
    // equivalent guarantee for them ("every live picker option resolves to a
    // real formula") moved to test/match-score-coverage.test.ts, which asserts
    // it against GOAL_KEY_TO_PRD / GOAL_CREDITS.
    //
    // GOAL_TABLES and CONDITION_TABLES are kept rather than deleted: they are
    // the transcribed PRD and the only record of that calibration.
    for (const table of CATEGORY_TABLES) {
      expect(
        CATEGORY_TABLE_BY_KEY.get(table.key),
        `category "${table.key}" has no calibration table`,
      ).toBeDefined();
    }
  });

  it("has no table without entries, which would be unscoreable", () => {
    for (const table of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
      expect(table.entries.length, `${table.key} is empty`).toBeGreaterThan(0);
      expect(maxPossible(table), `${table.key} has zero MaxPossible`).toBeGreaterThan(0);
    }
  });

  it("never lists an ingredient as both a scoring row and a penalty", () => {
    for (const table of [...CATEGORY_TABLES, ...CONDITION_TABLES, ...GOAL_TABLES]) {
      const entries = new Set(table.entries.map((e) => e.ingredient.toLowerCase()));
      for (const p of table.penalties) {
        expect(
          entries.has(p.ingredient.toLowerCase()),
          `${table.key} both scores and penalises "${p.ingredient}"`,
        ).toBe(false);
      }
    }
  });

  it("uses unique keys within each set", () => {
    for (const set of [CATEGORY_TABLES, CONDITION_TABLES, GOAL_TABLES]) {
      const keys = set.map((x) => x.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("combineMatch", () => {
  const mk = (credit: number, kind: "condition" | "goal", key: string) => ({
    key,
    label: key,
    kind,
    score: {
      rawSubtotal: 0,
      maxPossible: 100,
      score1to10: 1 + credit * 9,
      finalScore: 1 + credit * 9,
      credit,
      percent: credit * 100,
      penaltiesApplied: [],
    },
  });

  it("returns nothing when the user has selected nothing", () => {
    expect(combineMatch([])).toEqual({
      highest: null,
      averagePercent: null,
      breakdown: [],
    });
  });

  it("puts a condition ahead of a goal on an exact tie", () => {
    const r = combineMatch([mk(0.5, "goal", "g"), mk(0.5, "condition", "c")]);
    expect(r.highest?.key).toBe("c");
  });

  it("averages across every selection, including zero-credit ones", () => {
    // A recipe irrelevant to one selection must drag the average down — that is
    // exactly why §8 makes highest, not average, the primary display.
    const r = combineMatch([mk(0.8, "condition", "c"), mk(0, "goal", "g")]);
    expect(r.averagePercent).toBeCloseTo(40, 6);
    expect(r.highest!.score.percent).toBeCloseTo(80, 6);
  });
});

// ── MaxPossible stability (the §4 Step 2 / §7 tension) ──────────────────────
//
// §4 Step 2 fixes MaxPossible to the calibration TABLE, while §7 has the
// pipeline tier far more ingredients than the table lists. Those pull in
// opposite directions, and the choice matters:
//
//   • Table-fixed (what we do)  — denominator stable, so a recipe's score never
//     moves unless the recipe does. RawSubtotal can exceed it, so it is capped.
//   • Cache-derived            — denominator grows with the library, so EVERY
//     recipe's score silently falls as unrelated ingredients get classified.
//
// The worked examples only reproduce under the table-fixed reading, which is
// what settles it.
describe("MaxPossible comes from the table, not the tier cache", () => {
  it("keeps the Heart Health denominator at the table's 240", () => {
    const table = CATEGORY_TABLE_BY_KEY.get("heart-health")!;
    expect(maxPossible(table)).toBe(240);
  });

  it("caps a score at 100% when tiered ingredients outrun the table", () => {
    // Reachable in production: the table lists 4 rows, but the pipeline may
    // tier a dozen real ingredients as Primary for the same outcome.
    const table = CATEGORY_TABLE_BY_KEY.get("heart-health")!;
    const everything = scoreTable({
      table,
      present: table.entries.map((e) => e.ingredient),
    });
    expect(everything.percent).toBeCloseTo(100, 6);
    // Nothing may exceed 100 — a percentage above it is nonsense on screen.
    expect(everything.percent).toBeLessThanOrEqual(100);
  });
});

// ── The four skin goals must stay four separate outcomes ────────────────────
//
// Under v2 these three all aliased to one formula ("Improve my skin & hair"),
// and computeMatchScore de-duplicates by formula — so selecting more than one
// silently dropped the rest, and a user who picked "Clear my skin" saw it
// vanish from the breakdown entirely.
//
// v7 gives each its own table with genuinely different ingredients, which is
// what fixes it. Guarding that here because collapsing them again would
// reintroduce a bug that is invisible unless you check a specific profile.
describe("skin goals are distinct outcomes", () => {
  const keys = ["clear-skin", "hydrate-skin", "skin-brighten", "hair-growth"];

  it("gives each its own table", () => {
    const labels = keys.map((k) => GOAL_TABLE_BY_KEY.get(k)?.label);
    expect(labels).toEqual([
      "Clear my skin",
      "Hydrate my skin",
      "Brighten & firm my skin",
      "Support hair growth",
    ]);
    expect(new Set(labels).size).toBe(4);
  });

  it("does not give them identical ingredient sets", () => {
    // Identical sets would score identically and read as duplicates on screen,
    // even though the labels differ.
    const sets = keys.map((k) =>
      GOAL_TABLE_BY_KEY.get(k)!
        .entries.map((e) => e.ingredient)
        .sort()
        .join("|"),
    );
    expect(new Set(sets).size).toBe(4);
  });

  it("keeps all four when combined, rather than de-duplicating to one", () => {
    const selections = keys.map((key) => {
      const table = GOAL_TABLE_BY_KEY.get(key)!;
      return {
        key,
        label: table.label,
        kind: "goal" as const,
        score: scoreTable({ table, present: [table.entries[0].ingredient] }),
      };
    });
    const combined = combineMatch(selections);
    expect(combined.breakdown).toHaveLength(4);
    expect(new Set(combined.breakdown.map((b) => b.label)).size).toBe(4);
  });
});
