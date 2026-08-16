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

// ── §8 Worked Examples (the PRD's own acceptance criteria) ──────────────────
describe("Recipe Match Score — PRD §8 worked examples", () => {
  const NONE = { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 };

  it("§8.1 condition — Diabetes → 66.9%", () => {
    // BioSubtotal = (74×95 + 24×65) ÷ 160 = 53.7
    // Credit = (0.537 + (1 − 2÷10)) ÷ 2 = 0.669
    const r = computeMatchScore({
      bioBySlug: bySlug({ BloodSugar: 74, WeightMetabolic: 24 }),
      points: { ...NONE, sugar: 2 },
      track: "Beverage", // maxSugar = 10
      ironRich: false,
      waterContentPercent: 0,
      conditions: ["diabetes"],
      goals: [],
    });
    expect(r.highest?.percent).toBeCloseTo(66.9, 0);
  });

  it("§8.2 goal WITH bonus — gut health → 75.1% on probiotic alone", () => {
    // BioSubtotal 60.1; fiberPoints 0 fails, probioticFlag passes → +0.15.
    // Under the old averaging model the zero fiber HALVED this to ~30%.
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
    // §7.1: the headline is the BEST credit, and it names its source.
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
    expect(with_).toBeGreaterThan(without); // only ever adds
    expect(with_).toBeLessThanOrEqual(1); // min(1, …)
  });

  // §9: "Gout has no defined credit formula and should not be included in the
  // credit average if disclosed, until a metric is defined for it."
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
    // PRD §6 Step 1. Kidney/CholLipid/Inflammation are needed by the rewritten
    // weighted condition formulas (the old single-bioactivity ones never read them).
    const bioBySlug = bySlug({
      BloodSugar: 20, Heart: 22, Hormonal: 52, StressResilience: 48, Mood: 42,
      BrainCognitive: 30, SleepRelaxation: 14, WeightMetabolic: 24, CellWellness: 30,
      Antioxidant: 38, Kidney: 18, CholLipid: 20, Inflammation: 25,
    });
    const r = computeMatchScore({
      bioBySlug,
      points: { sugar: 0, salt: 0, satFat: 0, energy: 8, protein: 2, fiber: 0 },
      track: "Beverage", // maxSugar = 10
      ironRich: false,
      waterContentPercent: 0,
      conditions: ["diabetes", "high-blood-pressure"],
      goals: ["energy", "hormones", "focus", "sleep"],
    });

    const byKey = Object.fromEntries(r.breakdown.map((b) => [b.key, b.credit]));
    // §6 Step 3: BioSubtotal (20×95 + 24×65)/160 = 21.6 → (0.216 + 1)/2
    expect(byKey["diabetes"]).toBeCloseTo(0.608, 3);
    // (22×95 + 18×60 + 20×55 + 25×50)/260 = 21.2 → (0.212 + 1)/2
    expect(byKey["high-blood-pressure"]).toBeCloseTo(0.606, 3);
    // Goal weights are unchanged, but `energy` moved to the bonus model: its
    // BioSubtotal is 27.5 and neither arm fires (protein 2/7 = 0.29, no iron), so
    // the credit is 0.275. It was 0.454 when proteinPoints and energyPoints were
    // AVERAGED IN — and that old model counted energyPoints as a POSITIVE, so a
    // calorie-dense recipe scored better for "have more energy".
    expect(byKey["energy"]).toBeCloseTo(0.275, 2);
    expect(byKey["hormones"]).toBeCloseTo(0.48, 2);
    expect(byKey["focus"]).toBeCloseTo(0.335, 2);
    expect(byKey["sleep"]).toBeCloseTo(0.314, 2);
    expect(r.creditCount).toBe(6);
    // 2.618 / 6 × 100 (was 46.6% under the averaging model).
    expect(r.average).toBeCloseTo(43.6, 1);
    // §7.1: the headline is the BEST credit, not the average — Diabetes at 60.8%.
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
    // Only osteoporosis: (80×95 + 60×55)/150 = 72.67
    expect(r.creditCount).toBe(1);
    expect(r.average).toBeCloseTo(72.67, 1);
  });

  // §4: conditions now use relevance-weighted subtotals, not a single bioactivity.
  it("weights each condition's qualifying bioactivities", () => {
    const ctx = {
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Beverage",
      ironRich: false,
      waterContentPercent: 0,
      goals: [],
    };
    // Diabetes: (60×95 + 40×65)/160 = 51.875 → (0.51875 + 1)/2
    expect(
      computeMatchScore({
        ...ctx,
        bioBySlug: bySlug({ BloodSugar: 60, WeightMetabolic: 40 }),
        conditions: ["diabetes"],
      }).average,
    ).toBeCloseTo(75.94, 1);
    // Arthritis: (60×95 + 40×80 + 20×65 + 80×50)/290 = 48.97
    expect(
      computeMatchScore({
        ...ctx,
        bioBySlug: bySlug({ Inflammation: 60, PainComfort: 40, BoneJoint: 20, Antioxidant: 80 }),
        conditions: ["arthritis"],
      }).average,
    ).toBeCloseTo(48.97, 1);
    // Digestive Sensitivities: (80×95 + 60×85 + 40×55)/235 = 63.40
    expect(
      computeMatchScore({
        ...ctx,
        bioBySlug: bySlug({ Gut: 80, Microbiome: 60, Inflammation: 40 }),
        conditions: ["digestive-sensitivities"],
      }).average,
    ).toBeCloseTo(63.4, 1);
  });

  it("still scores legacy keys held by older profiles", () => {
    // Pre-consolidation rows in health_profiles must keep working.
    const r = computeMatchScore({
      bioBySlug: bySlug({ Gut: 80, Microbiome: 60, Inflammation: 40 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Beverage", ironRich: false, waterContentPercent: 0,
      conditions: ["ibs"], goals: [],
    });
    expect(r.creditCount).toBe(1);
    expect(r.average).toBeCloseTo(63.4, 1);
  });

  it("Anemia blends BrainCognitive with the iron-rich flag (no longer binary)", () => {
    const base = {
      bioBySlug: bySlug({ BrainCognitive: 40 }),
      points: { sugar: 0, salt: 0, satFat: 0, energy: 0, protein: 0, fiber: 0 },
      track: "Solid Food" as const, waterContentPercent: 0,
      conditions: ["anemia"], goals: [],
    };
    // (0.40 + 1)/2 = 0.70   |   (0.40 + 0)/2 = 0.20
    expect(computeMatchScore({ ...base, ironRich: true }).average).toBeCloseTo(70, 5);
    expect(computeMatchScore({ ...base, ironRich: false }).average).toBeCloseTo(20, 5);
  });
});

// ── §7 Display Specification ────────────────────────────────────────────────
describe("Recipe Match Score — display spec (§7)", () => {
  // With every bioactivity equal, all pure-BioSubtotal formulas return the same
  // credit — which is exactly what's needed to exercise the tie-break rules.
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
    expect(r.breakdown[0].credit).toBeCloseTo(r.breakdown[1].credit, 10); // genuinely tied
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
    // `detox` is labelled "Body detox" in the picker but "Support my body's
    // detox" in the PRD — show the user what they actually selected.
    const r = computeMatchScore({ ...flat, conditions: [], goals: ["detox"] });
    expect(r.highest?.prd).toBe("Support my body's detox");
    expect(r.highest?.label).toBe("Body detox");
    // Legacy keys aren't in the picker, so they fall back to the PRD name.
    const legacy = computeMatchScore({ ...flat, conditions: ["ibs"], goals: [] });
    expect(legacy.highest?.label).toBe("Digestive Sensitivities");
  });
});

// ── Alias de-duplication ────────────────────────────────────────────────────
// Several keys alias to one PRD formula. A prod profile holding
// {gout, gerd, type-2-diabetes, prediabetes, heart-disease, type-1-diabetes}
// rendered "Diabetes 53%" three times AND divided the average by 6 instead of 4.
describe("Recipe Match Score — one credit per formula", () => {
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

  it("collapses the three diabetes aliases into a single credit", () => {
    const r = computeMatchScore({
      ...flat,
      conditions: [
        "gout", "gerd", "type-2-diabetes", "prediabetes",
        "heart-disease", "type-1-diabetes",
      ],
    });
    // gout is unmapped (§9); the 3 diabetes keys collapse to 1.
    expect(r.creditCount).toBe(3);
    const labels = r.breakdown.map((b) => b.label);
    expect(labels.filter((l) => l === "Diabetes")).toHaveLength(1);
    expect(new Set(labels).size).toBe(labels.length); // no repeats at all
  });

  it("keeps the earliest selection when aliases collide (§7.1)", () => {
    const r = computeMatchScore({ ...flat, conditions: ["prediabetes", "diabetes"] });
    expect(r.creditCount).toBe(1);
    expect(r.breakdown[0].key).toBe("prediabetes");
  });

  it("no longer skews the average by counting one condition three times", () => {
    const three = computeMatchScore({
      ...flat,
      conditions: ["heart-disease", "type-1-diabetes", "type-2-diabetes", "prediabetes"],
    });
    const once = computeMatchScore({
      ...flat,
      conditions: ["heart-disease", "diabetes"],
    });
    expect(three.average).toBeCloseTo(once.average!, 6);
  });

  it("a condition and a goal sharing a name stay separate credits", () => {
    // "menopause" the condition and any goal are different formulas — the dedupe
    // key is scoped by kind so it can never merge across them.
    const r = computeMatchScore({
      ...flat,
      conditions: ["menopause", "perimenopause"],
      goals: ["sleep"],
    });
    expect(r.creditCount).toBe(2);
    expect(r.breakdown.map((b) => b.kind).sort()).toEqual(["condition", "goal"]);
  });
});
