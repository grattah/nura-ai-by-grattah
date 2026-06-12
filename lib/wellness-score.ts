import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// AI wellness-support scoring (DetoxCard PRD). Each recipe's assigned wellness
// supports (its tags) get a 0–100% strength score from a hybrid model:
//   final = 0.7 * NutritionScore + 0.3 * IngredientIntelligenceScore
// The LLM supplies the two sub-scores (the DB has no structured nutrition or
// ingredient-property data); this module owns the formula so it stays auditable.

export interface AssignedSupport {
  name: string;
  slug: string;
}

export interface SupportScore {
  slug: string;
  support: string;
  nutritionScore: number;
  ingredientScore: number;
  score: number;
}

export interface ScorableRecipe {
  title: string;
  short_description?: string | null;
  ingredients?: unknown; // [{ emoji, label }]
  why_it_works?: string | null;
}

export const scoreSchema = z.object({
  supports: z.array(
    z.object({
      slug: z.string().describe("The exact slug of one assigned support"),
      nutritionScore: z
        .number()
        .min(0)
        .max(100)
        .describe(
          "0–100: how strongly the nutritional content (ingredient types and quantities for one serving) supports this goal",
        ),
      ingredientScore: z
        .number()
        .min(0)
        .max(100)
        .describe(
          "0–100: how strongly the ingredients' known wellness properties support this goal",
        ),
      nutritionRationale: z.string(),
      ingredientRationale: z.string(),
    }),
  ),
});

export const SCORING_SYSTEM = `You are a clinical nutrition assistant for the Nura wellness app.
You score how strongly a single recipe supports specific, predefined wellness goals.

For EACH assigned support you are given, output two independent 0–100 sub-scores:
- nutritionScore: judged from the ingredient TYPES and QUANTITIES for one serving — the
  macro/micronutrient profile and how relevant those nutrients are to THIS goal.
- ingredientScore: judged from the recognised wellness PROPERTIES of the ingredients and how
  relevant they are to THIS goal.

Rules:
- Score ONLY the supports provided, identified by their exact slug. Never add other supports.
- Use the full 0–100 range and be discriminating: a recipe can support one goal strongly and
  another only weakly. Avoid clustering everything near the same value.
- Base scores on the actual ingredients and amounts, not the recipe's name or marketing.`;

function formatIngredients(ingredients: unknown): string {
  if (!Array.isArray(ingredients)) return "(none listed)";
  return (ingredients as Array<{ label?: string }>)
    .map((i) => i?.label?.trim())
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");
}

export function buildScoringPrompt(
  recipe: ScorableRecipe,
  supports: AssignedSupport[],
): string {
  const supportList = supports.map((s) => `- ${s.name} (slug: ${s.slug})`).join("\n");
  return `Recipe: ${recipe.title}
${recipe.short_description ? `Summary: ${recipe.short_description}\n` : ""}
Ingredients (quantities are for one serving as written):
${formatIngredients(recipe.ingredients)}
${recipe.why_it_works ? `\nWhy it works: ${recipe.why_it_works}\n` : ""}
Score the recipe for these assigned supports only:
${supportList}`;
}

export function computeFinal(nutrition: number, ingredient: number): number {
  const v = Math.round(0.7 * nutrition + 0.3 * ingredient);
  return Math.max(0, Math.min(100, v));
}

export async function scoreSupports(
  recipe: ScorableRecipe,
  supports: AssignedSupport[],
): Promise<SupportScore[]> {
  if (!supports.length) return [];

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: scoreSchema,
    system: SCORING_SYSTEM,
    prompt: buildScoringPrompt(recipe, supports),
  });

  const nameBySlug = new Map(supports.map((s) => [s.slug, s.name]));
  const scoredBySlug = new Map<string, SupportScore>();

  for (const s of object.supports) {
    // Keep only assigned slugs (never invent supports) and ignore duplicates.
    if (!nameBySlug.has(s.slug) || scoredBySlug.has(s.slug)) continue;
    scoredBySlug.set(s.slug, {
      slug: s.slug,
      support: nameBySlug.get(s.slug)!,
      nutritionScore: s.nutritionScore,
      ingredientScore: s.ingredientScore,
      score: computeFinal(s.nutritionScore, s.ingredientScore),
    });
  }

  // Preserve the recipe's assigned order; drop any the model failed to return.
  return supports
    .map((s) => scoredBySlug.get(s.slug))
    .filter((x): x is SupportScore => !!x);
}
