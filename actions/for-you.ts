"use server";

import { createClient } from "@/lib/supabase/server";
import { computeMatchScore } from "@/lib/scoring/match-score";

/** Recipes ranked by the user's average match score. */
export async function getTopMatches(limit: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { recipes: [] };

  const { data: profile } = await supabase
    .from("health_profiles")
    .select("goals, conditions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || (!profile.goals?.length && !profile.conditions?.length)) {
    return { recipes: [] };
  }

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("*, recipe_tags(score, tags(slug))")
    .eq("status", "approved");

  if (error) {
    console.error("[for-you] recipe load failed:", error.message);
    return { recipes: [] };
  }

  const rows = recipes ?? [];
  if (rows.length === 0) return { recipes: [] };

  const scored = rows
    .map((r) => {
      const recipe = r as typeof r & {
        recipe_tags?: { score: number | null; tags: { slug: string } | null }[];
      };
      const bioBySlug: Record<string, number> = {};
      for (const rt of recipe.recipe_tags ?? []) {
        if (rt.tags?.slug && rt.score != null) bioBySlug[rt.tags.slug] = rt.score;
      }
      const match = computeMatchScore({
        bioBySlug,
        points: {
          sugar: recipe.sugar_points ?? 0,
          salt: recipe.salt_points ?? 0,
          satFat: recipe.sat_fat_points ?? 0,
          energy: recipe.energy_points ?? 0,
          fiber: recipe.fiber_points ?? 0,
          protein: recipe.protein_points ?? 0,
        },
        track: recipe.track ?? "Solid Food",
        ironRich: !!recipe.iron_rich,
        waterContentPercent: recipe.water_content_pct ?? 0,
        conditions: profile.conditions ?? [],
        goals: profile.goals ?? [],
      });
      return {
        recipe: r,
        score: match.average ?? 0,
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    recipes: scored.map((x) => ({ ...x.recipe, matchScore: x.score })),
  };
}
