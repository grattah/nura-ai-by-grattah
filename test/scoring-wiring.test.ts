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
const RECOMPUTE = "scripts/recompute-category-scores.ts";

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

describe("stored category scores stay consistent with the display floor", () => {
  const src = read(RECOMPUTE);

  it("writes an integer, because the column is one", () => {
    // recipe_categories.score is `integer`; writing 25.6 failed the whole
    // recompute with "invalid input syntax for type integer".
    expect(src).toContain("Math.round(");
  });

  it("qualifies on the value it stores, not the raw percent", () => {
    // Qualifying on the unrounded value would let a recipe display "40%" while
    // being filtered out of its own category page, or the reverse.
    expect(src).toMatch(/qualified:\s*score >= DISPLAY_FLOOR_PERCENT/);
  });

  it("scores against the v7 tables", () => {
    expect(src).toContain("tier-tables");
  });
});
