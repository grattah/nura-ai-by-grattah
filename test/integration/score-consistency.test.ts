import { describe, it, expect } from "vitest";
import { hasTestDb } from "../helpers/db";
import { createClient } from "@supabase/supabase-js";
import { scoreMatch, scoreMatchForRecipes } from "@/lib/scoring/tier-server";

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

  it("scores a whole-library batch identically to small batches", async () => {
    const client = sb();
    const { data: recipeRows } = await client
      .from("recipes")
      .select("id")
      .eq("status", "approved");
    const ids = ((recipeRows ?? []) as { id: string }[]).map((r) => r.id);
    expect(
      ids.length,
      "needs a library big enough to exceed one page and one URL",
    ).toBeGreaterThan(200);

    const whole = await scoreMatchForRecipes({
      recipeIds: ids,
      conditions: [],
      goals: GOALS,
    });
    expect(whole.size, "the whole-library call must not throw or drop recipes")
      .toBe(ids.length);

    const batched = new Map<string, number>();
    for (let i = 0; i < ids.length; i += 40) {
      const part = await scoreMatchForRecipes({
        recipeIds: ids.slice(i, i + 40),
        conditions: [],
        goals: GOALS,
      });
      for (const [id, v] of part) batched.set(id, v.averagePercent);
    }

    const drift = ids.filter(
      (id) => Math.abs((whole.get(id)?.averagePercent ?? 0) - (batched.get(id) ?? 0)) > 1e-9,
    );
    expect(drift, "these recipes scored differently in a big batch").toEqual([]);
  });
});

d("category tables resolve to real categories", () => {
  it("has a category row for every v7 scoring table", async () => {
    const { CATEGORY_TABLES, categorySlugFor } = await import(
      "@/lib/scoring/tier-tables"
    );
    const { data } = await sb().from("categories").select("slug");
    const slugs = new Set(((data ?? []) as { slug: string }[]).map((c) => c.slug));

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

    expect(rowCount ?? 0).toBe((recipeCount ?? 0) * CATEGORY_TABLES.length);
  });
});
