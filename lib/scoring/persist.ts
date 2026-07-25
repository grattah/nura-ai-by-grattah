import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { WELLNESS_SUPPORTS } from "@/lib/wellness-score";
import {
  computeAllCategoryScores,
  type TraceOverride,
} from "@/lib/bioactivity-categories";

type Admin = SupabaseClient<Database>;

// Mirrors the write logic in scripts/score-supports.mjs: replace a recipe's
// recipe_tags (23 bioactivities) + recipe_categories (all 14 with qualified/
// via_trace) and persist the LLM trace overrides.
export async function writeBioactivityAndCategories(
  admin: Admin,
  recipeId: string,
  scoresBySlug: Record<string, number>,
  overrides: TraceOverride[],
): Promise<void> {
  const [{ data: tags }, { data: cats }] = await Promise.all([
    admin.from("tags").select("id, slug"),
    admin.from("categories").select("id, slug"),
  ]);
  const tagIdBySlug = new Map(
    (tags ?? []).map((t) => [t.slug as string, t.id as string]),
  );
  const catIdBySlug = new Map(
    (cats ?? []).map((c) => [c.slug as string, c.id as string]),
  );

  // Bioactivities → recipe_tags (replace).
  const tagRows = WELLNESS_SUPPORTS.filter((b) => tagIdBySlug.has(b.slug)).map(
    (b) => ({
      recipe_id: recipeId,
      tag_id: tagIdBySlug.get(b.slug)!,
      score: scoresBySlug[b.slug] ?? 0,
    }),
  );
  await admin.from("recipe_tags").delete().eq("recipe_id", recipeId);
  if (tagRows.length) {
    await admin.from("recipe_tags").insert(tagRows as never);
  }

  // Categories → recipe_categories (all 14, replace).
  const categories = computeAllCategoryScores(scoresBySlug, overrides);
  const catRows = categories
    .filter((c) => catIdBySlug.has(c.category))
    .map((c) => ({
      recipe_id: recipeId,
      category_id: catIdBySlug.get(c.category)!,
      score: c.score,
      via_trace: c.viaTrace,
      qualified: c.qualified,
    }));
  await admin.from("recipe_categories").delete().eq("recipe_id", recipeId);
  if (catRows.length) {
    await admin.from("recipe_categories").insert(catRows as never);
  }

  // Persist the trace overrides for cheap category re-tuning later.
  await admin
    .from("recipes")
    .update({ category_overrides: overrides } as never)
    .eq("id", recipeId);
}

// The legacy LLM nutrition writer (writeNutrition) moved to
// archive/old-scoring/ — the deterministic path writes via
// lib/scoring/nutrition-deterministic.ts (writeNutritionV2).
