import { describe, it, expect } from "vitest";
import { computeMatchScore } from "@/lib/scoring/match-score";
import { BIOACTIVITY_SLUG } from "@/lib/scoring/bioactivity-map";

// Build a slug→score map from PRD-abbreviation scores (PRD §6 worked example).
function bySlug(abbrevScores: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [abbr, score] of Object.entries(abbrevScores)) {
    out[BIOACTIVITY_SLUG[abbr]] = score;
  }
  return out;
}

describe("Recipe Match Score — PRD full worked example → 46.6%", () => {
  it("Almond Maca Shake, Diabetes+HBP, 4 goals", () => {
    const bioBySlug = bySlug({
      BloodSugar: 20, Heart: 22, Hormonal: 52, StressResilience: 48, Mood: 42,
      BrainCognitive: 30, SleepRelaxation: 14, WeightMetabolic: 24, CellWellness: 30,
      Antioxidant: 38,
    });
    const r = computeMatchScore({
      bioBySlug,
      points: { sugar: 0, salt: 0, satFat: 0, energy: 8, protein: 2, fiber: 0 },
      track: "Beverage", // maxSugar = 10
      ironRich: false,
      waterContentPercent: 0,
      conditions: ["type-2-diabetes", "high-blood-pressure"],
      goals: ["energy", "hormones", "focus", "sleep"],
    });

    const byKey = Object.fromEntries(r.breakdown.map((b) => [b.key, b.credit]));
    expect(byKey["type-2-diabetes"]).toBeCloseTo(0.6, 3);
    expect(byKey["high-blood-pressure"]).toBeCloseTo(0.61, 3);
    expect(byKey["energy"]).toBeCloseTo(0.454, 2);
    expect(byKey["hormones"]).toBeCloseTo(0.48, 2);
    expect(byKey["focus"]).toBeCloseTo(0.335, 2);
    expect(byKey["sleep"]).toBeCloseTo(0.314, 2);
    expect(r.creditCount).toBe(6);
    // Exact math → 46.54%. The PRD's stated 46.6% rounds each credit to 3dp
    // first (0.60+0.61+0.454+0.48+0.335+0.314=2.793 /6 = 46.55); the six credits
    // above match the PRD exactly, which is the real correctness proof.
    expect(r.score).toBeCloseTo(46.54, 1);
  });

  it("no conditions and no goals → null (nothing to average)", () => {
    const r = computeMatchScore({
      bioBySlug: {}, points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Beverage", ironRich: false, waterContentPercent: 0, conditions: [], goals: [],
    });
    expect(r.score).toBeNull();
  });

  it("unmapped selections (thyroid, celiac) are excluded from the average", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ BoneJoint: 80 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Solid Food", ironRich: false, waterContentPercent: 0,
      conditions: ["osteoporosis", "thyroid-condition", "celiac-disease"],
      goals: [],
    });
    // Only osteoporosis contributes; BoneJoint 80 → 0.8 → 80%.
    expect(r.creditCount).toBe(1);
    expect(r.score).toBeCloseTo(80, 5);
  });

  it("Anemia credit is driven by the iron-rich flag", () => {
    const on = computeMatchScore({
      bioBySlug: {}, points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Solid Food", ironRich: true, waterContentPercent: 0, conditions: ["anemia"], goals: [],
    });
    expect(on.score).toBeCloseTo(100, 5);
    const off = computeMatchScore({ ...{
      bioBySlug: {}, points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Solid Food", ironRich: false, waterContentPercent: 0, conditions: ["anemia"], goals: [],
    } });
    expect(off.score).toBeCloseTo(0, 5);
  });
});
