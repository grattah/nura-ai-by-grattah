// actions/like.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

export async function toggleLike(
  recipeId: string
): Promise<{ liked: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { liked: false, error: "not_authenticated" };
  }

  // Check if the like already exists
  const { data: existing, error: selectError } = await supabase
    .from("recipe_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (selectError) {
    return { liked: false, error: "select_failed" };
  }

  if (existing) {
    // Unlike
    const { error: deleteError } = await supabase
      .from("recipe_likes")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      return { liked: true, error: "delete_failed" };
    }

    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath("/recipes/popular");
    return { liked: false };
  } else {
    // Like
    const { error: insertError } = await supabase
      .from("recipe_likes")
      .insert({ user_id: user.id, recipe_id: recipeId });

    if (insertError) {
      // Could be a unique violation if user double-clicked rapidly
      if (insertError.code === "23505") {
        // Already liked, treat as success
        return { liked: true };
      }
      return { liked: false, error: "insert_failed" };
    }

    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();

    const { data: recentActivity } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId)
      .eq("action", "liked")
      .gte("created_at", cutoff)
      .maybeSingle();

    if (!recentActivity) {
      const { error: activityError } = await supabase
        .from("activities")
        .insert({
          user_id: user.id,
          recipe_id: recipeId,
          action: "liked",
        });

      if (activityError) {
        console.error("Failed to log activity:", activityError);
      }
    }

    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath("/recipes/popular");
	revalidatePath("/community");
    return { liked: true };
  }
}

export async function isLiked(recipeId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("recipe_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  return !!data;
}
