import "server-only";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { FactorMultipliers } from "@/lib/health-profile/nutrition-modifiers";

// Personalized Nutrition Score — the LLM CLASSIFIES (recipe's base per-factor
// negative points + allergy/medication ingredient matches); the personalized
// number is computed deterministically in code (computePersonalized) from the
// Modifier Table. Keeps arithmetic reliable and avoids re-deriving the recipe's
// base each time in a way that could drift. Runs on Haiku (single call, cached).

export interface PersonalizeRecipe {
  title: string;
  ingredients?: unknown; // [{ emoji, label }]
  nutrition?: unknown; // { kcal, protein, fat, carbs, fiber }
  track: "Beverage" | "Solid Food" | null;
  preparation: "Juiced" | "Blended" | "N/A" | null;
}

export interface UserSafety {
  allergies: string[];
  allergiesOther: string;
  medications: string[];
  celiac: boolean;
}

const schema = z.object({
  work: z.string().describe("Brief working for the point classification."),
  positiveTotal: z
    .number()
    .min(0)
    .max(14)
    .describe("Sum of positive points for the given Track."),
  addedSugarPoints: z.number().min(0).max(6),
  saturatedFatPoints: z.number().min(0).max(3),
  sodiumPoints: z.number().min(0).max(3),
  safetyAlerts: z
    .array(
      z.object({
        type: z.enum(["allergy", "medication"]),
        ingredient: z.string().describe("The specific trigger ingredient."),
        message: z
          .string()
          .describe("Short user-facing sentence naming the trigger."),
      }),
    )
    .describe("Empty array if none."),
});

const SYSTEM = `You are a clinical nutrition assistant for the Nuko app. Do two independent jobs for a single recipe and return ONLY the schema fields.

────────────────────────────────────
JOB 1 — Base per-factor points (positive total + the 3 negative factors)
────────────────────────────────────
Use the recipe's GIVEN Track (and Preparation for beverages) — do NOT reclassify. Convert nutrients to per-100g (Solid Food) or per-100ml (Beverage): per100 = (amount per serving ÷ serving weight) × 100. Estimate any missing values from standard ingredient data. Exclude water/ice from weight.

IF Solid Food — Positive Points (max 14): Fiber g/100g (<0.9=0, 0.9–1.9=1, 1.9–2.8=2, 2.8–3.7=3, >3.7=4); Protein g/100g (<1.6=0, 1.6–3.2=1, 3.2–4.8=2, 4.8–6.4=3, >6.4=4); Whole fruit/veg/nut/seed % (<25=0, 25–49=1, 50–74=2, ≥75=3); Micronutrients ≥10% DV count (0=0, 1–2=1, 3–4=2, ≥5=3).
  Negative: Added sugar g/100g (0–4.5=0, 4.6–9=1, 9.1–13.5=2, 13.6–18=3, >18=4); Saturated fat g/100g (≤1=0, 1.1–2=1, 2.1–3=2, >3=3); Sodium mg/100g (0–90=0, 91–180=1, 181–270=2, >270=3).

IF Beverage — Positive Points (max 12): Fiber g/100ml (<0.9=0, 0.9–1.9=1, 1.9–2.8=2, >2.8=3); Protein g/100ml (<1.2=0, 1.2–2.4=1, 2.4–3.6=2, >3.6=3); Fruit/Veg/Legume % (<40=0, 40–59=2, 60–79=4, ≥80=6).
  Negative — Added Sugar rule by Preparation: IF Blended, "added sugar" = separately added sweeteners only (intrinsic whole-fruit sugar EXEMPT); IF Juiced, ALL sugar counts. Added sugar g/100ml (0–0.5=0, 0.5–2=1, 2–4=2, 4–6=3, 6–8=4, 8–11=5, >11=6); Saturated fat g/100ml (≤1=0, 1.1–2=1, 2.1–3=2, >3=3); Sodium mg/100ml (0–40=0, 41–90=1, 91–140=2, >140=3).

Return positiveTotal, addedSugarPoints, saturatedFatPoints, sodiumPoints. (Do NOT compute any final score — that is done downstream.)

────────────────────────────────────
JOB 2 — Safety alerts (name the trigger ingredient; this is safety info)
────────────────────────────────────
- allergy: if any recipe ingredient matches one of the user's disclosed allergens, add {type:"allergy", ingredient, message:"Contains <ingredient>. You reported a <allergen> allergy/intolerance."}.
- celiac (if disclosed): if the recipe contains any gluten-containing ingredient, add {type:"allergy", ingredient, message:"Contains gluten. You reported celiac disease."}.
- medication: if any recipe ingredient has a known interaction with one of the user's medications (e.g. grapefruit–CYP3A4), add {type:"medication", ingredient, message:"<ingredient> may interact with medications you're taking. (<mechanism>)"}.
Only include genuine matches; otherwise return an empty array. Never name a diagnosed condition beyond the allergy/celiac/interaction context above.`;

function formatIngredients(ingredients: unknown): string {
  if (!Array.isArray(ingredients)) return "(none listed)";
  return (ingredients as Array<{ label?: string }>)
    .map((i) => i?.label?.trim())
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");
}

function formatNutrition(n: unknown): string {
  if (!n || typeof n !== "object") return "(estimate all)";
  const o = n as Record<string, number | undefined>;
  const parts: string[] = [];
  if (o.kcal != null) parts.push(`kcal: ${o.kcal}`);
  if (o.protein != null) parts.push(`protein: ${o.protein} g`);
  if (o.fat != null) parts.push(`fat: ${o.fat} g`);
  if (o.carbs != null) parts.push(`carbs: ${o.carbs} g`);
  if (o.fiber != null) parts.push(`fiber: ${o.fiber} g`);
  return parts.length ? parts.join(", ") : "(estimate all)";
}

export interface ClassifyResult {
  positiveTotal: number;
  addedSugarPoints: number;
  saturatedFatPoints: number;
  sodiumPoints: number;
  safetyAlerts: { type: "allergy" | "medication"; ingredient: string; message: string }[];
  totalTokens: number;
}

export async function classifyForPersonalization(
  recipe: PersonalizeRecipe,
  user: UserSafety,
): Promise<ClassifyResult> {
  const allergens = [
    ...user.allergies,
    ...(user.allergiesOther.trim() ? [user.allergiesOther.trim()] : []),
  ];
  const prompt = `Recipe: ${recipe.title}
Track: ${recipe.track ?? "Solid Food"}${
    recipe.track === "Beverage" ? ` / Preparation: ${recipe.preparation ?? "Juiced"}` : ""
  }
Per-serving nutrition: ${formatNutrition(recipe.nutrition)}

Ingredients:
${formatIngredients(recipe.ingredients)}

User safety context:
- Allergies/intolerances: ${allergens.length ? allergens.join(", ") : "none"}
- Celiac disease disclosed: ${user.celiac ? "yes" : "no"}
- Medications/supplements: ${user.medications.length ? user.medications.join(", ") : "none"}

Do JOB 1 and JOB 2.`;

  const { object, usage } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    maxOutputTokens: 1500,
    schema,
    system: SYSTEM,
    prompt,
  });

  return {
    positiveTotal: object.positiveTotal,
    addedSugarPoints: object.addedSugarPoints,
    saturatedFatPoints: object.saturatedFatPoints,
    sodiumPoints: object.sodiumPoints,
    safetyAlerts: object.safetyAlerts ?? [],
    totalTokens:
      usage?.totalTokens ??
      (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
  };
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// Deterministic personalized final score (mirrors lib/scoring/nutrition.ts).
export function computePersonalizedFinal(
  base: {
    positiveTotal: number;
    addedSugarPoints: number;
    saturatedFatPoints: number;
    sodiumPoints: number;
  },
  track: "Beverage" | "Solid Food" | null,
  ingredientScore: number,
  m: FactorMultipliers,
): number {
  const newNeg =
    base.addedSugarPoints * m.addedSugar +
    base.saturatedFatPoints * m.saturatedFat +
    base.sodiumPoints * m.sodium;
  const offset = track === "Solid Food" ? 10 : 12;
  const nutrition = clamp(((base.positiveTotal - newNeg + offset) / 24) * 100);
  return clamp(0.7 * nutrition + 0.3 * ingredientScore);
}
