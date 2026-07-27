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
   * (recipe_categories.score). Used for ORDERING only — it is not a Match Score
   * and must never be displayed as one (PRD §7.4). Cards get their match from
   * useMatchScores().
   */
  score?: number | null;
};
