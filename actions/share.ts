// actions/share.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function logShare(recipeId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_recipe_shares", {
    rid: recipeId,
  });
  if (error) {
    // Don't surface to the user; a failed count shouldn't block their share.
    console.error("Failed to log share:", error);
  }
}