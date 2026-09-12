import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

const RECIPE_PAGE = "app/(no-chrome)/recipes/[id]/page.tsx";
const FOR_YOU = "actions/for-you.ts";
const RECOMPUTE_V7 = "scripts/recompute-category-scores.ts";
const RECOMPUTE = "scripts/recompute-categories.ts";

describe("Match Score is wired to the same engine on every live surface", () => {
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
    const src = read(path);
    expect(src).not.toMatch(/\bscoreMatch\b/);
    expect(src).not.toMatch(/\bscoreMatchForRecipes\b/);
  });
});

describe("for-you ranks and displays the same number", () => {
  const src = read(FOR_YOU);

  it("uses the AVERAGE match, not the highest", () => {
    expect(src).toMatch(/match\.average/);
    expect(src).not.toMatch(/highest\??\.percent/);
  });

  it("sorts by the same value it shows", () => {
    expect(src).toMatch(/sort\(\(a, b\) => b\.score - a\.score\)/);
    expect(src).toMatch(/matchScore: x\.score/);
  });

  it("drops recipes that match nothing", () => {
    expect(src).toMatch(/filter\(\(x\) => x\.score > 0\)/);
  });
});

describe("Category Score is written by the PRD-1 bioactivity path", () => {
  const src = read(RECOMPUTE);

  it("scores through lib/bioactivity-categories (PRD-1)", () => {
    expect(src).toContain("computeAllCategoryScores");
    expect(src).toContain("@/lib/bioactivity-categories");
  });

  it("does not score through the dormant tier engine", () => {
    expect(src).not.toMatch(/tier-tables|tier-score|tier-match/);
  });

  it("shares the §4 bonus with the Match Score rather than reimplementing it", () => {
    const lib = read("lib/bioactivity-categories.ts");
    expect(lib).toContain("@/lib/scoring/bonuses");
    expect(lib).toContain("bonusFor(");
  });

  it("keeps the v7 recompute clearly marked dormant", () => {
    expect(read(RECOMPUTE_V7)).toContain("DORMANT");
  });
});
