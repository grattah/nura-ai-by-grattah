import { Database } from "./database.types";

export type Tag = Pick<
  Database["public"]["Tables"]["tags"]["Row"],
  "name" | "slug" | "id" | "display_order"
>;
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];

// Per-serving nutrition facts stored in `recipes.nutrition` (jsonb). Macros are
// in grams; kcal is kilocalories.
export interface NutritionFacts {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

// Lean shape for recipe grid/card views — only the columns RecipeCard reads,
// used by category pages to avoid pulling large JSON fields (how_to_make,
// ingredients, etc.) over the wire.
export type CategoryRecipe = Pick<
  Recipe,
  "id" | "title" | "image_url" | "display_order"
> & {
  /**
   * The recipe's CategoryScore for the category being viewed
   * (recipe_categories.score). A GENERAL score, identical for every user: it
   * drives ordering and renders through SupportBadge as "68% support". It must
   * never be labelled "match" (Category PRD §6.3) — that word is reserved for
   * the personalized Recipe Match Score from computeMatchScore().
   */
  score?: number | null;
};
