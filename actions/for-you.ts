// actions/for-you.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { scoreMatchForRecipes } from "@/lib/scoring/tier-server";

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
 * Scoring is bulk — two queries for the whole library rather than two per
 * recipe.
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
    .select("*")
    .eq("status", "approved");

  if (error) {
    console.error("[for-you] recipe load failed:", error.message);
    return { recipes: [] };
  }

  const rows = recipes ?? [];
  if (rows.length === 0) return { recipes: [] };

  const scores = await scoreMatchForRecipes({
    recipeIds: rows.map((r) => r.id as string),
    conditions: profile.conditions ?? [],
    goals: profile.goals ?? [],
  });

  const scored = rows
    .map((r) => ({
      recipe: r,
      // The displayed and sorted number are the SAME value — a list sorted by
      // one number while showing another is impossible for a user to read.
      score: scores.get(r.id as string)?.averagePercent ?? 0,
    }))
    // A zero average means the recipe serves none of the user's selections;
    // "For you" is a recommendation surface, so it earns no place there.
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    recipes: scored.map((x) => ({ ...x.recipe, matchScore: x.score })),
  };
}
