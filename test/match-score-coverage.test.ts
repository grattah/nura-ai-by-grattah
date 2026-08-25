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

  // Total coverage again: every goal the picker offers must resolve to a real
  // formula. The AUG 21 picker briefly outran the formulas and needed an
  // exemption list; now that all 24 score, an unmapped key is a bug, not a
  // known gap — so this is back to an unconditional assertion.
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

// ── Conditions retired from the AUG 21 picker ───────────────────────────────
//
// The picker dropped from 13 conditions to 3. Users who answered the earlier
// questionnaire still hold the retired keys in health_profiles, and their Match
// Score must keep working — computeMatchScore skips an unmapped key silently,
// so deleting one of these mappings during a future tidy-up would quietly zero
// those users' scores with nothing failing.
describe("retired condition keys still score for existing profiles", () => {
  const RETIRED = [
    "diabetes",
    "type-1-diabetes",
    "type-2-diabetes",
    "prediabetes",
    "heart-disease",
    "high-blood-pressure",
    "high-cholesterol",
    "digestive-sensitivities",
    "ibs",
    "ibd",
    "gerd",
    "kidney-disease",
    "liver-disease",
    "arthritis",
    "anemia",
    "perimenopause",
  ];

  it.each(RETIRED)("%s still resolves to a formula", (key) => {
    const prd = CONDITION_KEY_TO_PRD[key];
    expect(prd, `retired key "${key}" lost its mapping`).toBeDefined();
    expect(CONDITION_CREDITS[prd]).toBeTypeOf("function");
  });

  it("offers exactly the three conditions the design shows", () => {
    expect(CONDITIONS.map((c) => c.key)).toEqual([
      "pcos",
      "menopause",
      "osteoporosis",
    ]);
  });
});
