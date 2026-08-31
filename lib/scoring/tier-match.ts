// Resolve a real recipe ingredient to a calibration-table row.
//
// WHY THIS EXISTS
//
// The tables and the recipe library speak different vocabularies. A table row
// is a compound class ("Turmeric / curcumin", "Vitamin C"); an ingredient is a
// shopping-list line ("1 inch fresh turmeric root", "fresh-squeezed orange
// juice"). MaxPossible is computed from the table rows, so unless real
// ingredients can actually HIT those rows, the denominator is unreachable —
// which is exactly what emptied five category pages: Detox's best recipe in the
// whole library scored 13% against a floor of 40%.
//
// The PRDs describe a hybrid, not a choice between two sources. §6 calls the
// tables "starting calibration examples", and §7 triggers the pipeline for an
// ingredient "with no tier yet on record". So:
//
//   1. an ingredient that MATCHES a table row takes that row's authored tier
//   2. anything else takes the tier the classification pipeline assigned
//
// Matching is deterministic and declared here rather than fuzzy-matched. For a
// health score, a wrong match should be findable in a diff, not an emergent
// property of a string-similarity threshold.

export interface IngredientFacts {
  name: string;
  /** USDA per-100g values, as stored on `ingredients`. */
  protein_g?: number | null;
  fiber_g?: number | null;
  potassium_mg?: number | null;
  sodium_mg?: number | null;
  calcium_dv?: number | null;
  vitamin_c_dv?: number | null;
  iron_mg?: number | null;
  iron_rich?: boolean | null;
  water_pct?: number | null;
  is_probiotic?: boolean | null;
  sat_fat_g?: number | null;
  total_sugar_g?: number | null;
  calorie_density?: number | null;
  is_added_sweetener?: boolean | null;
  /** Category PRD-3 §6 additions — null until backfilled. */
  magnesium_dv?: number | null;
  zinc_dv?: number | null;
  omega3_g?: number | null;
  tryptophan_g?: number | null;
  b_vitamin_dv?: number | null;
}

// ── Nutrient thresholds ─────────────────────────────────────────────────────
//
// "Contains a trace" is not the same as "is a source of". These are the points
// at which an ingredient contributes enough of a nutrient for the table row to
// be a fair description of it. VITAMIN_C_DV_THRESHOLD matches the value the
// bonus system already used, so the two do not disagree about what "a vitamin C
// source" means.

export const NUTRIENT_THRESHOLDS = {
  /** %DV per 100g — the FDA "good source" bar. */
  vitaminCDV: 20,
  /** g per 100g. */
  proteinG: 5,
  fiberG: 3,
  /** mg per 100g — ~4% of the 4700mg DV. */
  potassiumMg: 200,
  /** %DV per 100g. */
  calciumDV: 10,
  /** mg per 100g — roughly 10% DV for adult women. */
  ironMg: 1.8,
  /** % — a genuinely hydrating ingredient, not merely a moist one. */
  waterPct: 80,

  // ── Category PRD-3 §6 rows that previously had no data ──────────────────
  /** %DV per 100g — the FDA "good source" bar, as for calcium. */
  magnesiumDV: 10,
  zincDV: 10,
  /**
   * %DV per 100g. The FDA "excellent source" bar, applied to the HIGHEST of the
   * six B vitamins — so this reads as "an excellent source of at least one B
   * vitamin", which is what the Energy row means by "B vitamins".
   */
  bVitaminDV: 20,
  /**
   * g per 100g, ALA + EPA + DHA. Flaxseed is ~22, chia ~17, walnut ~9; leafy
   * greens carry ~0.1 and are not what the row describes.
   */
  omega3G: 0.5,
  /** g per 100g. Oats ~0.23, pumpkin seed ~0.58; a banana's ~0.01 is a trace. */
  tryptophanG: 0.05,
} as const;

type Predicate = (f: IngredientFacts) => boolean;

const has = (v: number | null | undefined, min: number) => (v ?? 0) >= min;

/**
 * Word-boundary keyword match, tolerant of plurals.
 *
 * `\bbeet\b` does not match "medium beetroots", which is exactly how the PRD's
 * own worked example (Beetroot Ginger Juice → Heart Health) failed to score:
 * the library writes ingredients as shopping-list lines, so the plural is the
 * common case, not the exception.
 */
const plural = (w: string): string =>
  // berry → berries, plus the regular -s / -es forms.
  w.endsWith("y") ? `${w.slice(0, -1)}(?:y|ies)` : `${w}(?:e?s)?`;

const named =
  (...words: string[]): Predicate =>
  (f) => {
    const n = f.name.toLowerCase();
    return words.some((w) => new RegExp(`\\b${plural(w)}\\b`, "i").test(n));
  };

const either =
  (...ps: Predicate[]): Predicate =>
  (f) => ps.some((p) => p(f));

/**
 * Table row label → "does this ingredient satisfy the row?".
 *
 * A row with no entry here can NEVER be matched — and that is expensive, not
 * free. MaxPossible (§4 Step 2) sums every row in the table whether or not it
 * is reachable, so an unmatched row permanently caps the category: Sleep and
 * Focus could not exceed 50%, and Detox showed 7 qualifying recipes out of 433.
 *
 * test/tier-score.test.ts asserts every category row has an entry here, so this
 * cannot silently regress. Adding a row to tier-tables.ts means adding a
 * matcher here in the same change.
 */
export const ROW_MATCHERS: Record<string, Predicate> = {
  // ── Nutrients we hold USDA data for ───────────────────────────────────────
  "Vitamin C": (f) => has(f.vitamin_c_dv, NUTRIENT_THRESHOLDS.vitaminCDV),
  Protein: (f) => has(f.protein_g, NUTRIENT_THRESHOLDS.proteinG),
  "Protein / biotin sources": (f) => has(f.protein_g, NUTRIENT_THRESHOLDS.proteinG),
  "Protein / amino acids": (f) => has(f.protein_g, NUTRIENT_THRESHOLDS.proteinG),
  "Soluble fiber": (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  Fiber: (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  "Prebiotic fiber": (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  "Low-FODMAP fiber": (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  Potassium: (f) => has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  Calcium: (f) => has(f.calcium_dv, NUTRIENT_THRESHOLDS.calciumDV),
  Iron: (f) => f.iron_rich === true || has(f.iron_mg, NUTRIENT_THRESHOLDS.ironMg),
  "Iron (plant sources)": (f) =>
    f.iron_rich === true || has(f.iron_mg, NUTRIENT_THRESHOLDS.ironMg),
  "Water content": (f) => has(f.water_pct, NUTRIENT_THRESHOLDS.waterPct),
  Hydration: (f) => has(f.water_pct, NUTRIENT_THRESHOLDS.waterPct),
  Electrolytes: (f) => has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  "Electrolytes (potassium, sodium, magnesium)": (f) =>
    has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  "Electrolytes (potassium, magnesium)": (f) =>
    has(f.potassium_mg, NUTRIENT_THRESHOLDS.potassiumMg),
  Probiotics: (f) => f.is_probiotic === true,
  "Probiotics / fermented ingredients": (f) => f.is_probiotic === true,

  // ── Category PRD-3 §6 rows, newly backfilled (see the migration) ──────────
  Magnesium: (f) => has(f.magnesium_dv, NUTRIENT_THRESHOLDS.magnesiumDV),
  Zinc: (f) => has(f.zinc_dv, NUTRIENT_THRESHOLDS.zincDV),
  "B vitamins": (f) => has(f.b_vitamin_dv, NUTRIENT_THRESHOLDS.bVitaminDV),
  // Omega-3 and tryptophan follow the `Iron` precedent above — nutrient data
  // when USDA reported it, a narrow named fallback when it did not.
  //
  // Measured over a 60-ingredient sample: magnesium 60/60, zinc 58/60 and the B
  // vitamins 60/60, but omega-3 only 41/60 and tryptophan 28/60. USDA panels are
  // uneven — chia's own Foundation record carries 26 nutrients including
  // magnesium and zinc but NO fatty acids, so the nutrient path alone misses the
  // single most important omega-3 ingredient in a smoothie library.
  //
  // The fallback lists are the canonical sources only. They exist to stop a
  // gap in USDA's panel reading as an absence of the nutrient, not to widen
  // what counts as a source.
  "Omega-3": either(
    (f) => has(f.omega3_g, NUTRIENT_THRESHOLDS.omega3G),
    named("flax", "flaxseed", "linseed", "chia", "walnut", "hemp",
          "salmon", "mackerel", "sardine", "algae", "algal"),
  ),
  Tryptophan: either(
    (f) => has(f.tryptophan_g, NUTRIENT_THRESHOLDS.tryptophanG),
    named("oat", "pumpkin seed", "sesame", "cashew", "tofu", "turkey", "egg"),
  ),

  // ── Named ingredients ─────────────────────────────────────────────────────
  // ── Rows USDA has no field for ────────────────────────────────────────────
  //
  // Polyphenols are thousands of distinct compounds with no single USDA entry,
  // and L-theanine is not in the database at all. Both rows are Primary or
  // Secondary in categories that were badly capped without them (Beauty and
  // Detox at 52-58%, Gut Health at 91%, Focus at 50%), so a keyword list is the
  // honest option — the alternative was leaving the row permanently dead.
  //
  // The list is deliberately confined to foods whose polyphenol content is the
  // reason they are eaten. Over-matching here inflates a health score, which is
  // worse than under-matching: it is the one direction a reader cannot detect.
  "Antioxidant polyphenols": named(
    "berry", "blueberry", "blackberry", "raspberry", "strawberry", "cranberry",
    "acai", "elderberry", "pomegranate", "grape", "cherry", "plum",
    "cacao", "cocoa", "green tea", "matcha", "hibiscus", "roselle",
    "beet", "beetroot", "turmeric", "olive",
  ),
  // Gut Health's row is the same class of compound under a shorter name; one
  // definition, aliased, so the two can never drift apart.
  Polyphenols: (f) => ROW_MATCHERS["Antioxidant polyphenols"](f),
  "L-theanine": named("green tea", "matcha", "black tea", "white tea", "tea leaf"),

  "Turmeric / curcumin": named("turmeric", "curcumin"),
  Cinnamon: named("cinnamon"),
  "Ginger, cinnamon": named("ginger", "cinnamon"),
  "Ginger, peppermint": named("ginger", "peppermint", "mint"),
  "Carminatives (ginger, peppermint, fennel)": named(
    "ginger",
    "peppermint",
    "mint",
    "fennel",
  ),
  Ashwagandha: named("ashwagandha"),
  Maca: named("maca"),
  Ginseng: named("ginseng"),
  "Flaxseed (lignans)": named("flax", "flaxseed", "linseed"),
  "Beetroot nitrates": named("beet", "beetroot"),
  "Beetroot (nitrates)": named("beet", "beetroot"),
  Garlic: named("garlic"),
  Spearmint: named("spearmint"),
  Chamomile: named("chamomile"),
  Hibiscus: named("hibiscus", "roselle"),
  "Mild diuretics (hibiscus, dandelion)": named("hibiscus", "roselle", "dandelion"),
  Elderberry: named("elderberry", "elderflower"),
  Blueberry: named("blueberry", "blueberries"),
  "Tart cherry": named("cherry", "cherries"),
  "Tart cherry (melatonin)": named("cherry", "cherries"),
  "Raw cacao": named("cacao", "cocoa"),
  Saffron: named("saffron"),
  Honey: named("honey"),
  "Coconut water": named("coconut water"),
  "Apple cider vinegar": named("apple cider vinegar", "acv"),
  "Cranberry compounds": named("cranberry", "cranberries"),
  "Red clover": named("red clover"),
  "Green tea (EGCG)": named("green tea", "matcha"),
  "Thermogenic polyphenols (green tea, capsaicin)": named(
    "green tea",
    "matcha",
    "cayenne",
    "chili",
    "chilli",
    "capsaicin",
  ),
  "Banana / tryptophan": named("banana", "bananas"),
  "Vitamin A precursors (carrot, sweet potato)": named(
    "carrot",
    "carrots",
    "sweet potato",
    "pumpkin",
    "butternut",
  ),
  "Insoluble fiber, psyllium, prunes": either(
    named("psyllium", "prune", "prunes"),
    (f) => has(f.fiber_g, NUTRIENT_THRESHOLDS.fiberG),
  ),
  "Nuts / unsaturated fats": named(
    "almond",
    "almonds",
    "walnut",
    "walnuts",
    "cashew",
    "cashews",
    "pecan",
    "peanut",
    "nut butter",
    "avocado",
  ),
  "Caffeine (moderate)": named("coffee", "espresso", "green tea", "matcha", "black tea"),

  // Deliberately NOT matched — no data and no reliable name signal, so these
  // rows are only ever reachable through a pipeline classification:
  //   Omega-3, Zinc, Magnesium, Vitamin D, Vitamin E, Vitamin K, B vitamins,
  //   Tryptophan, Antioxidant polyphenols, Polyphenols, Plant sterols / stanols
};

/**
 * The table row this ingredient satisfies for a given table, or null.
 *
 * Returns the HIGHEST-scoring matching row: an ingredient can satisfy more than
 * one (spinach is both Iron and a fibre source), and taking the best one is the
 * reading that matches the tables being written as "what makes a recipe good
 * for this".
 */
type Row = { ingredient: string; tier: "primary" | "secondary" | "tertiary" };

const RANK = { primary: 3, secondary: 2, tertiary: 1 } as const;

export function matchRow(facts: IngredientFacts, rows: Row[]): Row | null {
  let best: Row | null = null;
  for (const row of rows) {
    const match = ROW_MATCHERS[row.ingredient];
    if (!match || !match(facts)) continue;
    if (!best || RANK[row.tier] > RANK[best.tier]) best = row;
  }
  return best;
}

/**
 * Which table rows a whole recipe satisfies — each row AT MOST ONCE.
 *
 * This is the difference between a score that means something and one that
 * saturates. MaxPossible counts every row exactly once (§4 Step 2), so
 * RawSubtotal has to as well; letting each ingredient claim the same row
 * independently made a five-ingredient juice score 500 against a MaxPossible of
 * 220 for Hydration, which is not "very hydrating", it is a broken denominator.
 *
 * Where several ingredients satisfy one row, the best tier wins — the row is
 * satisfied, and by the strongest thing that satisfies it.
 */
export function matchRowsForRecipe(
  ingredients: IngredientFacts[],
  rows: Row[],
): Map<string, Row> {
  const matched = new Map<string, Row>();
  for (const facts of ingredients) {
    for (const row of rows) {
      const match = ROW_MATCHERS[row.ingredient];
      if (!match || !match(facts)) continue;
      const existing = matched.get(row.ingredient);
      if (!existing || RANK[row.tier] > RANK[existing.tier]) {
        matched.set(row.ingredient, row);
      }
    }
  }
  return matched;
}


// ── §4 Step 4: penalties ────────────────────────────────────────────────────
//
// A penalty is a plain presence check, not a tier — it carries no points and
// never enters MaxPossible. Same safe default as the scoring rows: a penalty
// with no matcher here simply never fires, because wrongly penalising a recipe
// is as damaging as wrongly rewarding one.

export const PENALTY_THRESHOLDS = {
  /** mg per 100g — above this the ingredient is a genuine sodium contributor. */
  sodiumMg: 200,
  /** g per 100g. */
  satFatG: 5,
  /** kcal per 100g — the bar for "energy dense" in a drink-led library. */
  calorieDensity: 200,
} as const;

export const PENALTY_MATCHERS: Record<string, Predicate> = {
  "Added sugar": (f) =>
    f.is_added_sweetener === true || named("sugar", "syrup", "agave", "molasses")(f),
  Sodium: (f) => has(f.sodium_mg, PENALTY_THRESHOLDS.sodiumMg) || named("salt")(f),
  "Saturated fat": (f) => has(f.sat_fat_g, PENALTY_THRESHOLDS.satFatG),
  Caffeine: named("coffee", "espresso", "green tea", "black tea", "matcha"),
  "Energy density": (f) => has(f.calorie_density, PENALTY_THRESHOLDS.calorieDensity),
  "Tannins (black tea)": named("black tea"),
  "Calcium / dairy (if combined)": named("milk", "yogurt", "yoghurt", "kefir", "cheese"),
  "Flaxseed / lignans": named("flax", "flaxseed", "linseed"),

  // ── Deliberately unmatched: Glycemic load, Trans fat, High-FODMAP ─────────
  //
  // These three PRD penalties have no honest implementation against the data we
  // hold, and a wrong one is worse than none.
  //
  // Glycemic load is the instructive case. The obvious proxy is net carbs
  // (carbs − fiber), and it is measurably wrong here: matchPenalties sees
  // per-100g facts with NO quantity, and ground cinnamon carries 70.1 g net
  // carbs per 100g while being used a gram at a time. A net-carb threshold
  // would penalise cinnamon for glycemic load inside Diabetes — the category
  // where cinnamon is the Primary row. The table would fight itself.
  //
  // Implementing these needs per-recipe quantities (glycemic load is a dose,
  // not a concentration) or a FODMAP/trans-fat data source we do not have.
  // test/tier-score.test.ts pins this list so the gap stays visible and any
  // OTHER unmatched penalty still fails.
};

/**
 * Penalties the PRDs declare that no matcher can honestly implement yet.
 * Exported so the coverage test asserts against a known list rather than
 * silently tolerating every gap. See the note above for why each is here.
 */
export const UNIMPLEMENTABLE_PENALTIES = [
  "Glycemic load",
  "Trans fat",
  "High-FODMAP / fermentable carbs",
] as const;

/** Penalty row labels this recipe triggers, deduplicated. */
export function matchPenalties(
  ingredients: IngredientFacts[],
  penalties: { ingredient: string }[],
): string[] {
  const hit = new Set<string>();
  for (const p of penalties) {
    const match = PENALTY_MATCHERS[p.ingredient];
    if (!match) continue;
    if (ingredients.some((f) => match(f))) hit.add(p.ingredient);
  }
  return [...hit];
}
