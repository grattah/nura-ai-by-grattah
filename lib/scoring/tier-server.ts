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
import {
  matchRowsForRecipe,
  matchPenalties,
  type IngredientFacts,
} from "./tier-match";

// Scoring reads only cached tiers — never an LLM call at request time (§7).
//
// DECISION: hybrid. Table rows win where an ingredient satisfies one; the
// classification pipeline covers everything else.
//
// This is what §6 and §7 describe together — §6 calls the tables "starting
// calibration examples", and §7 fires the pipeline for an ingredient "with no
// tier yet on record". Neither source alone works:
//
//   • pipeline-only  — MaxPossible is built from the tables' Primary rows, but
//     §7.1's strict Primary bar almost never awards Primary to a whole food.
//     Numerator and denominator end up on different scales, and five category
//     pages render empty (Detox's best recipe in the library scored 13%).
//   • table-only     — the tables are explicitly not exhaustive, so every
//     ingredient they do not name would score zero.
//
// Each row counts AT MOST ONCE per recipe, matching MaxPossible, which counts
// each row exactly once (§4 Step 2). Letting every ingredient claim the same
// row independently made a five-ingredient juice score 500 against a Hydration
// MaxPossible of 220.

export interface PresentIngredient {
  id: string;
  name: string;
}

/**
 * A recipe's qualifying ingredients (PRD §3): listed with their own quantity,
 * not a garnish, optional topping, or trace mention. `grams > 0` is the same
 * rule the USDA roll-up applies, so a row that contributes nothing to any other
 * score contributes nothing here either.
 */
export async function getPresentIngredients(recipeId: string): Promise<FactRow[]> {
  // Service role, not the caller's cookie client. `ingredients` and
  // `recipe_ingredients` have RLS enabled with NO policies, so the
  // authenticated role reads zero rows from both — which silently scored every
  // recipe against an empty ingredient list and returned 0% for everything.
  // This is derived server-side data, not something the user queries, so the
  // fix belongs here rather than in a policy that widens access for everyone.
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

/** outcome label → total tier points contributed by this recipe. */
export type RawByOutcome = Map<string, number>;

/** Ingredient facts the row matchers need, alongside the id. */
type FactRow = IngredientFacts & { id: string };

/**
 * Sum cached tier points per outcome for a set of ingredients.
 *
 * One query for the whole recipe rather than one per outcome — 40 outcomes ×
 * every ingredient would otherwise be 40 round-trips per page render.
 */
export async function getTiersByIngredient(
  ingredientIds: string[],
): Promise<Map<string, Map<string, Tier>>> {
  const byIngredient = new Map<string, Map<string, Tier>>();
  if (ingredientIds.length === 0) return byIngredient;

  const supabase = createServiceRoleClient();

  // PAGED. There are 40 outcomes per ingredient, so a whole-library read is
  // thousands of rows — far past PostgREST's 1,000-row default, which returns
  // a prefix with NO error. Unpaged, most ingredients came back with no tiers
  // at all and scored near zero: the SAME recipe returned 71.2% scored alone
  // (10 ingredients, one page) and 58.0% inside a 199-recipe batch.
  //
  // Ordered, because a paged read without a stable sort has no guarantee that
  // one page continues where the last stopped.
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

/**
 * Score one calibration table from a pre-summed subtotal.
 *
 * MaxPossible comes from the CALIBRATION TABLE, not from whatever the pipeline
 * has tiered — §4 Step 2 says "every Primary + Secondary + Tertiary ingredient
 * in that category's table". That keeps the denominator fixed, which is what
 * makes a score comparable between recipes and stable over time; deriving it
 * from the tier cache instead would make every recipe's score fall as the
 * library grew, with no change to the recipe.
 *
 * The consequence is that RawSubtotal CAN exceed MaxPossible once the pipeline
 * has tiered more ingredients than the table lists, so it is capped. Without
 * the cap a recipe would display above 100%.
 */
function scoreFromRaw(
  table: CalibrationTable,
  ingredients: FactRow[],
  tiersByIngredient: Map<string, Map<string, Tier>>,
  penaltiesPresent: string[],
  penaltyFactor?: number,
): TierScore {
  const max = table.entries.reduce((s, e) => s + TIER_POINTS[e.tier], 0);

  // 1. Table rows this recipe satisfies — each counted once.
  const matchedRows = matchRowsForRecipe(ingredients, table.entries);
  let subtotal = 0;
  for (const row of matchedRows.values()) subtotal += TIER_POINTS[row.tier];

  // 2. Ingredients that matched no row fall through to their classified tier.
  for (const ing of ingredients) {
    if (matchRowsForRecipe([ing], table.entries).size > 0) continue;
    const t = tiersByIngredient.get(ing.id)?.get(table.label);
    if (t) subtotal += TIER_POINTS[t];
  }

  const capped = Math.min(subtotal, max);
  const score1to10 = max > 0 ? 1 + (capped / max) * 9 : 1;

  const penaltySet = new Set(penaltiesPresent.map((p) => p.trim().toLowerCase()));
  const applied = table.penalties.filter((p) =>
    penaltySet.has(p.ingredient.trim().toLowerCase()),
  );

  let finalScore = score1to10;
  if (applied.some((p) => p.type === "multiplier")) {
    finalScore = score1to10 * (penaltyFactor ?? 1);
  }
  const flat = applied.filter((p) => p.type === "flat").length;
  if (flat > 0) finalScore -= FLAT_PENALTY * flat;
  finalScore = Math.max(1, finalScore);

  const credit = (finalScore - 1) / 9;
  return {
    rawSubtotal: capped,
    maxPossible: max,
    score1to10,
    finalScore,
    credit,
    percent: credit * 100,
    penaltiesApplied: applied.map((p) => p.ingredient),
  };
}

export interface RecipeScoringInput {
  recipeId: string;
  /**
   * §4 Step 4, multiplier tables only (Clear my skin). 1.0 down to ~0.5.
   * Penalties themselves are derived from the recipe's own ingredients.
   */
  penaltyFactor?: number;
}

/** Category Score for every one of the 14 categories (PRD §4/§5). */
export async function scoreCategories(
  input: RecipeScoringInput,
): Promise<Map<string, TierScore>> {
  const ingredients = await getPresentIngredients(input.recipeId);
  const tiers = await getTiersByIngredient(ingredients.map((i) => i.id));

  const out = new Map<string, TierScore>();
  for (const [key, table] of CATEGORY_TABLE_BY_KEY) {
    out.set(
      key,
      scoreFromRaw(
        table,
        ingredients,
        tiers,
        matchPenalties(ingredients, table.penalties),
        input.penaltyFactor,
      ),
    );
  }
  return out;
}

/**
 * One flattened credit, shaped exactly like the v2 MatchCredit so the existing
 * NutritionScore UI renders it without changes.
 */
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

/** Recipe Match Score for one user's selections (PRD §4/§8). */
export async function scoreMatch(
  input: RecipeScoringInput & { conditions: string[]; goals: string[] },
): Promise<MatchScoreView> {
  const ingredients = await getPresentIngredients(input.recipeId);
  const tiers = await getTiersByIngredient(ingredients.map((i) => i.id));

  const selections: MatchSelection[] = [];
  const seen = new Set<string>();

  const push = (
    key: string,
    kind: "condition" | "goal",
    table: CalibrationTable | undefined,
  ) => {
    if (!table) return;
    // Several picker keys can share one table (the three skin goals). Counting
    // it once stops that outcome being weighted three times in the average.
    if (seen.has(table.label)) return;
    seen.add(table.label);
    selections.push({
      key,
      label: table.label,
      kind,
      score: scoreFromRaw(
        table,
        ingredients,
        tiers,
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


// ── Bulk scoring for list pages ─────────────────────────────────────────────

export interface RecipeMatchSummary {
  recipeId: string;
  /** PRD §8 — the average across every selection, as a percentage. */
  averagePercent: number;
  /** PRD §8 — the single highest credit, kept for the detail page. */
  highest: MatchCreditView | null;
  breakdown: MatchCreditView[];
}

/**
 * Match Score for MANY recipes at once.
 *
 * scoreMatch() issues two queries per recipe, which is fine for a detail page
 * and ruinous for a list of 243. This reads every ingredient and every tier in
 * two paged passes, then scores in memory.
 *
 * Paged deliberately: recipe_ingredients is already past PostgREST's 1,000-row
 * default, and an unpaged read returns a prefix with no error — which would
 * silently score later recipes against no ingredients at all.
 */
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

  // Nothing the user selected maps to a table — every recipe scores nothing,
  // and saying so explicitly beats returning an empty map the caller has to
  // interpret.
  if (tables.length === 0) {
    for (const id of input.recipeIds) {
      out.set(id, { recipeId: id, averagePercent: 0, highest: null, breakdown: [] });
    }
    return out;
  }

  const supabase = createServiceRoleClient();

  const riRows = await fetchAll<{
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
      .in("recipe_id", input.recipeIds)
      .gt("grams", 0)
      // A STABLE sort is mandatory when paging. Without an ORDER BY, Postgres
      // gives no guarantee that page 2 continues where page 1 stopped — rows
      // get repeated and others dropped. That silently truncated some recipes'
      // ingredient lists and scored them low: the same recipe returned 71.2%
      // when scored alone (one page) and 58.0% in a 199-recipe batch (two).
      .order("recipe_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to) as never,
  );

  const byRecipe = new Map<string, FactRow[]>();
  const allIngredientIds = new Set<string>();
  for (const row of riRows) {
    // PRD §3 — listed with its own quantity, not a garnish or trace mention.
    if (row.quantity == null || row.quantity <= 0 || !row.ingredients?.id) continue;
    byRecipe.set(row.recipe_id, [...(byRecipe.get(row.recipe_id) ?? []), row.ingredients]);
    allIngredientIds.add(row.ingredients.id);
  }

  const tiers = await getTiersByIngredient([...allIngredientIds]);

  for (const recipeId of input.recipeIds) {
    const ingredients = byRecipe.get(recipeId) ?? [];
    const selections: MatchSelection[] = tables.map(([kind, key, table]) => ({
      key,
      label: table!.label,
      kind,
      score: scoreFromRaw(
        table!,
        ingredients,
        tiers,
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
