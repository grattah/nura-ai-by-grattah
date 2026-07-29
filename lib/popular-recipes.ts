import type { SupabaseClient } from "@supabase/supabase-js";
import { oneRecipePerDrinkType } from "@/lib/drink-types";

/**
 * Most-popular recipes, one per drink type (Juice, Smoothie, Tea, …) so the
 * grid shows variety rather than the smoothies that dominate the catalogue.
 * The cards badge by drink type, so the de-duplication uses the same key.
 */
export async function fetchPopularRecipesOnePerDrinkType(
  supabase: SupabaseClient,
  maxResults = 20,
) {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("status", "approved")
    .or("shares.gt.0,saves.gt.0,comments.gt.0,likes.gt.0")
    .order("weighted_score", { ascending: false })
    .order("last_engaged_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);

  // Popularity-sorted, so the first hit per type is also the most popular one.
  return oneRecipePerDrinkType(data ?? []).slice(0, maxResults);
}
