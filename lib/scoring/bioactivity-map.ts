// PRD Recipe Match Score abbreviation → existing bioactivity slug (the 23 rows in
// `tags`, scored per recipe in `recipe_tags.score`). Lets the Match Score
// formulas reference PRD names while reading the app's stored slugs.

export const BIOACTIVITY_SLUG: Record<string, string> = {
  BloodSugar: "blood-sugar-support",
  Heart: "heart-circulation-support",
  CholLipid: "cholesterol-lipid-balance",
  Hormonal: "hormonal-balance-support",
  Kidney: "kidney-fluid-balance-support",
  Liver: "liver-detox-support",
  Temperature: "temperature-balance-support",
  BoneJoint: "bone-joint-support",
  Gut: "gut-digestive-support",
  Inflammation: "inflammation-support",
  PainComfort: "pain-comfort-support",
  WeightMetabolic: "weight-metabolic-support",
  CellWellness: "cellular-wellness-support",
  BrainCognitive: "brain-cognitive-support",
  Antioxidant: "antioxidant-cellular-protection",
  Mood: "mood-emotional-balance",
  StressResilience: "stress-resilience-support",
  SleepRelaxation: "sleep-relaxation-support",
  SkinHealth: "skin-health-support",
  HealthyAging: "healthy-aging-support",
  Microbiome: "microbiome-support",
  Immune: "immune-support",
  NaturalDefense: "natural-defense-support",
};

export type BioScores = Record<string, number>; // PRD abbreviation → 0..100

/** Build a PRD-abbreviation → score map from stored {slug: score} rows. */
export function bioFromSlugScores(bySlug: Record<string, number>): BioScores {
  const out: BioScores = {};
  for (const [abbr, slug] of Object.entries(BIOACTIVITY_SLUG)) {
    out[abbr] = bySlug[slug] ?? 0;
  }
  return out;
}
