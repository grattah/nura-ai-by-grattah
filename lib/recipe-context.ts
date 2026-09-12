interface RecipeContextInput {
  short_description?: string | null;
  ingredients?: unknown;
  how_to_make?: unknown;
  why_it_works?: string | null;
  inside_tip?: string | null;
}

export function buildRecipeContext(recipe: RecipeContextInput): string {
  const parts: string[] = [];

  if (recipe.short_description) {
    parts.push(`Summary: ${recipe.short_description}`);
  }

  const ingredients = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as Array<{ label?: string }>)
        .map((i) => i?.label?.trim())
        .filter((l): l is string => !!l)
    : [];
  if (ingredients.length) {
    parts.push(`Ingredients: ${ingredients.join(", ")}`);
  }

  const steps = Array.isArray(recipe.how_to_make)
    ? (recipe.how_to_make as Array<{ step?: string | number; instruction?: string }>)
        .map((s) => s?.instruction?.trim() && `${s.step}. ${s.instruction.trim()}`)
        .filter((s): s is string => !!s)
    : [];
  if (steps.length) {
    parts.push(`Method:\n${steps.join("\n")}`);
  }

  if (recipe.why_it_works) {
    parts.push(`Why it works: ${recipe.why_it_works}`);
  }
  if (recipe.inside_tip) {
    parts.push(`Inside tip: ${recipe.inside_tip}`);
  }

  return parts.join("\n\n");
}
