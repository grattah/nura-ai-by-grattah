"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleCommentLike(
  commentId: string,
  recipeId: string
): Promise<{ liked: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: "not_authenticated" };

  const { data: existing } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("comment_id", commentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("id", existing.id);

    if (error) return { liked: true, error: "delete_failed" };

    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath(`/comments`);
    return { liked: false };
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .insert({ user_id: user.id, comment_id: commentId });

    if (error) {
      if (error.code === "23505") return { liked: true };
      return { liked: false, error: "insert_failed" };
    }

    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath(`/comments`);
    return { liked: true };
  }
}