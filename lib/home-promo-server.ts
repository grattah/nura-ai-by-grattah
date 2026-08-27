import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { HomePromo } from "@/lib/home-promo";

/**
 * The card to render, or null when there is nothing to show.
 *
 * Returns null on a missing row OR a read error: the promo is decorative, and
 * a failure here must not take the homepage down with it. The caller renders
 * nothing in that case, which is the same outcome as an empty card.
 */
export async function getHomePromo(): Promise<HomePromo | null> {
  const supabase = await createClient();

  // `as never` throughout: home_promo postdates lib/database.types.ts, which is
  // generated from the schema. Regenerating the types removes the need for it.

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
