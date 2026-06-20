// Normalized drink-type sub-sub-categories shared across the 10 wellness areas.
// Order here is the display order used for the filter pills.
export const DRINK_TYPES = [
  { slug: "juices", name: "Juices" },
  { slug: "smoothies", name: "Smoothies" },
  { slug: "teas", name: "Teas" },
  { slug: "shots", name: "Shots" },
  { slug: "shakes", name: "Shakes" },
  { slug: "water", name: "Water" },
  { slug: "drinks", name: "Drinks" },
] as const;

export type DrinkTypeSlug = (typeof DRINK_TYPES)[number]["slug"];

/**
 * Classify a recipe into a drink type from its title. Keep this rule in sync
 * with the SQL backfill in
 * supabase/migrations/20260620120000_recipe_drink_type.sql.
 * Priority: juice > smoothie > shake > shot > tea > water > (else) drinks.
 */
export function classifyDrinkType(title: string): DrinkTypeSlug {
  const t = title.toLowerCase();
  if (t.includes("juice")) return "juices";
  if (t.includes("smoothie")) return "smoothies";
  if (t.includes("shake")) return "shakes";
  if (t.includes("shot")) return "shots";
  if (t.includes("tea")) return "teas";
  if (t.includes("water")) return "water";
  return "drinks";
}

export function drinkTypeName(slug: string): string {
  return DRINK_TYPES.find((d) => d.slug === slug)?.name ?? "Drinks";
}
