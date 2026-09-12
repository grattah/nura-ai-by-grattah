import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildPrecautions, type IngredientPrecaution } from "./types";

/** Reads with the service role: the ingredient tables have RLS with no policies. */
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
    console.error("[precautions] read failed:", error.message);
    return [];
  }

  return buildPrecautions(
    (data ?? []) as unknown as Parameters<typeof buildPrecautions>[0],
  );
}
