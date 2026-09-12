import { describe, it, expect } from "vitest";
import { heuristicClassify } from "@/lib/usda/resolve";

describe("heuristicClassify", () => {
  it("whole foods → NOVA 1, FVL where applicable", () => {
    const banana = heuristicClassify("banana", "Fruits and Fruit Juices");
    expect(banana).toMatchObject({ nova_group: 1, is_fvl: true });

    const spinach = heuristicClassify("fresh spinach", "Vegetables");
    expect(spinach).toMatchObject({ nova_group: 1, is_fvl: true });
    expect(spinach?.iron_rich).toBe(true);
  });

  it("added sweeteners → NOVA 2, excluded from FVL", () => {
    const honey = heuristicClassify("honey", "Sweets");
    expect(honey).toMatchObject({
      nova_group: 2,
      is_added_sweetener: true,
      is_fvl: false,
    });
    const maple = heuristicClassify("maple syrup", "");
    expect(maple?.is_added_sweetener).toBe(true);
  });

  it("non-nutritive sweeteners → NOVA 4 + nnutritive flag (beverage +4 penalty)", () => {
    const stevia = heuristicClassify("stevia drops", "");
    expect(stevia).toMatchObject({
      nova_group: 4,
      is_sweetener_nnutritive: true,
    });
  });

  it("ultra-processed keywords → NOVA 4", () => {
    expect(heuristicClassify("vanilla protein powder", "")?.nova_group).toBe(4);
    expect(heuristicClassify("flavored syrup", "")?.nova_group).toBe(4);
  });

  it("water/ice → NOVA 1, not FVL", () => {
    expect(heuristicClassify("water", "")).toMatchObject({
      nova_group: 1,
      is_fvl: false,
    });
  });

  it("ambiguous ingredients → null (defer to LLM, never guess)", () => {
    expect(heuristicClassify("almond milk", "")).toBeNull();
    expect(heuristicClassify("greek yogurt", "")).toBeNull();
    expect(heuristicClassify("chia seeds soaked overnight", "Snacks")).toBeNull();
  });
});
