import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPopularRecipesOnePerCategory(
  supabase: SupabaseClient,
  maxResults = 20,
) {
  const { data, error } = await supabase
    .from("recipes")
    .select(`*, recipe_tags ( tags (id, name, slug) )`)
    .eq("status", "approved")
    .or("shares.gt.0,saves.gt.0,comments.gt.0,likes.gt.0")
    .order("weighted_score", { ascending: false })
    .order("last_engaged_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);

  // Walk the popularity-sorted list, keep the first (most popular) recipe
  // per first-tag. Recipes with no tag are kept as-is.
  const seenTags = new Set<string>();
  const result = [];
  for (const recipe of data ?? []) {
    const firstTag = recipe.recipe_tags?.[0]?.tags?.name ?? null;
    if (firstTag !== null) {
      if (seenTags.has(firstTag)) continue;
      seenTags.add(firstTag);
    }
    result.push(recipe);
    if (result.length >= maxResults) break;
  }
  return result;
}
