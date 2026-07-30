import { describe, it, expect } from "vitest";
import { nutritionBreakdown } from "@/lib/scoring/nutrition-breakdown";

// Rows feed the Nutri score drawer. Order and labels are fixed by the design, and
// every row is always present — a recipe that earned nothing for fiber says "+0"
// rather than dropping the line.

const ZERO = {
  fiber: 0,
  protein: 0,
  fvl: 0,
  energy: 0,
  sugar: 0,
  satFat: 0,
  salt: 0,
};

describe("nutritionBreakdown", () => {
  it("lists the earned rows in design order", () => {
    expect(nutritionBreakdown(ZERO).earned.map((r) => r.label)).toEqual([
      "Fiber",
      "Protein",
      "Fruit, vegetable & legume content",
    ]);
  });

  it("lists the lost rows in design order", () => {
    expect(nutritionBreakdown(ZERO).lost.map((r) => r.label)).toEqual([
      "Calories",
      "Sugar",
      "Saturated fat",
      "Salt",
    ]);
  });

  it("reproduces the design's worked example", () => {
    const { earned, lost } = nutritionBreakdown({
      fiber: 3,
      protein: 3,
      fvl: 5,
      energy: 6,
      sugar: 5,
      satFat: 3,
      salt: 2,
    });
    expect(earned.map((r) => [r.label, r.points])).toEqual([
      ["Fiber", 3],
      ["Protein", 3],
      ["Fruit, vegetable & legume content", 5],
    ]);
    expect(lost.map((r) => [r.label, r.points])).toEqual([
      ["Calories", 6],
      ["Sugar", 5],
      ["Saturated fat", 3],
      ["Salt", 2],
    ]);
  });

  it("keeps zero rows instead of omitting them", () => {
    const { earned, lost } = nutritionBreakdown({ ...ZERO, energy: 5 });
    expect(earned).toHaveLength(3);
    expect(lost).toHaveLength(4);
    expect(earned.every((r) => r.points === 0)).toBe(true);
    expect(lost.map((r) => r.points)).toEqual([5, 0, 0, 0]);
  });

  it("clamps nulls from a partially scored recipe to 0", () => {
    const { earned, lost } = nutritionBreakdown({
      fiber: null,
      protein: null,
      fvl: null,
      energy: null,
      sugar: null,
      satFat: null,
      salt: null,
    });
    expect([...earned, ...lost].every((r) => r.points === 0)).toBe(true);
  });

  it("never emits a negative magnitude", () => {
    // Both sides are stored as positive magnitudes; a negative would render as
    // "--3" once the section applies its sign.
    const { lost } = nutritionBreakdown({ ...ZERO, sugar: -4 });
    expect(lost.find((r) => r.key === "sugar")?.points).toBe(0);
  });

  it("exposes stable keys for the icon map", () => {
    const { earned, lost } = nutritionBreakdown(ZERO);
    expect([...earned, ...lost].map((r) => r.key)).toEqual([
      "fiber",
      "protein",
      "fvl",
      "energy",
      "sugar",
      "satFat",
      "salt",
    ]);
  });
});
