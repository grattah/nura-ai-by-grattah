import { describe, it, expect } from "vitest";
import { hasTestDb } from "../helpers/db";
import { createClient } from "@supabase/supabase-js";
import { scoreMatch, scoreMatchForRecipes } from "@/lib/scoring/tier-server";

// Match Score PRD §8, consistency rule:
//
//   "every screen showing a personal match percentage must use this same
//    calculation — a recipe must never show two different personalized
//    percentages on two different screens."
//
// That rule was broken in production. The recipe page (scoreMatch, one recipe)
// showed 71%, while for-you (scoreMatchForRecipes, 199 recipes) showed 58% for
// the SAME recipe and the SAME profile.
//
// The cause was a silent read truncation, not a scoring difference:
// getTiersByIngredient was unpaged, and PostgREST caps a response at 1,000 rows
// and returns the prefix WITHOUT an error. Scoring one recipe reads ~10
// ingredients × 40 outcomes = 400 rows and fits; scoring the library reads
// thousands, so most ingredients came back with no tiers and scored near zero.
//
// Every existing test scored ONE recipe at a time, so none of them could see
// it. These deliberately run both paths over a realistic batch and compare.

const d = hasTestDb ? describe : describe.skip;

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

const GOALS = ["immunity", "skin-brighten", "clear-skin"];

d("a recipe scores the same alone as in a batch", () => {
  it("agrees between scoreMatch and scoreMatchForRecipes across the library", async () => {
    const client = sb();
    const { data } = await client
      .from("recipes")
      .select("id, title")
      .eq("status", "approved");

    const recipes = (data ?? []) as { id: string; title: string }[];
    expect(
      recipes.length,
      "needs a realistic library — a handful of recipes fits in one page and cannot catch truncation",
    ).toBeGreaterThan(50);

    const bulk = await scoreMatchForRecipes({
      recipeIds: recipes.map((r) => r.id),
      conditions: [],
      goals: GOALS,
    });

    // Spot-check across the range rather than all 199 — each single score is
    // two round-trips, and a truncation bug shows up on any recipe whose
    // ingredients fell past the cut.
    const sample = [recipes[0], recipes[Math.floor(recipes.length / 2)], recipes.at(-1)!];

    for (const recipe of sample) {
      const single = await scoreMatch({
        recipeId: recipe.id,
        conditions: [],
        goals: GOALS,
      });
      const batched = bulk.get(recipe.id)!;

      expect(
        batched.averagePercent,
        `${recipe.title}: for-you and the recipe page disagree`,
      ).toBeCloseTo(single.average ?? 0, 6);

      expect(
        batched.highest?.percent ?? 0,
        `${recipe.title}: highest credit differs between paths`,
      ).toBeCloseTo(single.highest?.percent ?? 0, 6);
    }
  });

  it("reads every tier for a whole-library batch, not the first page", async () => {
    const client = sb();
    const { data: recipeRows } = await client
      .from("recipes")
      .select("id")
      .eq("status", "approved");
    const ids = ((recipeRows ?? []) as { id: string }[]).map((r) => r.id);

    const bulk = await scoreMatchForRecipes({
      recipeIds: ids,
      conditions: [],
      goals: GOALS,
    });

    // Truncation shows up as a mass of zeros: ingredients whose tiers were cut
    // contribute nothing. Before the fix this was 148; after, 184.
    const scored = [...bulk.values()].filter((v) => v.averagePercent > 0).length;
    expect(
      scored / ids.length,
      "most of the library should score for a three-goal profile",
    ).toBeGreaterThan(0.8);
  });
});

// ── Every scoring table must reach a real category page ─────────────────────
//
// The recompute resolved a v7 table key to a category row by slug and skipped
// silently when it could not. `heart-health` (the PRD's name) never matched the
// `heart` slug the database has always used, so Heart Health sat on its v2
// scores through a full recompute while the other 13 categories were rewritten.
//
// The only visible symptom was arithmetic in the script's own output —
// "243 recipes × 14 categories = 3159 rows", where 3159 is 243 × 13.
d("category tables resolve to real categories", () => {
  it("has a category row for every v7 scoring table", async () => {
    const { CATEGORY_TABLES, categorySlugFor } = await import(
      "@/lib/scoring/tier-tables"
    );
    const { data } = await sb().from("categories").select("slug");
    const slugs = new Set(((data ?? []) as { slug: string }[]).map((c) => c.slug));

    // The same mapping the recompute uses — imported, not copied, so the test
    // cannot pass against a mapping the script does not actually apply.
    const unresolved = CATEGORY_TABLES.map((t) => t.key).filter(
      (key) => !slugs.has(categorySlugFor(key)),
    );
    expect(
      unresolved,
      "these tables would be skipped by the recompute and keep stale scores",
    ).toEqual([]);
  });

  it("writes a row for every recipe-category pair, not 13 of 14", async () => {
    const { CATEGORY_TABLES } = await import("@/lib/scoring/tier-tables");
    const client = sb();
    const { count: recipeCount } = await client
      .from("recipes")
      .select("id", { count: "exact", head: true });
    const { count: rowCount } = await client
      .from("recipe_categories")
      .select("recipe_id", { count: "exact", head: true });

    // A category missing entirely shows up as a shortfall of one whole recipe's
    // worth of rows per category.
    expect(rowCount ?? 0).toBe((recipeCount ?? 0) * CATEGORY_TABLES.length);
  });
});
