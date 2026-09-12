"use server";

import { createClient } from "@/lib/supabase/server";

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

export async function logRecipeView(recipeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();

  const { data: recent } = await supabase
    .from("activities")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .eq("action", "viewed")
    .gte("created_at", cutoff)
    .maybeSingle();

  if (recent) return;

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    recipe_id: recipeId,
    action: "viewed",
  });

  if (error) {
    console.error("Failed to log recipe view:", error);
  }
}