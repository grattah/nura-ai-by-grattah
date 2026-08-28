import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildPrecautions, type IngredientPrecaution } from "./types";

/**
 * The Precautions tab's contents for one recipe (PRD §4/§5).
 *
 * Reads only — the profiles are generated once per ingredient by
 * scripts/classify-ingredient-usage.ts and cached on `ingredients`, so opening
 * a recipe never triggers an LLM call. An empty array is a normal outcome and
 * the caller renders the reassuring empty state rather than hiding the tab.
 *
 * Service role, not the caller's cookie client. `ingredients` and
 * `recipe_ingredients` have RLS enabled with NO policies, so the authenticated
 * and anon roles both read ZERO rows from them — which rendered the empty
 * state on every recipe while 65 fully-populated profiles sat in the table.
 * Same reason lib/scoring/tier-server.ts uses it.
 *
 * Nothing here is user-scoped: a usage profile is public reference information
 * about an ingredient, identical for every reader, so there is no per-user data
 * for the elevated client to leak.
 */
export async function getRecipePrecautions(
  recipeId: string,
): Promise<IngredientPrecaution[]> {
  const supabase = createServiceRoleClient();

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
