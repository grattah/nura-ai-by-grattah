import { describe, it, expect } from "vitest";
import {
  mentionsBodySystem,
  whyItWorksIssues,
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

// Rows written before the column existed must keep rendering their prose.
describe("whyItWorksIssues — prose format (QA ⑪)", () => {
  const good = `The milk provides tryptophan, an amino acid essential for serotonin synthesis, which then converts to melatonin, a hormone crucial for regulating sleep cycles.

Ginger, rich in gingerols and shogaols, modulates serotonin receptors in the gut, promoting relaxation and accelerating gastric emptying.`;

  it("accepts multi-paragraph prose that names ingredients inline", () => {
    expect(whyItWorksIssues(good)).toEqual([]);
  });

  it("rejects the bulleted list format", () => {
    expect(whyItWorksIssues("• Ginger aids digestion\n• Milk provides tryptophan")).toContain(
      "bullets",
    );
  });

  it("rejects per-ingredient headings", () => {
    // The exact shape being moved away from: ingredient name on its own line.
    const headed = "Ginger:\nAids digestion and eases nausea.\n\nMilk:\nProvides tryptophan.";
    expect(whyItWorksIssues(headed)).toContain("headings");
  });

  it("rejects markdown bold", () => {
    expect(whyItWorksIssues("**Ginger** aids digestion.\n\nMilk helps too.")).toContain(
      "markdown",
    );
  });

  it("rejects a single block, which is the old summary shape", () => {
    expect(whyItWorksIssues("One paragraph only, however long it runs on.")).toContain(
      "single-paragraph",
    );
  });

  it("treats empty copy as an issue", () => {
    expect(whyItWorksIssues("")).toEqual(["empty"]);
    expect(whyItWorksIssues(null)).toEqual(["empty"]);
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
