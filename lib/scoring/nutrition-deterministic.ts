import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { rollupRecipe, type ResolvedIngredient } from "@/lib/usda/rollup";
import { resolveRecipeIngredients } from "@/lib/usda/resolve";
import { recordUsage, usageTokens } from "@/lib/usage-server";
import { classifyTrack, classifyPreparation } from "./track";
import { scoreFromInput, rollupToScoringInput, bnsColumns } from "./score-recipe";
import type { BnsResult } from "./base-nutrition";

type Admin = SupabaseClient<Database>;

// Row shape of recipe_ingredients joined to its ingredient (per-100 nutrients).
interface JoinedIngredientRow {
  grams: number | null;
  ingredients: {
    name: string;
    nova_group: number | null;
    is_fvl: boolean;
    iron_rich: boolean;
    is_added_sweetener: boolean;
    is_sweetener_nnutritive?: boolean;
    energy_kcal: number | null;
    protein_g: number | null;
    total_fat_g: number | null;
    sat_fat_g: number | null;
    carbs_g: number | null;
    fiber_g: number | null;
    total_sugar_g: number | null;
    sodium_mg: number | null;
    calcium_dv: number | null;
    vitamin_c_dv: number | null;
    iron_mg: number | null;
    water_pct: number | null;
    potassium_mg: number | null;
    is_probiotic?: boolean;
  } | null;
}

export interface DeterministicNutrition {
  bns: BnsResult;
  // recipes column patch (BNS-v2 + scoring input + derived recipe fields).
  patch: Record<string, unknown>;
}

/**
 * Deterministically score a recipe's Base Nutrition Score from its resolved USDA
 * ingredients. If the recipe hasn't been USDA-resolved yet (e.g. freshly
 * generated), it resolves on demand here (first-view lazy scoring). Returns null
 * only when the recipe has no resolvable ingredients at all.
 */
export async function scoreNutritionFromDb(
  admin: Admin,
  recipe: {
    id: string;
    title: string;
    ingredients: unknown;
    how_to_make: unknown;
    servings?: number | null;
  },
): Promise<DeterministicNutrition | null> {
  const { data } = await admin
    .from("recipe_ingredients" as never)
    .select(
      "grams, ingredients(name, nova_group, is_fvl, iron_rich, is_added_sweetener, is_sweetener_nnutritive, energy_kcal, protein_g, total_fat_g, sat_fat_g, carbs_g, fiber_g, total_sugar_g, sodium_mg, calcium_dv, vitamin_c_dv, iron_mg, water_pct, potassium_mg, is_probiotic)" as never,
    )
    .eq("recipe_id" as never, recipe.id as never);

  const rows = (data as unknown as JoinedIngredientRow[] | null) ?? [];
  let resolved: ResolvedIngredient[] = rows
    .filter((r) => r.ingredients && r.grams != null)
    .map((r) => {
      const ing = r.ingredients!;
      return {
        name: ing.name,
        grams: Number(r.grams),
        nova_group: ing.nova_group ?? 3,
        is_fvl: ing.is_fvl,
        iron_rich: ing.iron_rich,
        is_added_sweetener: ing.is_added_sweetener,
        is_sweetener_nnutritive: ing.is_sweetener_nnutritive ?? false,
        energy_kcal: ing.energy_kcal ?? 0,
        protein_g: ing.protein_g ?? 0,
        total_fat_g: ing.total_fat_g ?? 0,
        sat_fat_g: ing.sat_fat_g ?? 0,
        carbs_g: ing.carbs_g ?? 0,
        fiber_g: ing.fiber_g ?? 0,
        total_sugar_g: ing.total_sugar_g ?? 0,
        sodium_mg: ing.sodium_mg ?? 0,
        calcium_dv: ing.calcium_dv ?? 0,
        vitamin_c_dv: ing.vitamin_c_dv ?? 0,
        iron_mg: ing.iron_mg ?? 0,
        water_pct: ing.water_pct ?? 0,
        potassium_mg: ing.potassium_mg ?? 0,
        is_probiotic: ing.is_probiotic ?? false,
      };
    });

  // Not USDA-resolved yet (freshly generated recipe) → resolve on demand.
  if (resolved.length === 0) {
    const out = await resolveRecipeIngredients(
      admin as unknown as SupabaseClient,
      { id: recipe.id, ingredients: recipe.ingredients },
      {
        onClassifyUsage: (usage) =>
          void recordUsage({
            provider: "anthropic",
            model: "claude-haiku-4-5",
            surface: "usda-classify",
            billed: false,
            ...usageTokens(usage as never),
          }),
      },
    );
    resolved = out.resolved;
  }

  if (resolved.length === 0) return null;

  const servings = recipe.servings ?? 1;
  const rollup = rollupRecipe(resolved, servings);
  const track = classifyTrack(recipe.title);
  const prepText = Array.isArray(recipe.how_to_make)
    ? (recipe.how_to_make as Array<{ instruction?: string }>)
        .map((s) => s?.instruction ?? "")
        .join(" ")
    : "";
  const preparation = classifyPreparation(track, prepText);

  const scoringInput = rollupToScoringInput(rollup);
  const bns = scoreFromInput(scoringInput, track, preparation);

  const patch: Record<string, unknown> = {
    ...bnsColumns(bns),
    track,
    preparation,
    nutrition_scoring: scoringInput,
    servings,
    water_content_pct: rollup.water_content_pct,
    iron_rich: rollup.iron_rich,
    // PRD v2 bonus inputs, PER SERVING — "20% of your daily vitamin C" is only a
    // meaningful claim about a serving, not about 100 g of recipe.
    vitamin_c_dv: rollup.perServing.vitamin_c_dv,
    potassium_mg: rollup.perServing.potassium_mg,
    sodium_mg: rollup.perServing.sodium_mg,
    probiotic: rollup.probiotic,
    // Per-serving display nutrition (USDA-derived), replacing the LLM estimate.
    nutrition: {
      kcal: Math.round(rollup.perServing.energy_kcal),
      protein: Math.round(rollup.perServing.protein_g),
      fat: Math.round(rollup.perServing.total_fat_g),
      carbs: Math.round(rollup.perServing.carbs_g),
      fiber: Math.round(rollup.perServing.fiber_g),
    },
  };

  return { bns, patch };
}

/** Persist the deterministic nutrition patch. */
export async function writeNutritionV2(
  admin: Admin,
  recipeId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await admin
    .from("recipes")
    .update(patch as never)
    .eq("id", recipeId);
}
