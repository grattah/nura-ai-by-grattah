import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { WELLNESS_SUPPORTS } from "@/lib/wellness-score";
import { computeAllCategoryScores } from "@/lib/bioactivity-categories";
import { maxesForTrack } from "@/lib/scoring/match-metrics";
import type { BonusContext } from "@/lib/scoring/bonuses";

type Admin = SupabaseClient<Database>;

/** Builds the Category Score bonus context from stored nutrient columns. */
export async function recipeBonusContext(
  admin: Admin,
  recipeId: string,
): Promise<BonusContext | undefined> {
  const { data } = await admin
    .from("recipes")
    .select(
      "track, sugar_points, salt_points, sat_fat_points, energy_points, fiber_points, protein_points, iron_rich, water_content_pct, vitamin_c_dv, potassium_mg, sodium_mg, probiotic, final_score_10",
    )
    .eq("id", recipeId)
    .maybeSingle();

  const r = data as Record<string, unknown> | null;
  if (!r || r.final_score_10 == null) return undefined;

  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  return {
    points: {
      sugar: num(r.sugar_points),
      salt: num(r.salt_points),
      satFat: num(r.sat_fat_points),
      energy: num(r.energy_points),
      fiber: num(r.fiber_points),
      protein: num(r.protein_points),
    },
    maxes: maxesForTrack((r.track as string) ?? "Solid Food"),
    ironRich: !!r.iron_rich,
    probiotic: !!r.probiotic,
    vitaminCDV: num(r.vitamin_c_dv),
    waterContentPercent: num(r.water_content_pct),
    sodiumMg: num(r.sodium_mg),
    potassiumMg: num(r.potassium_mg),
  };
}

/** Replaces a recipe's bioactivity scores and category rows. */
export async function writeBioactivityAndCategories(
  admin: Admin,
  recipeId: string,
  scoresBySlug: Record<string, number>,
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

  const bonusCtx = await recipeBonusContext(admin, recipeId);
  const categories = computeAllCategoryScores(scoresBySlug, bonusCtx);
  const catRows = categories
    .filter((c) => catIdBySlug.has(c.category))
    .map((c) => ({
      recipe_id: recipeId,
      category_id: catIdBySlug.get(c.category)!,
      score: c.score,
      qualified: c.qualified,
    }));
  await admin.from("recipe_categories").delete().eq("recipe_id", recipeId);
  if (catRows.length) {
    await admin.from("recipe_categories").insert(catRows as never);
  }
}

