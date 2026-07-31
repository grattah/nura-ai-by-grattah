import { describe, it, expect } from "vitest";
import {
  BONUS_VALUE,
  BONUS_KEYS,
  BONUS_TRIGGERS,
  bonusFor,
  isBonusKey,
  MEANINGFUL_POTASSIUM_DV,
  MEANINGFUL_SODIUM_DV,
  DV_POTASSIUM_MG,
  DV_SODIUM_MG,
  type BonusContext,
} from "@/lib/scoring/bonuses";
import { maxesForTrack } from "@/lib/scoring/match-metrics";

// One implementation serves both the Match Score's goals (§5.1) and the Category
// Score's categories (Category §4) — Category PRD §8 requires exactly that.

const base: BonusContext = {
  points: { sugar: 0, salt: 0, satFat: 0, energy: 0, fiber: 0, protein: 0 },
  maxes: maxesForTrack("Beverage"), // fiber 5, protein 7, energy 10
  ironRich: false,
  probiotic: false,
  vitaminCDV: 0,
  waterContentPercent: 0,
  sodiumMg: 0,
  potassiumMg: 0,
};

const ctx = (over: Partial<BonusContext>): BonusContext => ({ ...base, ...over });
const pts = (over: Partial<BonusContext["points"]>) => ({ ...base.points, ...over });

describe("shape", () => {
  it("covers exactly the 8 keys both PRDs list", () => {
    expect([...BONUS_KEYS].sort()).toEqual(
      ["beauty", "detox", "energy", "fitness", "gut-health", "hydration", "immunity", "weight-loss"],
    );
    expect(Object.keys(BONUS_TRIGGERS).sort()).toEqual([...BONUS_KEYS].sort());
  });

  it("is a flat 0.15", () => {
    expect(BONUS_VALUE).toBe(0.15);
  });

  it("scores 0 for a key with no bonus term — the 6 bio-only categories", () => {
    for (const k of ["hormones", "focus", "sleep", "diabetes", "menopause", "heart"]) {
      expect(isBonusKey(k)).toBe(false);
      expect(bonusFor(k, ctx({ probiotic: true, ironRich: true, vitaminCDV: 99 }))).toBe(0);
    }
  });
});

describe("triggers", () => {
  it("energy: protein ≥ 0.6 OR ironRich", () => {
    expect(bonusFor("energy", base)).toBe(0);
    expect(bonusFor("energy", ctx({ points: pts({ protein: 4.2 }) }))).toBe(BONUS_VALUE); // 4.2/7 = 0.6
    expect(bonusFor("energy", ctx({ points: pts({ protein: 4 }) }))).toBe(0); // 0.571
    expect(bonusFor("energy", ctx({ ironRich: true }))).toBe(BONUS_VALUE);
  });

  it("fitness is the only AND — one arm alone is not enough", () => {
    const bothArms = ctx({ points: pts({ protein: 7, energy: 5 }) });
    expect(bonusFor("fitness", bothArms)).toBe(BONUS_VALUE);
    expect(bonusFor("fitness", ctx({ points: pts({ protein: 7, energy: 4 }) }))).toBe(0);
    expect(bonusFor("fitness", ctx({ points: pts({ protein: 0, energy: 10 }) }))).toBe(0);
  });

  it("weight-loss: low calories OR fiber OR protein", () => {
    // energyPoints is a PENALTY, so (1 − energy/max) ≥ 0.6 means ≤ 4 points.
    expect(bonusFor("weight-loss", ctx({ points: pts({ energy: 4 }) }))).toBe(BONUS_VALUE);
    expect(bonusFor("weight-loss", ctx({ points: pts({ energy: 10 }) }))).toBe(0);
    expect(bonusFor("weight-loss", ctx({ points: pts({ energy: 10, fiber: 3 }) }))).toBe(BONUS_VALUE);
    expect(bonusFor("weight-loss", ctx({ points: pts({ energy: 10, protein: 5 }) }))).toBe(BONUS_VALUE);
  });

  it("gut-health: fiber OR probiotic", () => {
    expect(bonusFor("gut-health", base)).toBe(0);
    expect(bonusFor("gut-health", ctx({ points: pts({ fiber: 3 }) }))).toBe(BONUS_VALUE);
    expect(bonusFor("gut-health", ctx({ probiotic: true }))).toBe(BONUS_VALUE);
  });

  it("hydration: water ≥ 0.7 OR meaningful sodium AND potassium", () => {
    expect(bonusFor("hydration", ctx({ waterContentPercent: 0.7 }))).toBe(BONUS_VALUE);
    expect(bonusFor("hydration", ctx({ waterContentPercent: 0.69 }))).toBe(0);

    const sodium = (DV_SODIUM_MG * MEANINGFUL_SODIUM_DV) / 100; // 115 mg
    const potassium = (DV_POTASSIUM_MG * MEANINGFUL_POTASSIUM_DV) / 100; // 470 mg
    expect(bonusFor("hydration", ctx({ sodiumMg: sodium, potassiumMg: potassium }))).toBe(BONUS_VALUE);
    // The AND matters: sodium without potassium isn't hydrating.
    expect(bonusFor("hydration", ctx({ sodiumMg: sodium * 10, potassiumMg: 0 }))).toBe(0);
    expect(bonusFor("hydration", ctx({ sodiumMg: 0, potassiumMg: potassium * 10 }))).toBe(0);
  });

  it("beauty and immunity: vitamin C ≥ 20% DV", () => {
    for (const k of ["beauty", "immunity"] as const) {
      expect(bonusFor(k, ctx({ vitaminCDV: 20 }))).toBe(BONUS_VALUE);
      expect(bonusFor(k, ctx({ vitaminCDV: 19.9 }))).toBe(0);
    }
  });

  it("detox: fiber ≥ 0.6 only — probiotic does not apply here", () => {
    expect(bonusFor("detox", ctx({ points: pts({ fiber: 3 }) }))).toBe(BONUS_VALUE);
    expect(bonusFor("detox", ctx({ probiotic: true }))).toBe(0);
  });
});

describe("does not stack", () => {
  // Note two triggers are mutually exclusive by design: weight-loss wants LOW
  // energyPoints, fitness wants HIGH — so "everything passes" needs two fixtures.
  const lowCalorie = ctx({
    points: pts({ protein: 7, fiber: 5, energy: 0 }),
    ironRich: true,
    probiotic: true,
    vitaminCDV: 100,
    waterContentPercent: 1,
    sodiumMg: 5000,
    potassiumMg: 5000,
  });
  const calorieDense = ctx({ ...lowCalorie, points: pts({ protein: 7, fiber: 5, energy: 10 }) });

  it("stays 0.15 when every OR arm of a key passes at once", () => {
    for (const k of BONUS_KEYS) {
      const c = k === "fitness" ? calorieDense : lowCalorie;
      expect(bonusFor(k, c), k).toBe(BONUS_VALUE);
    }
  });
});
