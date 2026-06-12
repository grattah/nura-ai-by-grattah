"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addComment(
  recipeId: string,
  formData: FormData,
  parentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  const content = formData.get("comment")?.toString().trim();
  if (!content) {
    return { success: false, error: "Comment cannot be empty" };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      recipe_id: recipeId,
      content,
      parent_id: parentId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert comment:", error);
    if (error.code === "42501" || error.message?.includes("row-level security")) {
      return {
        success: false,
        error: "You need an active subscription to comment.",
      };
    }
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "Comment was rejected." };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/comments?recipeId=${recipeId}`);
  return { success: true };
}