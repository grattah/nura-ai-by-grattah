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

describe("v2 scoring is not reachable from any live surface", () => {
  it.each([
    ["recipe page", RECIPE_PAGE],
    ["for-you", FOR_YOU],
  ])("%s does not call computeMatchScore", (_name, path) => {
    expect(read(path)).not.toContain("computeMatchScore");
  });

  it("the recipe page scores through the tier engine", () => {
    const src = read(RECIPE_PAGE);
    expect(src).toContain("scoreMatch");
    expect(src).toContain("@/lib/scoring/tier-server");
  });

  it("for-you scores through the tier engine", () => {
    const src = read(FOR_YOU);
    expect(src).toContain("scoreMatchForRecipes");
    expect(src).toContain("@/lib/scoring/tier-server");
  });
});

describe("for-you ranks and displays the same number", () => {
  const src = read(FOR_YOU);

  it("uses the AVERAGE match, not the highest", () => {
    // PRD §8 makes highest the primary display on a DETAIL page. A ranked list
    // is the opposite question — which recipe serves most of what I asked for —
    // and ranking on the highest credit promotes a recipe that nails one goal
    // and ignores the rest.
    expect(src).toContain("averagePercent");
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
