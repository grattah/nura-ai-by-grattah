// actions/for-you.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { computeMatchScore } from "@/lib/scoring/match-score";

/**
 * The "For you" list: recipes ranked for one user's own profile.
 *
 * Shows the AVERAGE match across every selection, not the highest. The recipe
 * page shows the highest (PRD §8 — "Highest Match (primary display) — never the
 * average"), because there the user is looking at one recipe and wants to know
 * the best reason to drink it. A ranked list is the opposite question: which
 * recipe serves the most of what I asked for. Ranking on the highest credit
 * would put a recipe that nails one goal and ignores the other two above one
 * that serves all three.
 *
 * REVERTED to the bioactivity Match Score alongside the 12-goal picker. The
 * formula changed; the choice of number did not — average, not highest, for the
 * reason above. computeMatchScore is pure and synchronous, so the whole library
 * is scored from a single query with no per-recipe round trip.
 */
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

  // No goals AND no conditions → nothing to match against.
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
        // The displayed and sorted number are the SAME value — a list sorted by
        // one number while showing another is impossible for a user to read.
        score: match.average ?? 0,
      };
    })
    // A zero average means the recipe serves none of the user's selections;
    // "For you" is a recommendation surface, so it earns no place there.
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    recipes: scored.map((x) => ({ ...x.recipe, matchScore: x.score })),
  };
}
