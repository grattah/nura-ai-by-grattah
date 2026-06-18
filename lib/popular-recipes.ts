import type { SupabaseClient } from "@supabase/supabase-js";

export const POPULAR_PAGE_SIZE = 4;

export async function fetchPopularRecipesPage(
  supabase: SupabaseClient,
  pageNum: number,
  signal?: AbortSignal,
) {
  const start = pageNum * POPULAR_PAGE_SIZE;
  const end = start + POPULAR_PAGE_SIZE - 1;

  let query = supabase
    .from("recipes")
    .select(`*, recipe_tags ( tags (id, name) )`)
    .eq("status", "approved")
    .or("shares.gt.0,saves.gt.0,comments.gt.0,likes.gt.0")
    .order("weighted_score", { ascending: false })
    .order("last_engaged_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(start, end);

  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error(error.message);
  }
  return data ?? [];
}