// ⚠️ DORMANT — superseded by Category Score PRD-1.
//
// This file implements PRD-3 / v7 ingredient-tier scoring. Category Score now
// runs on the bioactivity method in lib/bioactivity-categories.ts, and Recipe
// Match Score runs on lib/scoring/match-score.ts (PRD-2). Nothing under app/,
// lib/, actions/ or components/ imports this module.
//
// Why it was retired: a tier table of 3-4 rows worth 100/20/10 can only emit
// 6-20 distinct scores per category, so 98 Weight Loss recipes all displayed
// exactly 46% and Detox showed 7 qualifying recipes out of 512. PRD-1's
// relevance-weighted average is continuous; the same library now spreads across
// 46-78 distinct scores per category and Detox qualifies 269.
//
// Kept, not deleted, so the approach can be revived. Its tests stay green.

// Calibration tables, transcribed verbatim from the PRDs.
//
//   Category Score PRD §6   — 14 categories
//   Recipe Match Score §5   — 3 conditions
//   Recipe Match Score §6   — 24 goals
//
// These are the source of truth for MaxPossible (PRD §4 Step 2), so editing a
// row changes every score in that table. Both PRDs call them "starting
// calibration examples, not exhaustive" and note that §9/§10 still want a
// nutritionist review pass — treat them as calibrated, not final.
//
// `key` is the app's own slug (category slug, condition key, or goal key from
// lib/health-profile/options.ts) so a user selection resolves without a second
// mapping layer. `label` is the PRD's own name, used for display and citations.

import type { CalibrationTable } from "./tier-score";

const t = (
  key: string,
  label: string,
  entries: [string, "primary" | "secondary" | "tertiary"][],
  penalties: [string, "flat" | "multiplier"][] = [],
): CalibrationTable => ({
  key,
  label,
  entries: entries.map(([ingredient, tier]) => ({ ingredient, tier })),
  penalties: penalties.map(([ingredient, type]) => ({ ingredient, type })),
});

// ── Category Score PRD §6 — the 14 general categories ───────────────────────

export const CATEGORY_TABLES: CalibrationTable[] = [
  t("energy", "Energy", [
    ["B vitamins", "primary"],
    ["Iron", "primary"],
    ["Ginseng", "secondary"],
    ["Maca", "tertiary"],
  ], [["Added sugar", "flat"]]),

  t("hormones", "Hormones", [
    ["Flaxseed (lignans)", "primary"],
    ["Ashwagandha", "secondary"],
    ["Omega-3", "secondary"],
    ["Maca", "tertiary"],
  ]),

  t("hydration", "Hydration", [
    ["Water content", "primary"],
    ["Electrolytes (potassium, sodium, magnesium)", "primary"],
    ["Coconut water", "secondary"],
  ], [["Caffeine", "flat"]]),

  t("fitness", "Fitness", [
    ["Protein", "primary"],
    ["Beetroot nitrates", "primary"],
    ["Electrolytes", "secondary"],
    ["Caffeine (moderate)", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("focus", "Focus", [
    ["Caffeine (moderate)", "primary"],
    ["Omega-3", "primary"],
    ["L-theanine", "secondary"],
    ["Blueberry", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("beauty", "Beauty", [
    ["Vitamin C", "primary"],
    ["Antioxidant polyphenols", "primary"],
    ["Protein / biotin sources", "secondary"],
    ["Zinc", "tertiary"],
  ], [["Added sugar", "flat"]]),

  t("sleep", "Sleep", [
    ["Magnesium", "primary"],
    ["Tart cherry (melatonin)", "primary"],
    ["Chamomile", "secondary"],
    ["Tryptophan", "secondary"],
  ], [["Caffeine", "flat"]]),

  t("detox", "Detox", [
    ["Turmeric / curcumin", "primary"],
    ["Antioxidant polyphenols", "primary"],
    ["Hydration", "secondary"],
    ["Fiber", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("gut-health", "Gut Health", [
    ["Prebiotic fiber", "primary"],
    ["Probiotics / fermented ingredients", "primary"],
    ["Polyphenols", "secondary"],
  ]),

  t("immunity", "Immunity", [
    ["Vitamin C", "primary"],
    ["Zinc", "primary"],
    ["Elderberry", "secondary"],
    ["Probiotics", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("weight-loss", "Weight Loss", [
    ["Soluble fiber", "primary"],
    ["Protein", "primary"],
    ["Thermogenic polyphenols (green tea, capsaicin)", "secondary"],
  ], [["Added sugar", "flat"], ["Energy density", "flat"]]),

  t("diabetes", "Diabetes", [
    ["Cinnamon", "primary"],
    ["Soluble fiber", "primary"],
    ["Apple cider vinegar", "secondary"],
  ], [["Added sugar", "flat"], ["Glycemic load", "flat"]]),

  t("menopause", "Menopause", [
    ["Flaxseed (lignans)", "primary"],
    ["Calcium", "secondary"],
    ["Red clover", "tertiary"],
  ], [["Caffeine", "flat"]]),

  t("heart-health", "Heart Health", [
    ["Beetroot nitrates", "primary"],
    ["Omega-3", "primary"],
    ["Potassium", "secondary"],
    ["Garlic", "secondary"],
  ], [["Sodium", "flat"], ["Saturated fat", "flat"]]),
];

// ── Match Score PRD §5 — the 3 existing conditions ──────────────────────────

export const CONDITION_TABLES: CalibrationTable[] = [
  t("pcos", "PCOS", [
    ["Cinnamon", "primary"],
    ["Spearmint", "secondary"],
    ["Omega-3", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("menopause", "Menopause", [
    ["Flaxseed (lignans)", "primary"],
    ["Calcium", "secondary"],
    ["Red clover", "tertiary"],
  ], [["Caffeine", "flat"]]),

  t("osteoporosis", "Osteoporosis", [
    ["Calcium", "primary"],
    ["Vitamin D", "primary"],
    ["Vitamin K", "secondary"],
  ]),
];

// ── Match Score PRD §6 — the 24 health goals ────────────────────────────────
// Keys match lib/health-profile/options.ts so a selection resolves directly.

export const GOAL_TABLES: CalibrationTable[] = [
  t("fat-metabolism", "Support fat metabolism", [
    ["Soluble fiber", "primary"],
    ["Protein", "primary"],
    ["Thermogenic polyphenols (green tea, capsaicin)", "secondary"],
    ["Ginger, cinnamon", "tertiary"],
  ], [["Added sugar", "flat"], ["Energy density", "flat"]]),

  t("blood-sugar", "Balance blood sugar", [
    ["Cinnamon", "primary"],
    ["Soluble fiber", "primary"],
    ["Apple cider vinegar", "secondary"],
  ], [["Added sugar", "flat"], ["Glycemic load", "flat"]]),

  t("sleep", "Sleep better", [
    ["Magnesium", "primary"],
    ["Tart cherry (melatonin)", "primary"],
    ["Tryptophan", "secondary"],
    ["Chamomile", "secondary"],
  ], [["Caffeine", "flat"]]),

  t("stress", "Reduce stress", [
    ["Ashwagandha", "primary"],
    ["L-theanine", "secondary"],
    ["Magnesium", "secondary"],
  ]),

  t("mood", "Improve my mood", [
    ["Raw cacao", "primary"],
    ["Saffron", "primary"],
    ["Banana / tryptophan", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("immunity", "Boost my immunity", [
    ["Vitamin C", "primary"],
    ["Elderberry", "primary"],
    ["Zinc", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("muscle-recovery", "Support muscle recovery", [
    ["Protein", "primary"],
    ["Tart cherry", "primary"],
    ["Electrolytes (potassium, magnesium)", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("focus", "Sharpen my focus", [
    ["Caffeine (moderate)", "primary"],
    ["Omega-3", "primary"],
    ["Blueberry", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("gut-health", "Improve gut health", [
    ["Prebiotic fiber", "primary"],
    ["Probiotics / fermented ingredients", "primary"],
  ]),

  t("reduce-bloating", "Reduce bloating", [
    ["Carminatives (ginger, peppermint, fennel)", "primary"],
    ["Low-FODMAP fiber", "secondary"],
  ], [["High-FODMAP / fermentable carbs", "flat"], ["Sodium", "flat"]]),

  t("constipation", "Relieve constipation", [
    ["Insoluble fiber, psyllium, prunes", "primary"],
    ["Hydration", "secondary"],
    ["Magnesium", "secondary"],
  ]),

  t("puffiness", "Reduce puffiness", [
    ["Potassium", "primary"],
    ["Mild diuretics (hibiscus, dandelion)", "secondary"],
  ], [["Sodium", "flat"]]),

  t("joint-comfort", "Support muscle & joint comfort", [
    ["Turmeric / curcumin", "primary"],
    ["Tart cherry", "primary"],
    ["Omega-3", "secondary"],
  ]),

  t("blood-pressure", "Lower blood pressure", [
    ["Potassium", "primary"],
    ["Beetroot nitrates", "primary"],
    ["Hibiscus", "secondary"],
  ], [["Sodium", "flat"]]),

  t("cholesterol", "Reduce cholesterol", [
    ["Soluble fiber", "primary"],
    ["Plant sterols / stanols", "primary"],
    ["Nuts / unsaturated fats", "secondary"],
  ], [["Saturated fat", "flat"], ["Trans fat", "flat"]]),

  t("iron-levels", "Improve my iron levels", [
    ["Iron (plant sources)", "primary"],
    ["Vitamin C", "secondary"],
  ], [["Calcium / dairy (if combined)", "flat"], ["Tannins (black tea)", "flat"]]),

  // The ONLY multiplier table in either PRD (Category §4, Match §4 Step 4).
  t("clear-skin", "Clear my skin", [
    ["Zinc", "primary"],
    ["Vitamin A precursors (carrot, sweet potato)", "primary"],
    ["Green tea (EGCG)", "secondary"],
  ], [["Added sugar", "multiplier"]]),

  t("hydrate-skin", "Hydrate my skin", [
    ["Water content", "primary"],
    ["Omega-3", "primary"],
    ["Vitamin E", "secondary"],
  ]),

  t("skin-brighten", "Brighten & firm my skin", [
    ["Vitamin C", "primary"],
    ["Antioxidant polyphenols", "secondary"],
    ["Protein / amino acids", "secondary"],
  ], [["Added sugar", "flat"]]),

  t("hair-growth", "Support hair growth", [
    ["Iron (plant sources)", "primary"],
    ["Protein", "primary"],
    ["Zinc", "secondary"],
  ]),

  t("testosterone", "Support testosterone", [
    ["Zinc", "primary"],
    ["Ashwagandha", "secondary"],
    ["Vitamin D", "secondary"],
  ], [["Added sugar", "flat"], ["Flaxseed / lignans", "flat"]]),

  t("libido", "Support libido", [
    ["Maca", "primary"],
    ["Beetroot (nitrates)", "primary"],
  ]),

  t("uti-yeast", "Support UTI & yeast balance", [
    ["Cranberry compounds", "primary"],
    ["Probiotics", "primary"],
  ], [["Added sugar", "flat"]]),

  t("mucus-congestion", "Relieve mucus & congestion", [
    ["Honey", "primary"],
    ["Ginger, peppermint", "secondary"],
  ]),
];

const byKey = (tables: CalibrationTable[]) =>
  new Map(tables.map((x) => [x.key, x]));

export const CATEGORY_TABLE_BY_KEY = byKey(CATEGORY_TABLES);
export const CONDITION_TABLE_BY_KEY = byKey(CONDITION_TABLES);
export const GOAL_TABLE_BY_KEY = byKey(GOAL_TABLES);


/**
 * v7 table key → the category slug stored in the database, where they differ.
 *
 * `heart-health` is the PRD's name for the table; the `categories` row has
 * always been `heart`, and it is a public URL (/categories/heart), so the slug
 * stays and the key is mapped. Any key not listed here IS its slug.
 *
 * Exported so the recompute script and its test read the same mapping — when
 * this lived in the script alone, a key that failed to resolve was skipped in
 * silence and left a whole category on stale scores.
 */
export const CATEGORY_SLUG_OVERRIDES: Record<string, string> = {
  "heart-health": "heart",
};

/** The database slug for a category table key. */
export const categorySlugFor = (key: string): string =>
  CATEGORY_SLUG_OVERRIDES[key] ?? key;
