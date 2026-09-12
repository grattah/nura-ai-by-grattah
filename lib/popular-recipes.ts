import type { SupabaseClient } from "@supabase/supabase-js";
import { oneRecipePerDrinkType } from "@/lib/drink-types";

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

  return oneRecipePerDrinkType(data ?? []).slice(0, maxResults);
}
