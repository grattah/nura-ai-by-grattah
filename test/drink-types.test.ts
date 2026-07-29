import { describe, it, expect } from "vitest";
import {
  classifyDrinkType,
  drinkTypeName,
  oneRecipePerDrinkType,
  DRINK_TYPES,
} from "@/lib/drink-types";

describe("classifyDrinkType", () => {
  it("classifies the established types", () => {
    expect(classifyDrinkType("Beetroot Carrot Juice")).toBe("juices");
    expect(classifyDrinkType("Banana Spinach Smoothie")).toBe("smoothies");
    expect(classifyDrinkType("Ginger Turmeric Tea")).toBe("teas");
    expect(classifyDrinkType("Banana Date Protein Shake")).toBe("shakes");
    expect(classifyDrinkType("Wheatgrass Shot")).toBe("shots");
    expect(classifyDrinkType("Cucumber Refresher")).toBe("drinks");
  });

  it("classifies the newly added types", () => {
    expect(classifyDrinkType("Mango Lassi")).toBe("lassis");
    expect(classifyDrinkType("Cucumber Mint Cooler")).toBe("coolers");
    expect(classifyDrinkType("Raspberry Sorbet")).toBe("sorbets");
    // The two real recipes this reclassifies out of the 'drinks' catch-all.
    expect(classifyDrinkType("Homemade Vanilla Oat Milk")).toBe("milks");
    expect(classifyDrinkType("Mung Bean Milk")).toBe("milks");
  });

  it("classifies spoonable items as bowls, not drinks", () => {
    // Both were sitting in the 'drinks' catch-all; the BNS already tracks the
    // acai bowl as Solid Food, so 'drinks' was plainly wrong.
    expect(classifyDrinkType("Acai Coconut Berry Bowl")).toBe("bowls");
    expect(classifyDrinkType("Greek Yogurt with Chia Seeds")).toBe("bowls");
    expect(classifyDrinkType("Berry Chia Pudding")).toBe("bowls");
    // …but a thick oat smoothie is still a smoothie.
    expect(classifyDrinkType("Apple Banana Oats Smoothie")).toBe("smoothies");
    expect(classifyDrinkType("Avocado Oats Dates Smoothie")).toBe("smoothies");
  });

  it("treats lattes as milk drinks", () => {
    expect(classifyDrinkType("Cinnamon Maca Latte")).toBe("milks");
    expect(classifyDrinkType("Coconut Ashwagandha Latte")).toBe("milks");
  });

  it("respects priority when a title matches several keywords", () => {
    // `milk` is common in titles that are really something else, so it loses.
    expect(classifyDrinkType("Almond Milk Smoothie")).toBe("smoothies");
    expect(classifyDrinkType("Banana Milkshake")).toBe("shakes");
    expect(classifyDrinkType("Golden Milk Tea")).toBe("teas");
    // …but wins when nothing more specific is present.
    expect(classifyDrinkType("Golden Milk")).toBe("milks");
  });

  it("every classifiable slug has a display name", () => {
    for (const t of DRINK_TYPES) {
      expect(drinkTypeName(t.slug)).toBe(t.name);
      expect(t.name).not.toMatch(/s$/); // singular labels, per the design
    }
  });
});

describe("oneRecipePerDrinkType", () => {
  it("keeps the first of each type, preserving order", () => {
    const rows = [
      { id: "a", drink_type: "smoothies" },
      { id: "b", drink_type: "smoothies" },
      { id: "c", drink_type: "juices" },
      { id: "d", drink_type: "smoothies" },
      { id: "e", drink_type: "teas" },
    ];
    expect(oneRecipePerDrinkType(rows).map((r) => r.id)).toEqual(["a", "c", "e"]);
  });

  it("treats a missing drink_type as the 'drinks' catch-all", () => {
    const rows = [
      { id: "a", drink_type: null },
      { id: "b", drink_type: "drinks" },
    ];
    expect(oneRecipePerDrinkType(rows).map((r) => r.id)).toEqual(["a"]);
  });
});
