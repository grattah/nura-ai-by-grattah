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
});
