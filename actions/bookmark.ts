"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleBookmark(
  recipeId: string,
): Promise<{ bookmarked: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { bookmarked: false, error: "not_authenticated" };
  }

  // Check if bookmark already exists
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existing) {
    // Remove bookmark
    await supabase.from("bookmarks").delete().eq("id", existing.id);

    revalidatePath("/bookmarks");
    revalidatePath(`/recipes/${recipeId}`);
    return { bookmarked: false };
  } else {
    // Add bookmark
    await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, recipe_id: recipeId });

    revalidatePath("/bookmarks");
    revalidatePath(`/recipes/$${recipeId}`);
    return { bookmarked: true };
  }
}

export async function isBookmarked(recipeId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  return !!data;
}
