"use server";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

export async function toggleBookmark(
  recipeId: string
): Promise<{ bookmarked: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { bookmarked: false, error: "not_authenticated" };
  }

  // Check if bookmark already exists
  const { data: existing, error: selectError } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (selectError) {
    return { bookmarked: false, error: "select_failed" };
  }

  if (existing) {
    // Remove bookmark
    const { error: deleteError } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      return { bookmarked: true, error: "delete_failed" };
    }

    revalidatePath("/bookmarks");
    revalidatePath(`/recipes/${recipeId}`);
    return { bookmarked: false };
  } else {
    // Add bookmark
    const { error: insertError } = await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, recipe_id: recipeId });

    if (insertError) {
      return { bookmarked: false, error: "insert_failed" };
    }

    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();

    const { data: recentActivity } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId)
      .eq("action", "bookmarked")
      .gte("created_at", cutoff)
      .maybeSingle();

    if (!recentActivity) {
      const { error: activityError } = await supabase
        .from("activities")
        .insert({
          user_id: user.id,
          recipe_id: recipeId,
          action: "bookmarked",
        });

      if (activityError) {
        console.error("Failed to log activity:", activityError);
      }
    }

    revalidatePath("/bookmarks");
    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath("/community");
    return { bookmarked: true };
  }
}

export async function isBookmarked(recipeId: string): Promise<boolean> {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  return !!data;
}

export async function getBookmarkedIds(
  recipeIds: string[],
): Promise<Set<string>> {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user || recipeIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select("recipe_id")
    .eq("user_id", user.id)
    .in("recipe_id", recipeIds);

  return new Set((data ?? []).map((b) => b.recipe_id));
}
