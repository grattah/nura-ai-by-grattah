import { bonusFor, type BonusContext } from "@/lib/scoring/bonuses";

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

export const RELEVANCE_THRESHOLD = 50;
export const QUALIFY_THRESHOLD = 40;
export const STRONG_THRESHOLD = 60;

export type SupportTier = "strong" | "moderate" | "none";

export function supportTier(score: number): SupportTier {
  if (score >= STRONG_THRESHOLD) return "strong";
  if (score >= QUALIFY_THRESHOLD) return "moderate";
  return "none";
}

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

export interface CategoryResult {
  category: CategorySlug;
  score: number;
  qualified: boolean;
  tier: SupportTier;
}

/** Relevance-weighted bioactivity average for a category (§3). */
export function categoryBioSubtotal(
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

/** min(100, BioSubtotal + bonus × 100) (§4). */
export function calculateCategoryScore(
  scoresBySlug: Record<string, number>,
  category: CategorySlug,
  bonusCtx?: BonusContext,
): number {
  const subtotal = categoryBioSubtotal(scoresBySlug, category);
  if (!bonusCtx) return subtotal;
  return Math.min(100, subtotal + bonusFor(category, bonusCtx) * 100);
}

/** Scores all 14 categories with their tier and qualification. */
export function computeAllCategoryScores(
  scoresBySlug: Record<string, number>,
  bonusCtx?: BonusContext,
): CategoryResult[] {
  return CATEGORY_SLUGS.map((category) => {
    const score = Math.round(
      calculateCategoryScore(scoresBySlug, category, bonusCtx),
    );
    return {
      category,
      score,
      qualified: score >= QUALIFY_THRESHOLD,
      tier: supportTier(score),
    };
  });
}

export function computeRecipeCategories(
  scoresBySlug: Record<string, number>,
  bonusCtx?: BonusContext,
): CategoryResult[] {
  return computeAllCategoryScores(scoresBySlug, bonusCtx).filter(
    (c) => c.qualified,
  );
}
