import { describe, it, expect } from "vitest";
import {
  mentionsBodySystem,
  parseWhyItWorksDetail,
  WhyItWorksDetailSchema,
} from "@/lib/recipe-copy";

// QA ⑩ — the intro must stay experiential; mechanism belongs in "Why it works".
describe("mentionsBodySystem", () => {
  it.each([
    "supports cardiovascular health and blood sugar balance",
    "delivers targeted cognitive protection",
    "three distinct organ-system benefits in one glass",
    "promoting gut health and healthy digestion",
    "supports blood pressure",
    "great for immunity",
  ])("flags %j", (text) => {
    expect(mentionsBodySystem(text)).toBe(true);
  });

  it.each([
    "A bright, tangy cooler that keeps you going through the afternoon.",
    "Creamy, lightly sweet, and an easy way to start the morning.",
    "Warming and gently spiced — the sort of thing to wind down with.",
  ])("passes %j", (text) => {
    expect(mentionsBodySystem(text)).toBe(false);
  });

  it("matches multi-word terms across a hyphen or line break", () => {
    expect(mentionsBodySystem("supports gut-health")).toBe(true);
    expect(mentionsBodySystem("good for heart\nhealth")).toBe(true);
    expect(mentionsBodySystem("helps blood-sugar balance")).toBe(true);
  });

  it("is safe on null and empty input", () => {
    expect(mentionsBodySystem(null)).toBe(false);
    expect(mentionsBodySystem("")).toBe(false);
  });
});

// QA ⑪ — 3-5 functions per ingredient.
describe("WhyItWorksDetailSchema", () => {
  const entry = (n: number) => ({
    ingredient: "Ginger",
    functions: Array.from({ length: n }, (_, i) => `function ${i}`),
  });

  it("accepts 3, 4 and 5 functions", () => {
    for (const n of [3, 4, 5]) {
      expect(WhyItWorksDetailSchema.safeParse([entry(n)]).success).toBe(true);
    }
  });

  it("rejects fewer than 3 or more than 5", () => {
    for (const n of [0, 1, 2, 6]) {
      expect(WhyItWorksDetailSchema.safeParse([entry(n)]).success).toBe(false);
    }
  });

  it("rejects an empty breakdown", () => {
    expect(WhyItWorksDetailSchema.safeParse([]).success).toBe(false);
  });
});

// Rows written before the column existed must keep rendering their prose.
describe("parseWhyItWorksDetail", () => {
  it("returns null for legacy rows rather than throwing", () => {
    for (const raw of [null, undefined, "", "some prose", {}, [{ ingredient: "x" }]]) {
      expect(parseWhyItWorksDetail(raw)).toBeNull();
    }
  });

  it("returns the parsed breakdown when valid", () => {
    const detail = [{ ingredient: "Ginger", functions: ["a", "b", "c"] }];
    expect(parseWhyItWorksDetail(detail)).toEqual(detail);
  });
});


// Token bundles are charged in USD via inline price_data.
describe("token bundle pricing", () => {
  it("formats bundle prices in dollars", async () => {
    const { formatPrice, BUNDLES } = await import("@/lib/credits");
    expect(formatPrice(499)).toBe("$4.99");
    expect(formatPrice(1999)).toBe("$19.99");
    expect(BUNDLES.every((b) => b.amount > 0)).toBe(true);
  });

  it("charges the checkout in the app currency", async () => {
    const { APP_CURRENCY } = await import("@/constants");
    expect(APP_CURRENCY).toBe("usd");
    const src = (await import("node:fs")).readFileSync(
      "actions/credits-checkout.ts",
      "utf8",
    );
    expect(src).toContain("currency: APP_CURRENCY");
    expect(src).not.toContain('currency: "gbp"');
  });
});
