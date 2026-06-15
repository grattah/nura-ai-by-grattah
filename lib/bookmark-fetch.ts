// lib/bookmarks.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const BOOKMARKS_PAGE_SIZE = 5;

export interface BookmarkedRecipe {
  bookmark_id: string;
  recipe_id: string;
  title: string;
  description: string;
  image_url: string | null;
  preview_ingredients: string[];
  bookmarked_at: string;
  likes: number;
}

function mapRow(b: any): BookmarkedRecipe {
  const r = b.recipes;
  return {
    bookmark_id: b.id,
    recipe_id: r.id,
    title: r.title,
    description: r.short_description,
    likes: r.likes,
    image_url: r.image_url,
    preview_ingredients: r.preview_ingredients ?? [],
    bookmarked_at: b.created_at,
  };
}

// `created_at` then `id` is a total order, so range pagination can't
// hand back overlapping pages when two bookmarks share a timestamp.
export async function fetchBookmarksPage(
  supabase: SupabaseClient,
  userId: string,
  pageNum: number,
  signal?: AbortSignal,
): Promise<BookmarkedRecipe[]> {
  const start = pageNum * BOOKMARKS_PAGE_SIZE;
  const end = start + BOOKMARKS_PAGE_SIZE - 1;

  let query = supabase
    .from("bookmarks")
    .select(
      `
      id,
      created_at,
      recipes (
        id,
        title,
        likes,
        short_description,
        image_url,
        preview_ingredients
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, end);

  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;

  if (error) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error(error.message);
  }

  return (data ?? []).filter((b) => b.recipes).map(mapRow);
}