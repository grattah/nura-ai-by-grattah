import "server-only";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { FactorMultipliers } from "@/lib/health-profile/nutrition-modifiers";

// Base Nutrition Score — the TS twin of scripts/score-nutrition.mjs. The LLM
// returns Track/Preparation + point TOTALS + IngredientScore; NutritionScore,
// finalScore and the rating band are computed in code for reliable arithmetic.
// KEEP IN SYNC with the .mjs script.

export interface NutritionScorableRecipe {
  title: string;
  short_description?: string | null;
  ingredients?: unknown; // [{ emoji, label }]
  how_to_make?: unknown; // [{ step, instruction }]
  nutrition?: unknown; // { kcal, protein, fat, carbs, fiber }
}

const scoreSchema = z.object({
  work: z.string().describe("Show all Step 0–4 working."),
  track: z.enum(["Beverage", "Solid Food"]),
  preparation: z.enum(["Juiced", "Blended", "N/A"]),
  trackReason: z
    .string()
    .describe("Which Step-0 rule set the track/prep, and why."),
  positiveTotal: z.number().min(0).max(14).describe("Sum of positive points."),
  // Per-factor negative points (stored so the personalized score can re-weight
  // a single factor without re-classifying the whole recipe).
  addedSugarPoints: z.number().min(0).max(6),
  saturatedFatPoints: z.number().min(0).max(3),
  sodiumPoints: z.number().min(0).max(3),
  fiberPoints: z.number().min(0).max(4),
  proteinPoints: z.number().min(0).max(4),
  ingredientScore: z.number().min(0).max(100),
});

const SCORING_SYSTEM = `You are a clinical nutrition assistant for the Nuko wellness app.
You calculate the Base Nutrition Score for a single recipe, using its ingredient list,
quantities, per-serving nutrition data, and step-by-step prep instructions. This score is
identical for every user — do not adjust it for any individual's health conditions, goals,
or preferences.

────────────────────────────────────
STEP 0 — Classify the recipe's Track (and Preparation, if Beverage)
────────────────────────────────────
0.1 — Beverage Keyword Match: check the recipe name for these Beverage-indicating keywords:
shake, smoothie, juice, tea, latte, tonic, drink, infusion, elixir. If present, tentatively
classify as Beverage and proceed to 0.2.
0.2 — Solid Food Exception Override: if the name ALSO contains a Solid Food indicator — bowl,
oats, parfait, pudding, chia pudding, popsicle, bar, bite — classify as Solid Food regardless
of the Beverage keyword found in 0.1. These words describe physical form/consumption method
and always take priority.
0.3 — Fallback Judgment: if no keyword from either list appears, or the name is ambiguous,
classify by the recipe's actual described consumption method — cup/glass to drink, or
bowl/plate to eat with a utensil.
0.4 — IF Beverage: classify Preparation as Juiced or Blended, based on the recipe's actual
step-by-step prep instructions — NOT the recipe's name.
- Juiced indicators in the prep text: juice, extract, cold-press, strain (out pulp/solids), juicer.
- Blended indicators in the prep text: blend, purée, combine in a blender, mix until smooth,
  with no straining/pulp-removal step. Always defer to prep instructions over the name. If
  instructions genuinely don't specify, default to Juiced (the stricter option). For Solid Food,
  set preparation to N/A.
State the Track, Preparation, which step determined each, and a one-line reason in "trackReason".

────────────────────────────────────
STEP 1 — Convert nutrients to per-100g (Solid Food) or per-100ml (Beverage)
────────────────────────────────────
per100 = (amount per serving ÷ serving weight in grams/ml) × 100
Convert: fiber (g), protein (g), added sugar (g), saturated fat (g), sodium (mg).
Do NOT convert whole-food/fruit-veg-legume percentage (already a %) or micronutrient count
(evaluated per serving in both tracks). EXCLUDE water and other zero-calorie diluents (e.g. ice)
from the recipe's total weight used in the Fruit/Veg/Legume % calculation.

────────────────────────────────────
STEP 2A — IF Solid Food: Score Positive/Negative Points
────────────────────────────────────
Positive Points (max 14):
- Fiber (g/100g): <0.9=0, 0.9–1.9=1, 1.9–2.8=2, 2.8–3.7=3, >3.7=4
- Protein (g/100g): <1.6=0, 1.6–3.2=1, 3.2–4.8=2, 4.8–6.4=3, >6.4=4
- Whole fruit/veg/nut/seed % (by weight, water excluded): <25%=0, 25–49%=1, 50–74%=2, ≥75%=3
- Micronutrients ≥10% DV (count, per serving): 0=0, 1–2=1, 3–4=2, ≥5=3
Negative Points (max 10):
- Added sugar (g/100g): 0–4.5=0, 4.6–9=1, 9.1–13.5=2, 13.6–18=3, >18=4
- Saturated fat (g/100g): ≤1=0, 1.1–2=1, 2.1–3=2, >3=3
- Sodium (mg/100g): 0–90=0, 91–180=1, 181–270=2, >270=3

────────────────────────────────────
STEP 2B — IF Beverage: Score Positive/Negative Points
────────────────────────────────────
Positive Points (max 12):
- Fiber (g/100ml): <0.9=0, 0.9–1.9=1, 1.9–2.8=2, >2.8=3
  (Juiced recipes typically score 0 here even from 100% whole produce — expected, not an error.)
- Protein (g/100ml): <1.2=0, 1.2–2.4=1, 2.4–3.6=2, >3.6=3
- Fruit/Veg/Legume % (by weight, water excluded): <40%=0, 40–59%=2, 60–79%=4, ≥80%=6
Negative Points (max 12) — Added Sugar rule depends on Preparation from Step 0.4:
- IF Blended: "Added sugar" = separately added sweeteners only (honey, syrup, juice concentrate);
  intrinsic sugar from whole fruit/veg blended in is EXEMPT.
- IF Juiced: "Added sugar" = ALL sugar present, intrinsic and added combined, NO exemption.
- Added sugar (g/100ml): 0–0.5=0, 0.5–2=1, 2–4=2, 4–6=3, 6–8=4, 8–11=5, >11=6
- Saturated fat (g/100ml): ≤1=0, 1.1–2=1, 2.1–3=2, >3=3
- Sodium (mg/100ml): 0–40=0, 41–90=1, 91–140=2, >140=3

────────────────────────────────────
STEP 3 — Classify ingredients and compute IngredientScore (same for both tracks)
────────────────────────────────────
Classify EVERY ingredient except water/ice into exactly one processing tier:
- Tier 1 (100 pts): Unprocessed/minimally processed — fresh fruit, vegetables, nuts, seeds,
  plain dairy, herbs, whole spices
- Tier 2 (75 pts): Processed culinary ingredients — oils, butter, honey, maple syrup, nut
  butters, dried/powdered whole foods (e.g. maca powder)
- Tier 3 (50 pts): Processed foods — canned goods, cheese, plant milks with minor additives, bread
- Tier 4 (25 pts): Ultra-processed — flavored syrups, artificial sweeteners, protein powders with
  additive blends, packaged mixes
IngredientScore = Σ(ingredient weight in g × tier points) ÷ Σ(ingredient weight in g)
EXCLUDE water and ice entirely from both numerator and denominator. Estimate missing weights from
standard household measures (1 tsp ≈ 3–5g, 1 tbsp ≈ 15g, 1 medium banana ≈ 118g).

────────────────────────────────────
RULES
────────────────────────────────────
- Track/Preparation classification is based on consumption method and fiber-retention (per actual
  prep instructions), never inferred from the recipe's name alone.
- Base every calculation on actual ingredients/quantities/serving weight, never on recipe name or
  marketing (beyond classification itself).
- No bioactivity, category, or user-personalization logic here.
- If a nutrient value is missing, estimate it from standard ingredient nutrition data.
- Show all step-by-step Step 0–3 work in the "work" field.

OUTPUT: put your full working in "work", then return: "track", "preparation" ("N/A" for Solid Food),
"trackReason", "positiveTotal" (the summed positive points), the three individual negative-point awards
"addedSugarPoints", "saturatedFatPoints" and "sodiumPoints", "fiberPoints" and "proteinPoints" (for the
substance floor), and "ingredientScore" (0–100). NutritionScore, finalScore and the rating are computed
downstream.`;

function formatIngredients(ingredients: unknown): string {
  if (!Array.isArray(ingredients)) return "(none listed)";
  return (ingredients as Array<{ label?: string }>)
    .map((i) => i?.label?.trim())
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");
}

function formatNutrition(n: unknown): string {
  if (!n || typeof n !== "object")
    return "(no per-serving nutrition provided — estimate all)";
  const o = n as Record<string, number | undefined>;
  const parts: string[] = [];
  if (o.kcal != null) parts.push(`kcal: ${o.kcal}`);
  if (o.protein != null) parts.push(`protein: ${o.protein} g`);
  if (o.fat != null) parts.push(`fat: ${o.fat} g`);
  if (o.carbs != null) parts.push(`carbs: ${o.carbs} g`);
  if (o.fiber != null) parts.push(`fiber: ${o.fiber} g`);
  return parts.length
    ? parts.join(", ")
    : "(no per-serving nutrition provided — estimate all)";
}

function formatSteps(steps: unknown): string {
  if (!Array.isArray(steps)) return "(no prep steps listed)";
  return (
    (steps as Array<{ step?: string; instruction?: string }>)
      .map((s) => (s?.instruction ? `${s.step ?? "-"}. ${s.instruction}` : ""))
      .filter(Boolean)
      .join("\n") || "(no prep steps listed)"
  );
}

function buildPrompt(recipe: NutritionScorableRecipe): string {
  return `Recipe: ${recipe.title}
${recipe.short_description ? `Summary: ${recipe.short_description}\n` : ""}
Per-serving nutrition (estimate anything not listed — serving weight, added sugar, saturated fat, sodium, micronutrient %DV):
${formatNutrition(recipe.nutrition)}

Ingredients:
${formatIngredients(recipe.ingredients)}

Prep steps (use these to classify Juiced vs Blended for beverages):
${formatSteps(recipe.how_to_make)}

Calculate the Base Nutrition Score for this recipe.`;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function ratingFor(finalScore: number): string {
  if (finalScore >= 70) return "Excellent";
  if (finalScore >= 50) return "Good";
  if (finalScore >= 30) return "Fair";
  return "Needs Improvement";
}

// The recipe's base per-factor points. Both the base score (identity multipliers)
// and the personalized score (Modifier-Table multipliers) are computed from the
// SAME points via computeNutrition* — so personalized ≤ base always and = base
// when no modifier applies.
export interface NutritionPoints {
  positiveTotal: number;
  addedSugarPoints: number;
  saturatedFatPoints: number;
  sodiumPoints: number;
  fiberPoints: number;
  proteinPoints: number;
  track: "Beverage" | "Solid Food";
  ingredientScore: number; // 0–100
}

export const IDENTITY_MULTIPLIERS: FactorMultipliers = {
  addedSugar: 1,
  saturatedFat: 1,
  sodium: 1,
};

/** NutritionScore (0–100) with the substance floor, given per-factor multipliers. */
export function computeNutritionScore(
  p: NutritionPoints,
  m: FactorMultipliers,
): number {
  const newNegative =
    p.addedSugarPoints * m.addedSugar +
    p.saturatedFatPoints * m.saturatedFat +
    p.sodiumPoints * m.sodium;
  const composite = p.positiveTotal - newNegative;
  const offset = p.track === "Solid Food" ? 10 : 12;
  let nutritionScore = clamp(((composite + offset) / 24) * 100);
  // Substance floor (Solid Food only): no fiber AND no protein points → cap 35.
  if (p.track === "Solid Food" && p.fiberPoints === 0 && p.proteinPoints === 0) {
    nutritionScore = Math.min(nutritionScore, 35);
  }
  return nutritionScore;
}

/** FinalScore = 0.7·NutritionScore + 0.3·IngredientScore. */
export function computeNutritionFinal(
  p: NutritionPoints,
  m: FactorMultipliers,
): number {
  const nutritionScore = computeNutritionScore(p, m);
  return clamp(0.7 * nutritionScore + 0.3 * clamp(p.ingredientScore));
}

export interface NutritionResult {
  track: "Beverage" | "Solid Food";
  preparation: "Juiced" | "Blended" | "N/A";
  trackReason: string;
  nutritionScore: number;
  ingredientScore: number;
  finalScore: number;
  rating: string;
  // Per-factor points to persist (drive the personalized score).
  positiveTotal: number;
  addedSugarPoints: number;
  saturatedFatPoints: number;
  sodiumPoints: number;
  fiberPoints: number;
  proteinPoints: number;
  totalTokens: number;
}

export async function scoreNutrition(
  recipe: NutritionScorableRecipe,
): Promise<NutritionResult> {
  const { object, usage } = await generateObject({
    // Haiku over sonnet for the inline lazy path — sonnet ran ~59s, near the
    // 60s function cap. The batch scripts still use sonnet for the catalogue.
    model: anthropic("claude-haiku-4-5"),
    maxOutputTokens: 3500,
    schema: scoreSchema,
    system: SCORING_SYSTEM,
    prompt: buildPrompt(recipe),
  });

  const track = object.track;
  const preparation = track === "Solid Food" ? "N/A" : object.preparation;
  const ingredientScore = clamp(object.ingredientScore);

  const points: NutritionPoints = {
    positiveTotal: object.positiveTotal,
    addedSugarPoints: object.addedSugarPoints,
    saturatedFatPoints: object.saturatedFatPoints,
    sodiumPoints: object.sodiumPoints,
    fiberPoints: object.fiberPoints,
    proteinPoints: object.proteinPoints,
    track,
    ingredientScore,
  };

  // Base score = the same points with no re-weighting.
  const nutritionScore = computeNutritionScore(points, IDENTITY_MULTIPLIERS);
  const finalScore = computeNutritionFinal(points, IDENTITY_MULTIPLIERS);

  return {
    track,
    preparation,
    trackReason: object.trackReason,
    nutritionScore,
    ingredientScore,
    finalScore,
    rating: ratingFor(finalScore),
    positiveTotal: object.positiveTotal,
    addedSugarPoints: object.addedSugarPoints,
    saturatedFatPoints: object.saturatedFatPoints,
    sodiumPoints: object.sodiumPoints,
    fiberPoints: object.fiberPoints,
    proteinPoints: object.proteinPoints,
    totalTokens:
      usage?.totalTokens ??
      (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
  };
}
