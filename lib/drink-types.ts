// Normalized drink-type sub-sub-categories shared across the wellness areas.
// Order here is the display order used for the filter pills and for the
// one-per-type de-duplication on the Trending / Popular feeds.
//
// Slugs stay PLURAL — they're persisted in `recipes.drink_type` and returned by
// the category_drink_types RPC, so renaming them would need a data migration.
// Display names are singular, which is what the pills and card badges show.
export const DRINK_TYPES = [
  { slug: "juices", name: "Juice" },
  { slug: "smoothies", name: "Smoothie" },
  { slug: "teas", name: "Tea" },
  { slug: "drinks", name: "Drink" },
  { slug: "lassis", name: "Lassi" },
  { slug: "coolers", name: "Cooler" },
  { slug: "shots", name: "Shot" },
  { slug: "sorbets", name: "Sorbet" },
  { slug: "milks", name: "Milk" },
  { slug: "shakes", name: "Shake" },
  { slug: "bowls", name: "Bowl" },
  { slug: "water", name: "Water" },
] as const;

export type DrinkTypeSlug = (typeof DRINK_TYPES)[number]["slug"];

/**
 * Badge colours per drink type. Mirrors the shape of CATEGORY_CONFIG's
 * bgColorBadge/textColorBadge so the card badge markup only changes where it
 * reads its colours from.
 */
export interface DrinkTypeBadge {
  bgColor: string;
  textColor: string;
}

const DRINK_TYPE_BADGES: Record<string, DrinkTypeBadge> = {
  juices: { bgColor: "oklch(0.9635 0.0202 58.07)", textColor: "oklch(0.6906 0.1941 45.46)" },
  smoothies: { bgColor: "oklch(0.9393 0.0187 265.98)", textColor: "oklch(0.4983 0.1745 261.68)" },
  teas: { bgColor: "oklch(0.9333 0.0201 150.09)", textColor: "oklch(0.5285 0.0838 182.07)" },
  drinks: { bgColor: "oklch(0.927 0.0633 154.07)", textColor: "oklch(0.5581 0.1674 145.91)" },
  lassis: { bgColor: "oklch(0.9396 0.049 194.77)", textColor: "oklch(0.452 0.0714 194.92)" },
  coolers: { bgColor: "oklch(0.8461 0.0512 253.91)", textColor: "oklch(0.4467 0.1098 246.46)" },
  shots: { bgColor: "oklch(0.9082 0.0482 33.97)", textColor: "oklch(0.294 0.0761 13.37)" },
  sorbets: { bgColor: "oklch(0.9174 0.0295 317.24)", textColor: "oklch(0.5191 0.115 306.86)" },
  milks: { bgColor: "oklch(0.9589 0.0381 102.25)", textColor: "oklch(0.5413 0.0996 75.9)" },
  shakes: { bgColor: "oklch(0.9454 0.0175 293.13)", textColor: "oklch(0.4534 0.1917 283.85)" },
  bowls: { bgColor: "oklch(0.9648 0.0195 125.82)", textColor: "oklch(0.5033 0.0871 157.19)" },
  water: { bgColor: "oklch(0.9454 0.0138 247.97)", textColor: "oklch(0.473 0.1022 248.42)" },
};

const DEFAULT_DRINK_TYPE_BADGE: DrinkTypeBadge = {
  bgColor: "oklch(0.963 0.0068 145.52)",
  textColor: "oklch(0.5285 0.0838 182.07)",
};

export function getDrinkTypeBadge(slug?: string | null): DrinkTypeBadge {
  return (slug && DRINK_TYPE_BADGES[slug]) || DEFAULT_DRINK_TYPE_BADGE;
}

// Title keywords → drink type, in PRIORITY order (first match wins). The order
// is load-bearing:
//   • `shake` precedes `milk`, so "Banana Milkshake" is a shake;
//   • `smoothie` precedes `milk`, so "Almond Milk Smoothie" is a smoothie;
//   • `milk` and `water` sit near the bottom because they show up incidentally
//     in titles that are really something else.
// Keep in sync with the SQL backfill in
// supabase/migrations/20260620120000_recipe_drink_type.sql and its successors.
const CLASSIFY_RULES: ReadonlyArray<readonly [string, DrinkTypeSlug]> = [
  ["juice", "juices"],
  ["smoothie", "smoothies"],
  ["shake", "shakes"],
  ["lassi", "lassis"],
  ["sorbet", "sorbets"],
  ["cooler", "coolers"],
  ["shot", "shots"],
  // Spoonable items. After smoothie/shake so "Apple Banana Oats Smoothie"
  // stays a smoothie; deliberately no bare "oat" rule, which would swallow
  // "Homemade Vanilla Oat Milk".
  ["bowl", "bowls"],
  ["yogurt", "bowls"],
  ["yoghurt", "bowls"],
  ["parfait", "bowls"],
  ["pudding", "bowls"],
  ["tea", "teas"],
  ["latte", "milks"],
  ["milk", "milks"],
  ["water", "water"],
];

/** Classify a recipe into a drink type from its title. */
export function classifyDrinkType(title: string): DrinkTypeSlug {
  const t = title.toLowerCase();
  for (const [keyword, slug] of CLASSIFY_RULES) {
    if (t.includes(keyword)) return slug;
  }
  return "drinks";
}

export function drinkTypeName(slug: string): string {
  return DRINK_TYPES.find((d) => d.slug === slug)?.name ?? "Drink";
}

/**
 * Keep only the first recipe of each drink type, preserving input order. The
 * Trending / Popular feeds badge recipes by drink type, so de-duplicating by
 * the same key is what stops the grid showing six "SMOOTHIE" cards (smoothies
 * dominate the catalogue). Shared so both feeds can't drift apart.
 */
export function oneRecipePerDrinkType<T extends { drink_type?: string | null }>(
  recipes: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of recipes) {
    const key = r.drink_type ?? "drinks";
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
