import { describe, it, expect } from "vitest";
import {
  calculateCategoryScore,
  computeRecipeCategories,
} from "@/lib/bioactivity-categories";

describe("calculateCategoryScore (relevance-weighted average, ≥50 qualifiers)", () => {
  it("matches the PRD Diabetes worked example (blood-sugar 95, weight-metabolic 65)", () => {
    // Only blood-sugar-support (95) and weight-metabolic-support (65) are ≥50 for diabetes.
    const scores = { "blood-sugar-support": 85, "weight-metabolic-support": 40 };
    // (85*95 + 40*65) / (95+65) = 10675 / 160 = 66.7
    expect(calculateCategoryScore(scores, "diabetes")).toBeCloseTo(66.72, 1);
  });

  it("still qualifies Recipe Z (90/10) at 57.5 for Diabetes", () => {
    const scores = { "blood-sugar-support": 90, "weight-metabolic-support": 10 };
    // (90*95 + 10*65) / 160 = 9200 / 160 = 57.5
    expect(calculateCategoryScore(scores, "diabetes")).toBeCloseTo(57.5, 1);
  });
});

describe("computeRecipeCategories", () => {
  it("qualifies a category at ≥50 and admits sub-50 via a ≥80 trace override", () => {
    const scores = { "blood-sugar-support": 90, "weight-metabolic-support": 10 };
    const out = computeRecipeCategories(scores, [
      { category: "sleep", ingredient: "turmeric", confidence: 82 },
    ]);
    const byCat = Object.fromEntries(out.map((c) => [c.category, c]));
    expect(byCat["diabetes"]).toMatchObject({ score: 58, viaTrace: false });
    expect(byCat["sleep"]).toMatchObject({ viaTrace: true });
  });

  it("ignores a trace override below the confidence threshold", () => {
    const out = computeRecipeCategories({}, [
      { category: "sleep", confidence: 70 },
    ]);
    expect(out.find((c) => c.category === "sleep")).toBeUndefined();
  });
});
