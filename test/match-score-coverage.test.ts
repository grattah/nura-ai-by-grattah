import { describe, it, expect } from "vitest";
import { CONDITIONS, GOALS } from "@/lib/health-profile/options";
import {
  CONDITION_KEY_TO_PRD,
  GOAL_KEY_TO_PRD,
  CONDITION_CREDITS,
  GOAL_CREDITS,
} from "@/lib/scoring/match-metrics";

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

  it("every live option resolves to a human label", () => {
    for (const o of [...CONDITIONS, ...GOALS]) {
      expect(o.label, `option "${o.key}" has no label`).toBeTruthy();
      expect(o.label, `option "${o.key}" label is just the key`).not.toBe(o.key);
    }
  });
});

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
