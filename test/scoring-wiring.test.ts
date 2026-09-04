import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Which scorer each surface CALLS.
//
// Every other scoring test asserts the engine given inputs, so the engine can
// be perfect while a page ignores it entirely — which is exactly what happened:
// the recipe page was moved to v7 and the category and for-you pages were not,
// so one screen showed 13% (v7, live) and another 91% (v2, stale) for the same
// recipe. The suite stayed green throughout, because nothing asserted the
// wiring.
//
// These are source assertions rather than behavioural ones. That is a real
// limitation — a rename can break them — but the alternative is rendering
// server components, which this suite has no capability for, and the failure
// they catch is one users see immediately.

const read = (p: string) => readFileSync(p, "utf8");

const RECIPE_PAGE = "app/(no-chrome)/recipes/[id]/page.tsx";
const FOR_YOU = "actions/for-you.ts";
const RECOMPUTE_V7 = "scripts/recompute-category-scores.ts";
const RECOMPUTE = "scripts/recompute-categories.ts";

describe("Match Score is wired to the same engine on every live surface", () => {
  // REVERTED: the personal Match Score is the v2 bioactivity engine again,
  // alongside the 12-goal picker. The direction flipped; the guard did not.
  // What matters is that BOTH surfaces call the SAME scorer — the failure this
  // file exists for is one screen showing 13% and another 91% for the same
  // recipe, which happened because the recipe page moved engines and for-you
  // did not.
  it.each([
    ["recipe page", RECIPE_PAGE],
    ["for-you", FOR_YOU],
  ])("%s scores through computeMatchScore", (_name, path) => {
    const src = read(path);
    expect(src).toContain("computeMatchScore");
    expect(src).toContain("@/lib/scoring/match-score");
  });

  it.each([
    ["recipe page", RECIPE_PAGE],
    ["for-you", FOR_YOU],
  ])("%s does not also call the tier match engine", (_name, path) => {
    // scoreCategories/tier-tables remain in use for the CATEGORY score; only
    // the personal match number came back to v2. Calling both here is what
    // produced two different percentages for one recipe.
    const src = read(path);
    expect(src).not.toMatch(/\bscoreMatch\b/);
    expect(src).not.toMatch(/\bscoreMatchForRecipes\b/);
  });
});

describe("for-you ranks and displays the same number", () => {
  const src = read(FOR_YOU);

  it("uses the AVERAGE match, not the highest", () => {
    // PRD §8 makes highest the primary display on a DETAIL page. A ranked list
    // is the opposite question — which recipe serves most of what I asked for —
    // and ranking on the highest credit promotes a recipe that nails one goal
    // and ignores the rest.
    // v2 returns `average` on the result object; the earlier tier engine
    // called it `averagePercent`. The number shown is unchanged.
    expect(src).toMatch(/match\.average/);
    expect(src).not.toMatch(/highest\??\.percent/);
  });

  it("sorts by the same value it shows", () => {
    // A list sorted by one number while displaying another is unreadable.
    expect(src).toMatch(/sort\(\(a, b\) => b\.score - a\.score\)/);
    expect(src).toMatch(/matchScore: x\.score/);
  });

  it("drops recipes that match nothing", () => {
    expect(src).toMatch(/filter\(\(x\) => x\.score > 0\)/);
  });
});

describe("Category Score is written by the PRD-1 bioactivity path", () => {
  // Two scripts can write recipe_categories, and whichever ran last wins. That
  // is how the library ended up on v7 scores: 98 Weight Loss recipes on exactly
  // 46%, Detox qualifying 7 recipes out of 512, Hydration 466. PRD-1's
  // relevance-weighted average is continuous and gives 46-78 distinct scores per
  // category, so which writer is live is not a detail — it is the whole
  // behaviour of every category page.
  const src = read(RECOMPUTE);

  it("scores through lib/bioactivity-categories (PRD-1)", () => {
    expect(src).toContain("computeAllCategoryScores");
    expect(src).toContain("@/lib/bioactivity-categories");
  });

  it("does not score through the dormant tier engine", () => {
    expect(src).not.toMatch(/tier-tables|tier-score|tier-match/);
  });

  it("shares the §4 bonus with the Match Score rather than reimplementing it", () => {
    // Category PRD §8: "this is the SAME formula used by the Recipe Match Score
    // for the equivalent goal. Implement this calculation once […] rather than
    // maintaining two separate calculations that could drift apart."
    const lib = read("lib/bioactivity-categories.ts");
    expect(lib).toContain("@/lib/scoring/bonuses");
    expect(lib).toContain("bonusFor(");
  });

  it("keeps the v7 recompute clearly marked dormant", () => {
    // It still writes recipe_categories, so an accidental run silently reverts
    // Category Score. The banner is the only thing standing between a tidy-up
    // and a regression nobody would attribute to that command.
    expect(read(RECOMPUTE_V7)).toContain("DORMANT");
  });
});
