// actions/for-you.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { computeMatchScore } from "@/lib/scoring/match-score";

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
    .eq("status", "approved")
	.not("final_score", "is", null);

  const scored = (recipes ?? [])
    .map((r) => {
      const bioBySlug: Record<string, number> = {};
      for (const rt of r.recipe_tags ?? []) {
        if (rt.tags?.slug && rt.score != null)
          bioBySlug[rt.tags.slug] = rt.score;
      }
      const match = computeMatchScore({
        bioBySlug,
        points: {
          sugar: r.sugar_points ?? 0,
          salt: r.salt_points ?? 0,
          satFat: r.sat_fat_points ?? 0,
          energy: r.energy_points ?? 0,
          fiber: r.fiber_points ?? 0,
          protein: r.protein_points ?? 0,
        },
        track: r.track ?? "Solid Food",
        ironRich: !!r.iron_rich,
        waterContentPercent: r.water_content_pct ?? 0,
        probiotic: !!r.probiotic,
        vitaminCDV: r.vitamin_c_dv ?? 0,
        sodiumMg: r.sodium_mg ?? 0,
        potassiumMg: r.potassium_mg ?? 0,
        conditions: profile.conditions ?? [],
        goals: profile.goals ?? [],
      });
      return { recipe: r, score: match?.highest?.percent ?? 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  console.log("[for-you] after filter/sort:", scored.length);
  return { recipes: scored.map((x) => ({ ...x.recipe, matchScore: x.score })), };
}
