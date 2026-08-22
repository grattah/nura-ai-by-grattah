import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { buildPrecautions, type IngredientPrecaution } from "./types";

/**
 * The Precautions tab's contents for one recipe (PRD §4/§5).
 *
 * Reads only — the profiles are generated once per ingredient by
 * scripts/classify-ingredient-usage.ts and cached on `ingredients`, so opening
 * a recipe never triggers an LLM call. An empty array is a normal outcome and
 * the caller renders the reassuring empty state rather than hiding the tab.
 */
export async function getRecipePrecautions(
  supabase: SupabaseClient<Database>,
  recipeId: string,
): Promise<IngredientPrecaution[]> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      "ingredient_id, quantity, grams, position, ingredients(id, name, needs_usage_profile, usage_profile)",
    )
    .eq("recipe_id", recipeId);

  if (error) {
    // Precautions are additive information; a read failure must not take the
    // recipe page down with it.
    console.error("[precautions] read failed:", error.message);
    return [];
  }

  return buildPrecautions(
    (data ?? []) as unknown as Parameters<typeof buildPrecautions>[0],
  );
}
