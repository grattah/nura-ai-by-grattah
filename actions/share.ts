"use server";

import { createClient } from "@/lib/supabase/server";

export async function logShare(recipeId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_recipe_shares", {
    rid: recipeId,
  });
  if (error) {
    console.error("Failed to log share:", error);
  }
}