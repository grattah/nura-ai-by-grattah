import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { HomePromo } from "@/lib/home-promo";

export async function getHomePromo(): Promise<HomePromo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("home_promo" as never)
    .select("body, recipe_id, updated_at")
    .eq("id" as never, true as never)
    .maybeSingle();

  if (error) {
    console.error("[home-promo] read failed:", error.message);
    return null;
  }

  const row = data as { body: string; recipe_id: string | null; updated_at: string } | null;
  if (!row?.body?.trim()) return null;

  return {
    body: row.body,
    recipeId: row.recipe_id,
    updatedAt: row.updated_at,
  };
}
