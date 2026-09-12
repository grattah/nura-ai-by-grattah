import { describe, it, expect } from "vitest";
import { computeMatchScore } from "@/lib/scoring/match-score";
import { BIOACTIVITY_SLUG } from "@/lib/scoring/bioactivity-map";

function bySlug(abbrevScores: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [abbr, score] of Object.entries(abbrevScores)) {
    out[BIOACTIVITY_SLUG[abbr]] = score;
  }
  return out;
}

describe("Recipe Match Score — PRD §8 worked examples", () => {
  const NONE = { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 };

  it("§8.1 condition — Diabetes → 66.9%", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ BloodSugar: 74, WeightMetabolic: 24 }),
      points: { ...NONE, sugar: 2 },
      track: "Beverage",
      ironRich: false,
      waterContentPercent: 0,
      conditions: ["diabetes"],
      goals: [],
    });
    expect(r.highest?.percent).toBeCloseTo(66.9, 0);
  });

  it("§8.2 goal WITH bonus — gut health → 75.1% on probiotic alone", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ Gut: 65, Microbiome: 55 }),
      points: NONE,
      track: "Beverage",
      ironRich: false,
      waterContentPercent: 0,
      probiotic: true,
      conditions: [],
      goals: ["gut-health"],
    });
    expect(r.highest?.percent).toBeCloseTo(75.1, 1);
  });

  it("§8.3 goal WITHOUT bonus — sleep better → 38.5%", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ SleepRelaxation: 30, StressResilience: 48, Mood: 42 }),
      points: NONE,
      track: "Beverage",
      ironRich: false,
      waterContentPercent: 0,
      conditions: [],
      goals: ["sleep"],
    });
    expect(r.highest?.percent).toBeCloseTo(38.5, 1);
  });

  it("§8.4 combined → average 60.2%, highest 75.1% (gut health)", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({
        BloodSugar: 74, WeightMetabolic: 24,
        Gut: 65, Microbiome: 55,
        SleepRelaxation: 30, StressResilience: 48, Mood: 42,
      }),
      points: { ...NONE, sugar: 2 },
      track: "Beverage",
      ironRich: false,
      waterContentPercent: 0,
      probiotic: true,
      conditions: ["diabetes"],
      goals: ["gut-health", "sleep"],
    });
    expect(r.creditCount).toBe(3);
    expect(r.average).toBeCloseTo(60.2, 0);
    expect(r.highest?.percent).toBeCloseTo(75.1, 1);
    expect(r.highest?.key).toBe("gut-health");
  });

  it("§5: a bonus never caps a strong recipe, and the credit clamps at 1", () => {
    const strong = {
      bioBySlug: bySlug({ Gut: 95, Microbiome: 95 }),
      points: NONE,
      track: "Beverage" as const,
      ironRich: false,
      waterContentPercent: 0,
      conditions: [],
      goals: ["gut-health"],
    };
    const without = computeMatchScore(strong).highest!.credit;
    const with_ = computeMatchScore({ ...strong, probiotic: true }).highest!.credit;
    expect(with_).toBeGreaterThan(without);
    expect(with_).toBeLessThanOrEqual(1);
  });

  it("§9: gout is excluded, not borrowed from Arthritis", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ Inflammation: 90, PainComfort: 90, BoneJoint: 90, Antioxidant: 90 }),
      points: NONE,
      track: "Solid Food",
      ironRich: false,
      waterContentPercent: 0,
      conditions: ["gout"],
      goals: [],
    });
    expect(r.creditCount).toBe(0);
    expect(r.highest).toBeNull();
  });
});

describe("Recipe Match Score — structural cases", () => {
  it("Almond Maca Shake, Diabetes+HBP, 4 goals", () => {
    const bioBySlug = bySlug({
      BloodSugar: 20, Heart: 22, Hormonal: 52, StressResilience: 48, Mood: 42,
      BrainCognitive: 30, SleepRelaxation: 14, WeightMetabolic: 24, CellWellness: 30,
      Antioxidant: 38, Kidney: 18, CholLipid: 20, Inflammation: 25,
    });
    const r = computeMatchScore({
      bioBySlug,
      points: { sugar: 0, salt: 0, satFat: 0, energy: 8, protein: 2, fiber: 0 },
      track: "Beverage",
      ironRich: false,
      waterContentPercent: 0,
      conditions: ["diabetes", "high-blood-pressure"],
      goals: ["energy", "hormones", "focus", "sleep"],
    });

    const byKey = Object.fromEntries(r.breakdown.map((b) => [b.key, b.credit]));
    expect(byKey["diabetes"]).toBeCloseTo(0.608, 3);
    expect(byKey["high-blood-pressure"]).toBeCloseTo(0.606, 3);
    expect(byKey["energy"]).toBeCloseTo(0.275, 2);
    expect(byKey["hormones"]).toBeCloseTo(0.48, 2);
    expect(byKey["focus"]).toBeCloseTo(0.335, 2);
    expect(byKey["sleep"]).toBeCloseTo(0.314, 2);
    expect(r.creditCount).toBe(6);
    expect(r.average).toBeCloseTo(43.6, 1);
    expect(r.highest?.key).toBe("diabetes");
    expect(r.highest?.label).toBe("Diabetes");
    expect(r.highest?.percent).toBeCloseTo(60.8, 1);
  });

  it("no conditions and no goals → null (nothing to display)", () => {
    const r = computeMatchScore({
      bioBySlug: {}, points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Beverage", ironRich: false, waterContentPercent: 0, conditions: [], goals: [],
    });
    expect(r.highest).toBeNull();
    expect(r.average).toBeNull();
    expect(r.breakdown).toHaveLength(0);
  });

  it("unmapped selections (thyroid, celiac) are excluded", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ BoneJoint: 80, HealthyAging: 60 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Solid Food", ironRich: false, waterContentPercent: 0,
      conditions: ["osteoporosis", "thyroid-condition", "celiac-disease"],
      goals: [],
    });
    expect(r.creditCount).toBe(1);
    expect(r.average).toBeCloseTo(72.67, 1);
  });

  it("weights each condition's qualifying bioactivities", () => {
    const ctx = {
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Beverage",
      ironRich: false,
      waterContentPercent: 0,
      goals: [],
    };
    expect(
      computeMatchScore({
        ...ctx,
        bioBySlug: bySlug({ BloodSugar: 60, WeightMetabolic: 40 }),
        conditions: ["diabetes"],
      }).average,
    ).toBeCloseTo(75.94, 1);
    expect(
      computeMatchScore({
        ...ctx,
        bioBySlug: bySlug({ Inflammation: 60, PainComfort: 40, BoneJoint: 20, Antioxidant: 80 }),
        conditions: ["arthritis"],
      }).average,
    ).toBeCloseTo(48.97, 1);
    expect(
      computeMatchScore({
        ...ctx,
        bioBySlug: bySlug({ Gut: 80, Microbiome: 60, Inflammation: 40 }),
        conditions: ["digestive-sensitivities"],
      }).average,
    ).toBeCloseTo(63.4, 1);
  });

  it("ignores a key the PRD does not define", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ Gut: 80, Microbiome: 60, Inflammation: 40 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Beverage", ironRich: false, waterContentPercent: 0,
      conditions: ["ibs"], goals: [],
    });
    expect(r.creditCount).toBe(0);
    expect(r.highest).toBeNull();

    const canonical = computeMatchScore({
      bioBySlug: bySlug({ Gut: 80, Microbiome: 60, Inflammation: 40 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Beverage", ironRich: false, waterContentPercent: 0,
      conditions: ["digestive-sensitivities"], goals: [],
    });
    expect(canonical.creditCount).toBe(1);
    expect(canonical.average).toBeCloseTo(63.4, 1);
  });

  it("Anemia blends BrainCognitive with the iron-rich flag (no longer binary)", () => {
    const base = {
      bioBySlug: bySlug({ BrainCognitive: 40 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Solid Food" as const, waterContentPercent: 0,
      conditions: ["anemia"], goals: [],
    };
    expect(computeMatchScore({ ...base, ironRich: true }).average).toBeCloseTo(70, 5);
    expect(computeMatchScore({ ...base, ironRich: false }).average).toBeCloseTo(20, 5);
  });
});

describe("Recipe Match Score — display spec (§7)", () => {
  const allBio = (v: number) =>
    Object.fromEntries(Object.values(BIOACTIVITY_SLUG).map((slug) => [slug, v]));
  const flat = {
    bioBySlug: allBio(50),
    points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
    track: "Solid Food",
    ironRich: false,
    waterContentPercent: 0,
  };

  it("§7.1 ties: a condition outranks a goal", () => {
    const r = computeMatchScore({ ...flat, conditions: ["arthritis"], goals: ["hormones"] });
    expect(r.breakdown[0].credit).toBeCloseTo(r.breakdown[1].credit, 10);
    expect(r.highest?.kind).toBe("condition");
    expect(r.highest?.key).toBe("arthritis");
  });

  it("§7.1 ties within one kind: earlier selection wins", () => {
    const conditions = computeMatchScore({ ...flat, conditions: ["osteoporosis", "arthritis"], goals: [] });
    expect(conditions.highest?.key).toBe("osteoporosis");
    const goals = computeMatchScore({ ...flat, conditions: [], goals: ["sleep", "hormones"] });
    expect(goals.highest?.key).toBe("sleep");
  });

  it("§7.2 breakdown is sorted best-first and highest is its head", () => {
    const r = computeMatchScore({
      bioBySlug: bySlug({ BoneJoint: 90, HealthyAging: 90, Mood: 20, StressResilience: 20, SleepRelaxation: 20 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Solid Food", ironRich: false, waterContentPercent: 0,
      conditions: ["osteoporosis"], goals: ["sleep"],
    });
    const credits = r.breakdown.map((b) => b.credit);
    expect([...credits].sort((a, b) => b - a)).toEqual(credits);
    expect(r.highest).toBe(r.breakdown[0]);
    expect(r.highest?.key).toBe("osteoporosis");
  });

  it("§7.5 single selection: highest and average agree", () => {
    const r = computeMatchScore({ ...flat, conditions: ["arthritis"], goals: [] });
    expect(r.creditCount).toBe(1);
    expect(r.highest?.percent).toBeCloseTo(r.average!, 10);
  });

  it("labels come from the picker, not the PRD formula name", () => {
    const r = computeMatchScore({
      ...flat,
      conditions: [],
      goals: ["detox"],
    });
    expect(r.highest?.prd).toBe("Support my body's detox");
    expect(r.highest?.label).toBe("Body detox");

    const listed = computeMatchScore({
      ...flat,
      conditions: ["digestive-sensitivities"],
      goals: [],
    });
    expect(listed.highest?.label).toBe("Digestive Sensitivities");

    const unlisted = computeMatchScore({
      ...flat,
      conditions: [],
      goals: ["hydration"],
    });
    expect(unlisted.highest?.prd).toBe("Drink more water");
    expect(unlisted.highest?.label).toBe("Drink more water");
  });
});

describe("Recipe Match Score — §6 denominator", () => {
  const flat = {
    bioBySlug: bySlug({
      BloodSugar: 60, WeightMetabolic: 40, Heart: 70, CholLipid: 60,
      Inflammation: 50, Gut: 70, Microbiome: 60,
    }),
    points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
    track: "Beverage" as const,
    ironRich: false,
    waterContentPercent: 0,
    goals: [] as string[],
  };

  it("gives one credit per selection", () => {
    const r = computeMatchScore({
      ...flat,
      conditions: ["diabetes", "heart-disease"],
    });
    expect(r.creditCount).toBe(2);
    expect(new Set(r.breakdown.map((b) => b.label)).size).toBe(2);
  });

  it("skips a key the PRD does not define, without counting it", () => {
    const r = computeMatchScore({
      ...flat,
      conditions: ["gout", "type-2-diabetes", "diabetes", "heart-disease"],
    });
    expect(r.creditCount).toBe(2);
    const only = computeMatchScore({
      ...flat,
      conditions: ["diabetes", "heart-disease"],
    });
    expect(r.average).toBeCloseTo(only.average!, 10);
  });

  it("keeps a condition and a goal separate even with similar names", () => {
    const r = computeMatchScore({
      ...flat,
      conditions: ["menopause"],
      goals: ["sleep"],
    });
    expect(r.creditCount).toBe(2);
    expect(r.breakdown.map((b) => b.kind).sort()).toEqual(["condition", "goal"]);
  });
});
