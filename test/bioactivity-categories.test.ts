import { describe, it, expect } from "vitest";
import {
  calculateCategoryScore,
  categoryBioSubtotal,
  computeRecipeCategories,
  computeAllCategoryScores,
  supportTier,
  QUALIFY_THRESHOLD,
  STRONG_THRESHOLD,
} from "@/lib/bioactivity-categories";
import type { BonusContext } from "@/lib/scoring/bonuses";
import { maxesForTrack } from "@/lib/scoring/match-metrics";

// A context where every bonus trigger FAILS — the baseline for isolating one.
const noBonus: BonusContext = {
  points: { sugar: 0, salt: 0, satFat: 0, energy: 10, fiber: 0, protein: 0 },
  maxes: maxesForTrack("Beverage"),
  ironRich: false,
  probiotic: false,
  vitaminCDV: 0,
  waterContentPercent: 0,
  sodiumMg: 0,
  potassiumMg: 0,
};

describe("categoryBioSubtotal (relevance-weighted, ≥50 qualifiers)", () => {
  it("matches the Diabetes worked example (blood-sugar 95, weight-metabolic 65)", () => {
    const scores = { "blood-sugar-support": 85, "weight-metabolic-support": 40 };
    // (85*95 + 40*65) / (95+65) = 10675 / 160 = 66.7
    expect(categoryBioSubtotal(scores, "diabetes")).toBeCloseTo(66.72, 1);
  });

  it("scores Recipe Z (90/10) at 57.5 for Diabetes", () => {
    const scores = { "blood-sugar-support": 90, "weight-metabolic-support": 10 };
    expect(categoryBioSubtotal(scores, "diabetes")).toBeCloseTo(57.5, 1);
  });
});

// Category PRD §7 — the document's own worked example, end to end.
describe("Category PRD §7 worked example — Gut Health", () => {
  const scores = { "gut-digestive-support": 65, "microbiome-support": 55 };

  it("computes BioSubtotal 60.1 from the two ≥50 bioactivities", () => {
    // (65×95 + 55×90) ÷ (95+90) = 11125 ÷ 185 = 60.1
    expect(categoryBioSubtotal(scores, "gut-health")).toBeCloseTo(60.1, 1);
  });

  it("adds the probiotic bonus for 75.1 even though fiberPoints is 0", () => {
    const ctx: BonusContext = { ...noBonus, probiotic: true };
    expect(calculateCategoryScore(scores, "gut-health", ctx)).toBeCloseTo(75.1, 1);
  });

  it("lands in the Strong support tier", () => {
    expect(supportTier(75)).toBe("strong");
  });
});

describe("§4 bonus behaviour", () => {
  const gut = { "gut-digestive-support": 65, "microbiome-support": 55 };
  const rich: BonusContext = {
    ...noBonus,
    probiotic: true,
    ironRich: true,
    vitaminCDV: 90,
    waterContentPercent: 1,
    points: { sugar: 0, salt: 0, satFat: 0, energy: 0, fiber: 5, protein: 7 },
  };

  it("is BioSubtotal alone without a bonus context", () => {
    expect(calculateCategoryScore(gut, "gut-health")).toBeCloseTo(60.1, 1);
  });

  it("never reduces a score — the bonus only ever adds credit", () => {
    const scores = Object.fromEntries(
      [
        "gut-digestive-support", "microbiome-support", "liver-detox-support",
        "immune-support", "skin-health-support", "kidney-fluid-balance-support",
        "weight-metabolic-support", "heart-circulation-support",
      ].map((s) => [s, 55]),
    );
    for (const c of computeAllCategoryScores(scores, rich)) {
      expect(c.score).toBeGreaterThanOrEqual(
        Math.round(categoryBioSubtotal(scores, c.category)),
      );
    }
  });

  it("gives the 6 bonus-less categories nothing, however rich the context", () => {
    // §5: Hormones, Focus, Sleep, Diabetes, Menopause, Heart Health.
    const scores = { "hormonal-balance-support": 70, "sleep-relaxation-support": 70 };
    for (const cat of ["hormones", "focus", "sleep", "diabetes", "menopause", "heart"] as const) {
      expect(calculateCategoryScore(scores, cat, rich)).toBeCloseTo(
        categoryBioSubtotal(scores, cat),
        5,
      );
    }
  });

  it("caps at 100", () => {
    const perfect = { "gut-digestive-support": 100, "microbiome-support": 100 };
    const ctx: BonusContext = { ...noBonus, probiotic: true };
    expect(calculateCategoryScore(perfect, "gut-health", ctx)).toBe(100);
  });
});

// §6.1/§6.2 — the display floor is absolute; the trace exception is gone.
describe("display floor and tiers", () => {
  it("qualifies at exactly 40 and not below", () => {
    expect(supportTier(QUALIFY_THRESHOLD)).toBe("moderate");
    expect(supportTier(QUALIFY_THRESHOLD - 1)).toBe("none");
  });

  it("is Strong from exactly 60", () => {
    expect(supportTier(STRONG_THRESHOLD)).toBe("strong");
    expect(supportTier(STRONG_THRESHOLD - 1)).toBe("moderate");
  });

  it("drops every sub-40 category — no exception admits one", () => {
    // Previously a ≥80-confidence LLM "trace override" could admit these.
    const scores = { "blood-sugar-support": 20, "weight-metabolic-support": 10 };
    const out = computeRecipeCategories(scores);
    expect(out.every((c) => c.score >= QUALIFY_THRESHOLD)).toBe(true);
    expect(out.find((c) => c.category === "sleep")).toBeUndefined();
  });
});
