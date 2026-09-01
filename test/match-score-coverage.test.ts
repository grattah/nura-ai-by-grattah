import { describe, it, expect } from "vitest";
import { CONDITIONS, GOALS } from "@/lib/health-profile/options";
import {
  CONDITION_KEY_TO_PRD,
  GOAL_KEY_TO_PRD,
  CONDITION_CREDITS,
  GOAL_CREDITS,
} from "@/lib/scoring/match-metrics";

// Regression guard for a whole class of silent bug.
//
// computeMatchScore skips any selection whose key isn't in the key→PRD map, with
// no error. So when options.ts was consolidated (type-1/type-2-diabetes →
// diabetes, ibs/ibd/gerd → digestive-sensitivities, gout → arthritis, beauty →
// skin-hair) without updating match-metrics.ts, those conditions silently stopped
// contributing — either hiding the Match Score entirely or, worse, producing a
// score that quietly ignored a disclosed condition.
//
// CONDITIONS/GOALS contain exactly the LIVE keys (disabled options are commented
// out of the arrays), so asserting every one resolves to a real formula makes any
// future option rename fail here instead of degrading scores in production.

describe("every live health-profile option maps to a Match Score formula", () => {
  it.each(CONDITIONS.map((c) => [c.key, c.label] as const))(
    "condition %s (%s)",
    (key) => {
      const prd = CONDITION_KEY_TO_PRD[key];
      expect(prd, `condition "${key}" is not in CONDITION_KEY_TO_PRD`).toBeDefined();
      expect(
        CONDITION_CREDITS[prd],
        `condition "${key}" maps to "${prd}", which has no credit formula`,
      ).toBeTypeOf("function");
    },
  );

  // Every goal the picker offers must resolve to a real formula. The AUG 21
  // 24-goal picker outran the formulas — 11 goals were display-only and scored
  // nothing. The reverted 12 all resolve, so an unmapped key is a bug rather
  // than a known gap and this stays unconditional.
  it.each(GOALS.map((g) => [g.key, g.label] as const))("goal %s (%s)", (key) => {
    const prd = GOAL_KEY_TO_PRD[key];
    expect(prd, `goal "${key}" is not in GOAL_KEY_TO_PRD`).toBeDefined();
    expect(
      GOAL_CREDITS[prd],
      `goal "${key}" maps to "${prd}", which has no credit formula`,
    ).toBeTypeOf("function");
  });
});

describe("map integrity", () => {
  it("every mapped PRD name resolves to a real formula", () => {
    for (const [key, prd] of Object.entries(CONDITION_KEY_TO_PRD)) {
      expect(CONDITION_CREDITS[prd], `${key} → ${prd}`).toBeTypeOf("function");
    }
    for (const [key, prd] of Object.entries(GOAL_KEY_TO_PRD)) {
      expect(GOAL_CREDITS[prd], `${key} → ${prd}`).toBeTypeOf("function");
    }
  });

  // §7.1 shows the label of the winning selection, so every live option needs a
  // real display label — a key echoed back as its own label would surface raw
  // slugs like "gut-health" in the UI.
  it("every live option resolves to a human label", () => {
    for (const o of [...CONDITIONS, ...GOALS]) {
      expect(o.label, `option "${o.key}" has no label`).toBeTruthy();
      expect(o.label, `option "${o.key}" label is just the key`).not.toBe(o.key);
    }
  });
});

// ── The maps mirror the PRD exactly ─────────────────────────────────────────
//
// This replaces a block asserting that retired keys (type-1-diabetes, ibs,
// gerd, perimenopause …) STILL resolved, so pre-consolidation profiles kept
// scoring. The product is pre-launch and those profiles are being reset
// instead — scripts/reset-profile-selections.ts strips anything the PRD does
// not name — so the maps now contain one key per formula and nothing else.
describe("key maps mirror the PRD", () => {
  const PRD_CONDITIONS = [
    "Diabetes", "Heart disease", "High blood pressure", "High cholesterol",
    "PCOS", "Menopause", "Digestive Sensitivities", "Kidney disease",
    "Liver disease", "Osteoporosis", "Arthritis", "Anemia",
  ];
  const PRD_GOALS = [
    "Have more energy", "Improve my fitness", "Lose weight",
    "Improve my gut health", "Drink more water", "Improve my skin & hair",
    "Boost my immunity", "Support my body's detox", "Balance my hormones",
    "Sharpen my focus", "Sleep better", "Reduce stress", "Improve my mood",
  ];

  it("defines every PRD formula and no others", () => {
    expect(Object.keys(CONDITION_CREDITS).sort()).toEqual([...PRD_CONDITIONS].sort());
    expect(Object.keys(GOAL_CREDITS).sort()).toEqual([...PRD_GOALS].sort());
  });

  it("maps exactly one key to each formula", () => {
    // The invariant that makes de-duplication unnecessary. While several keys
    // aliased one formula, two selections could resolve to the same credit and
    // computeMatchScore had to collapse them — which meant §6's denominator was
    // not the number of selections. 1:1 removes the problem by construction, so
    // a second key pointing at a formula must fail HERE rather than quietly
    // changing how averages are computed.
    for (const [label, map] of [
      ["condition", CONDITION_KEY_TO_PRD],
      ["goal", GOAL_KEY_TO_PRD],
    ] as const) {
      const byFormula = new Map<string, string[]>();
      for (const [key, prd] of Object.entries(map)) {
        byFormula.set(prd, [...(byFormula.get(prd) ?? []), key]);
      }
      const shared = [...byFormula].filter(([, keys]) => keys.length > 1);
      expect(
        shared.map(([prd, keys]) => `${prd} ← ${keys.join(", ")}`),
        `${label} formulas reached by more than one key`,
      ).toEqual([]);
    }
  });

  it("has no key for a formula the PRD does not define", () => {
    for (const [key, prd] of Object.entries(CONDITION_KEY_TO_PRD)) {
      expect(PRD_CONDITIONS, `condition key "${key}"`).toContain(prd);
    }
    for (const [key, prd] of Object.entries(GOAL_KEY_TO_PRD)) {
      expect(PRD_GOALS, `goal key "${key}"`).toContain(prd);
    }
  });

  it("still excludes gout (§9)", () => {
    expect(CONDITION_KEY_TO_PRD["gout"]).toBeUndefined();
  });
});
