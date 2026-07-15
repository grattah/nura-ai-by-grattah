// Recipe category population from bioactivity scores (Nuko Category Population
// Logic PRD). A static 23×14 relevance matrix maps each bioactivity to each
// category; a recipe's CategoryScore is the relevance-weighted average of its
// bioactivity scores over the bioactivities that are relevant (≥50) to that
// category. A recipe qualifies for a category at CategoryScore ≥ 50, or below
// it via the LLM "trace exception". Keep in sync with the inlined copy in
// scripts/score-supports.mjs.

// Category slugs, in the column order of the RELEVANCE matrix below.
export const CATEGORY_SLUGS = [
  "energy",
  "hormones",
  "hydration",
  "fitness",
  "focus",
  "beauty",
  "sleep",
  "detox",
  "gut-health",
  "immunity",
  "weight-loss",
  "diabetes",
  "menopause",
  "heart",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

// A bioactivity contributes to a category when its relevance is ≥ this.
export const RELEVANCE_THRESHOLD = 50;
// A recipe qualifies for a category when its CategoryScore is ≥ this.
export const QUALIFY_THRESHOLD = 40;
// Minimum LLM override confidence for the trace exception to admit a recipe.
export const TRACE_OVERRIDE_CONFIDENCE = 80;

// Ingredients that exert strong biological effects in small quantities — the
// basis for the trace exception (surfaced in the scoring prompt).
export const TRACE_INGREDIENTS = [
  "turmeric",
  "ginger",
  "cinnamon",
  "cloves",
  "black pepper",
  "matcha",
  "saffron",
  "moringa",
  "spirulina",
  "medicinal mushrooms",
];

// Relevance % of each bioactivity (row) to each category (column, CATEGORY_SLUGS
// order). Reasoned starting point per the PRD appendix — tunable over time.
export const RELEVANCE: Record<string, number[]> = {
  "antioxidant-cellular-protection": [50, 20, 15, 35, 40, 70, 10, 55, 20, 50, 15, 25, 15, 40],
  "inflammation-support": [20, 20, 10, 40, 25, 30, 15, 25, 45, 55, 35, 45, 15, 50],
  "immune-support": [20, 10, 10, 15, 10, 15, 10, 15, 35, 95, 10, 10, 5, 10],
  "natural-defense-support": [10, 5, 5, 10, 5, 5, 5, 10, 15, 90, 5, 5, 5, 5],
  "heart-circulation-support": [40, 15, 35, 75, 30, 20, 10, 15, 10, 15, 20, 40, 30, 95],
  "cholesterol-lipid-balance": [15, 15, 5, 35, 10, 5, 5, 10, 10, 5, 20, 40, 25, 85],
  "blood-sugar-support": [75, 25, 10, 55, 45, 15, 15, 10, 20, 10, 70, 95, 10, 40],
  "weight-metabolic-support": [90, 40, 25, 85, 20, 10, 15, 20, 30, 15, 95, 65, 25, 35],
  "gut-digestive-support": [25, 20, 20, 15, 20, 30, 15, 45, 95, 35, 45, 25, 10, 15],
  "microbiome-support": [15, 15, 10, 10, 20, 20, 10, 25, 90, 30, 30, 20, 5, 10],
  "liver-detox-support": [30, 35, 25, 15, 15, 35, 10, 95, 25, 20, 25, 20, 15, 15],
  "kidney-fluid-balance-support": [15, 10, 95, 30, 10, 25, 10, 65, 10, 10, 15, 25, 10, 20],
  "brain-cognitive-support": [55, 25, 15, 20, 95, 5, 25, 10, 20, 10, 10, 10, 15, 10],
  "mood-emotional-balance": [45, 65, 10, 20, 60, 15, 55, 10, 30, 15, 20, 15, 50, 10],
  "stress-resilience-support": [40, 60, 10, 25, 55, 15, 65, 10, 15, 25, 20, 15, 30, 20],
  "sleep-relaxation-support": [25, 45, 10, 20, 50, 20, 95, 5, 10, 25, 20, 15, 55, 15],
  "pain-comfort-support": [5, 10, 5, 50, 5, 5, 25, 5, 5, 5, 5, 5, 10, 5],
  "temperature-balance-support": [10, 30, 60, 25, 5, 5, 30, 5, 5, 15, 10, 5, 70, 5],
  "hormonal-balance-support": [30, 95, 5, 20, 20, 40, 45, 15, 15, 10, 35, 15, 95, 10],
  "bone-joint-support": [5, 25, 10, 60, 5, 5, 5, 5, 5, 5, 5, 5, 50, 5],
  "skin-health-support": [5, 35, 45, 10, 5, 95, 5, 25, 15, 10, 5, 10, 30, 5],
  "healthy-aging-support": [20, 20, 10, 20, 15, 80, 10, 15, 10, 15, 10, 15, 25, 20],
  "cellular-wellness-support": [85, 15, 40, 45, 30, 55, 10, 40, 10, 20, 25, 15, 15, 15],
};

export interface TraceOverride {
  category: string;
  ingredient?: string;
  confidence: number;
}

export interface CategoryResult {
  category: CategorySlug;
  score: number; // 0–100, rounded
  qualified: boolean;
  viaTrace: boolean;
}

/**
 * Relevance-weighted average of the recipe's bioactivity scores over the
 * bioactivities relevant (≥ RELEVANCE_THRESHOLD) to `category`. Returns 0 when
 * no bioactivity is relevant.
 */
export function calculateCategoryScore(
  scoresBySlug: Record<string, number>,
  category: CategorySlug,
): number {
  const col = CATEGORY_SLUGS.indexOf(category);
  if (col < 0) return 0;
  let weighted = 0;
  let weight = 0;
  for (const [bioSlug, relevances] of Object.entries(RELEVANCE)) {
    const w = relevances[col] ?? 0;
    if (w < RELEVANCE_THRESHOLD) continue;
    const s = scoresBySlug[bioSlug] ?? 0;
    weighted += s * w;
    weight += w;
  }
  return weight > 0 ? weighted / weight : 0;
}

/**
 * All 14 categories with the recipe's CategoryScore and flags:
 * - `viaTrace`: below `QUALIFY_THRESHOLD` but admitted by a trace override
 *   clearing `TRACE_OVERRIDE_CONFIDENCE`.
 * - `qualified`: `score ≥ QUALIFY_THRESHOLD` OR `viaTrace`.
 * Scores are the real (possibly sub-threshold) values, so trace-admitted recipes
 * rank below regular qualifiers. Non-qualifying scores are retained for future use.
 */
export function computeAllCategoryScores(
  scoresBySlug: Record<string, number>,
  overrides: TraceOverride[] = [],
): CategoryResult[] {
  const overrideByCategory = new Map<string, number>();
  for (const o of overrides) {
    if (!o || typeof o.category !== "string") continue;
    const prev = overrideByCategory.get(o.category) ?? 0;
    overrideByCategory.set(o.category, Math.max(prev, o.confidence ?? 0));
  }

  return CATEGORY_SLUGS.map((category) => {
    const raw = calculateCategoryScore(scoresBySlug, category);
    const passesScore = raw >= QUALIFY_THRESHOLD;
    const viaTrace =
      !passesScore &&
      (overrideByCategory.get(category) ?? 0) >= TRACE_OVERRIDE_CONFIDENCE;
    return {
      category,
      score: Math.round(raw),
      qualified: passesScore || viaTrace,
      viaTrace,
    };
  });
}

/** Only the categories a recipe qualifies for (subset of computeAllCategoryScores). */
export function computeRecipeCategories(
  scoresBySlug: Record<string, number>,
  overrides: TraceOverride[] = [],
): CategoryResult[] {
  return computeAllCategoryScores(scoresBySlug, overrides).filter(
    (c) => c.qualified,
  );
}
