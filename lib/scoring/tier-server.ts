import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";
import {
  combineMatch,
  FLAT_PENALTY,
  type CalibrationTable,
  type MatchSelection,
  type TierScore,
  TIER_POINTS,
  type Tier,
} from "./tier-score";
import {
  CATEGORY_TABLE_BY_KEY,
  CONDITION_TABLE_BY_KEY,
  GOAL_TABLE_BY_KEY,
} from "./tier-tables";
import { penaltiesByOutcome } from "./tier-classify";
// import the SAME function rather than keeping a second copy (Category PRD §8).
import { scoreFromRaw } from "./tier-score";
export { scoreFromRaw };
import {
  matchRowsForRecipe,
  matchPenalties,
  type IngredientFacts,
} from "./tier-match";

export interface PresentIngredient {
  id: string;
  name: string;
}

/** A recipe's qualifying ingredients (listed with their own quantity). */
export async function getPresentIngredients(recipeId: string): Promise<FactRow[]> {
  // Service role: ingredients and recipe_ingredients have RLS with no policies.
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      "quantity, grams, ingredients(id, name, protein_g, fiber_g, potassium_mg, sodium_mg, calcium_dv, vitamin_c_dv, iron_mg, iron_rich, water_pct, is_probiotic, sat_fat_g, total_sugar_g, calorie_density, is_added_sweetener)",
    )
    .eq("recipe_id", recipeId)
    .gt("grams", 0);

  if (error) {
    console.error("[tier-server] ingredient read failed:", error.message);
    return [];
  }

  const seen = new Set<string>();
  const out: FactRow[] = [];
  for (const row of (data ?? []) as unknown as {
    quantity: number | null;
    ingredients: FactRow | null;
  }[]) {
    if (row.quantity == null || row.quantity <= 0) continue;
    const ing = row.ingredients;
    if (!ing?.id || !ing.name || seen.has(ing.id)) continue;
    seen.add(ing.id);
    out.push(ing);
  }
  return out;
}

export type RawByOutcome = Map<string, number>;

type FactRow = IngredientFacts & { id: string };

/** Cached tiers per ingredient, paged past the 1,000-row cap. */
export async function getTiersByIngredient(
  ingredientIds: string[],
): Promise<Map<string, Map<string, Tier>>> {
  const byIngredient = new Map<string, Map<string, Tier>>();
  if (ingredientIds.length === 0) return byIngredient;

  const supabase = createServiceRoleClient();

  // Paged: PostgREST silently truncates responses at 1,000 rows.
  let data: unknown[];
  try {
    data = await fetchAll<unknown>((from, to) =>
      supabase
        .from("ingredient_tiers" as never)
        .select("ingredient_id, outcome, tier")
        .in("ingredient_id" as never, ingredientIds as never)
        .not("tier", "is", null)
        .order("ingredient_id", { ascending: true })
        .order("outcome", { ascending: true })
        .range(from, to) as never,
    );
  } catch (e) {
    console.error(
      "[tier-server] tier read failed:",
      e instanceof Error ? e.message : e,
    );
    return byIngredient;
  }

  for (const row of data as {
    ingredient_id: string;
    outcome: string;
    tier: Tier;
  }[]) {
    if (!byIngredient.has(row.ingredient_id)) {
      byIngredient.set(row.ingredient_id, new Map());
    }
    byIngredient.get(row.ingredient_id)!.set(row.outcome, row.tier);
  }
  return byIngredient;
}

export interface RecipeScoringInput {
  recipeId: string;
  penaltyFactor?: number;
}

export async function scoreCategories(
  input: RecipeScoringInput,
): Promise<Map<string, TierScore>> {
  const ingredients = await getPresentIngredients(input.recipeId);

  const out = new Map<string, TierScore>();
  for (const [key, table] of CATEGORY_TABLE_BY_KEY) {
    out.set(
      key,
      scoreFromRaw(
        table,
        ingredients,
        matchPenalties(ingredients, table.penalties),
        input.penaltyFactor,
      ),
    );
  }
  return out;
}

export interface MatchCreditView {
  key: string;
  kind: "condition" | "goal";
  prd: string;
  label: string;
  credit: number;
  percent: number;
}

export interface MatchScoreView {
  highest: MatchCreditView | null;
  breakdown: MatchCreditView[];
  average: number | null;
  creditCount: number;
}

const toView = (s: MatchSelection): MatchCreditView => ({
  key: s.key,
  kind: s.kind,
  prd: s.label,
  label: s.label,
  credit: s.score.credit,
  percent: s.score.percent,
});

export async function scoreMatch(
  input: RecipeScoringInput & { conditions: string[]; goals: string[] },
): Promise<MatchScoreView> {
  const ingredients = await getPresentIngredients(input.recipeId);

  const selections: MatchSelection[] = [];
  const seen = new Set<string>();

  const push = (
    key: string,
    kind: "condition" | "goal",
    table: CalibrationTable | undefined,
  ) => {
    if (!table) return;
    if (seen.has(table.label)) return;
    seen.add(table.label);
    selections.push({
      key,
      label: table.label,
      kind,
      score: scoreFromRaw(
        table,
        ingredients,
        matchPenalties(ingredients, table.penalties),
        input.penaltyFactor,
      ),
    });
  };

  for (const key of input.conditions) push(key, "condition", CONDITION_TABLE_BY_KEY.get(key));
  for (const key of input.goals) push(key, "goal", GOAL_TABLE_BY_KEY.get(key));

  const combined = combineMatch(selections);
  return {
    highest: combined.highest ? toView(combined.highest) : null,
    breakdown: combined.breakdown.map(toView),
    average: combined.averagePercent,
    creditCount: selections.length,
  };
}

export { penaltiesByOutcome };


export interface RecipeMatchSummary {
  recipeId: string;
  averagePercent: number;
  highest: MatchCreditView | null;
  breakdown: MatchCreditView[];
}

/** Match scores for many recipes in two queries. */
export async function scoreMatchForRecipes(input: {
  recipeIds: string[];
  conditions: string[];
  goals: string[];
  penaltyFactor?: number;
}): Promise<Map<string, RecipeMatchSummary>> {
  const out = new Map<string, RecipeMatchSummary>();
  if (input.recipeIds.length === 0) return out;

  const tables = [
    ...input.conditions.map((k) => ["condition", k, CONDITION_TABLE_BY_KEY.get(k)] as const),
    ...input.goals.map((k) => ["goal", k, GOAL_TABLE_BY_KEY.get(k)] as const),
  ].filter((t) => !!t[2]);

  if (tables.length === 0) {
    for (const id of input.recipeIds) {
      out.set(id, { recipeId: id, averagePercent: 0, highest: null, breakdown: [] });
    }
    return out;
  }

  const supabase = createServiceRoleClient();

  // Chunked: a long .in() list exceeds the ~16KB URL limit and fails as 'fetch failed'.
  const CHUNK = 150;
  const idChunks: string[][] = [];
  for (let i = 0; i < input.recipeIds.length; i += CHUNK) {
    idChunks.push(input.recipeIds.slice(i, i + CHUNK));
  }

  const riRows: {
    recipe_id: string;
    ingredient_id: string | null;
    quantity: number | null;
    ingredients: FactRow | null;
  }[] = [];

  for (const chunk of idChunks) {
    const rows = await fetchAll<{
      recipe_id: string;
      ingredient_id: string | null;
      quantity: number | null;
      ingredients: FactRow | null;
    }>((from, to) =>
      supabase
        .from("recipe_ingredients")
        .select(
        "recipe_id, ingredient_id, quantity, grams, ingredients(id, name, protein_g, fiber_g, potassium_mg, sodium_mg, calcium_dv, vitamin_c_dv, iron_mg, iron_rich, water_pct, is_probiotic, sat_fat_g, total_sugar_g, calorie_density, is_added_sweetener)",
      )
        .in("recipe_id", chunk)
        .gt("grams", 0)
        // A stable ORDER BY is required when paging, or rows repeat or vanish.
        .order("recipe_id", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to) as never,
    );
    riRows.push(...rows);
  }

  const byRecipe = new Map<string, FactRow[]>();
  const allIngredientIds = new Set<string>();
  for (const row of riRows) {
    if (row.quantity == null || row.quantity <= 0 || !row.ingredients?.id) continue;
    byRecipe.set(row.recipe_id, [...(byRecipe.get(row.recipe_id) ?? []), row.ingredients]);
    allIngredientIds.add(row.ingredients.id);
  }


  for (const recipeId of input.recipeIds) {
    const ingredients = byRecipe.get(recipeId) ?? [];
    const selections: MatchSelection[] = tables.map(([kind, key, table]) => ({
      key,
      label: table!.label,
      kind,
      score: scoreFromRaw(
        table!,
        ingredients,
        matchPenalties(ingredients, table!.penalties),
        input.penaltyFactor,
      ),
    }));

    const combined = combineMatch(selections);
    out.set(recipeId, {
      recipeId,
      averagePercent: combined.averagePercent ?? 0,
      highest: combined.highest ? toView(combined.highest) : null,
      breakdown: combined.breakdown.map(toView),
    });
  }

  return out;
}
