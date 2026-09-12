import { Database } from "./database.types";

export type Tag = Pick<
  Database["public"]["Tables"]["tags"]["Row"],
  "name" | "slug" | "id" | "display_order"
>;
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];

export interface NutritionFacts {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export type CategoryRecipe = Pick<
  Recipe,
  "id" | "title" | "image_url" | "display_order"
> & {
  score?: number | null;
};
