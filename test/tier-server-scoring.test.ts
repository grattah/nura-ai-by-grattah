import { describe, it, expect } from "vitest";
import { scoreFromRaw } from "@/lib/scoring/tier-server";
import { matchPenalties } from "@/lib/scoring/tier-match";
import {
  GOAL_TABLE_BY_KEY,
  CONDITION_TABLE_BY_KEY,
} from "@/lib/scoring/tier-tables";
import { maxPossible } from "@/lib/scoring/tier-score";

type Facts = Parameters<typeof scoreFromRaw>[1][number];

const ing = (id: string, name: string, over: Partial<Facts> = {}): Facts =>
  ({ id, name, ...over }) as Facts;

const score = (tableKey: string, ingredients: Facts[], condition = false) => {
  const table = condition
    ? CONDITION_TABLE_BY_KEY.get(tableKey)!
    : GOAL_TABLE_BY_KEY.get(tableKey)!;
  return scoreFromRaw(
    table,
    ingredients,
    matchPenalties(ingredients, table.penalties),
  );
};

describe("only table rows score", () => {
  it("gives an ingredient that matches no row exactly zero", () => {
    const waterOnly = score("uti-yeast", [
      ing("w", "water", { water_pct: 100 }),
    ]);
    expect(waterOnly.rawSubtotal).toBe(0);
    expect(waterOnly.percent).toBe(0);
  });

  it("scores a juice with no cranberry and no probiotic at zero for UTI & yeast", () => {
    const juice = score("uti-yeast", [
      ing("b", "medium raw beetroot", { fiber_g: 2.8, potassium_mg: 325 }),
      ing("c", "4–5 celery stalks with leaves", { potassium_mg: 260, sodium_mg: 80 }),
      ing("w", "water", { water_pct: 100 }),
      ing("l", "lemon", { vitamin_c_dv: 88 }),
    ]);
    expect(juice.percent).toBe(0);
  });
});

describe("RawSubtotal can never exceed MaxPossible", () => {
  const everything = [
    ing("b", "beetroot", { fiber_g: 3, potassium_mg: 325, vitamin_c_dv: 8 }),
    ing("g", "fresh ginger"),
    ing("t", "turmeric root"),
    ing("w", "water", { water_pct: 100 }),
    ing("l", "lemon", { vitamin_c_dv: 88 }),
    ing("y", "live yoghurt", { is_probiotic: true, protein_g: 10 }),
    ing("f", "flaxseed", { fiber_g: 27, protein_g: 18 }),
    ing("s", "spinach", { iron_mg: 2.7, iron_rich: true }),
  ];

  for (const key of [...GOAL_TABLE_BY_KEY.keys()]) {
    it(`holds for ${key}`, () => {
      const table = GOAL_TABLE_BY_KEY.get(key)!;
      const s = scoreFromRaw(
        table,
        everything,
        matchPenalties(everything, table.penalties),
      );
      expect(s.rawSubtotal).toBeLessThanOrEqual(maxPossible(table));
      expect(s.percent).toBeLessThanOrEqual(100);
    });
  }
});

describe("Match PRD §9 worked example, via ingredient rows", () => {
  const recipe = [
    ing("f", "ground flaxseed", { fiber_g: 27, protein_g: 18 }),
    ing("c", "raw cacao powder", { protein_g: 20, fiber_g: 33 }),
  ];

  it("credits Menopause at 76.9% (flaxseed Primary, 100 of 130)", () => {
    const s = score("menopause", recipe, true);
    expect(s.maxPossible).toBe(130);
    expect(s.rawSubtotal).toBe(100);
    expect(s.percent).toBeCloseTo(76.9, 1);
  });
});
