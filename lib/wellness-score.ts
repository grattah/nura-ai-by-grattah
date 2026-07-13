import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// AI bioactivity scoring (DetoxCard). Each recipe is scored against a fixed set
// of predefined bioactivity categories; the LLM returns ONE 0–100 bioactivityScore
// per category (effects driven by non-nutritive bioactive compounds — distinct
// from nutrition). That score is used directly as the final strength shown.

// Maximum number of support scores ever returned/shown for a recipe (top N by
// score).
export const MAX_SUPPORT_SCORES = 2;

export interface AssignedSupport {
  name: string;
  slug: string;
}

// Fixed set of wellness supports every recipe is scored against (replaces the
// per-recipe category tags). The top MAX_SUPPORT_SCORES by final score are shown.
// Keep in sync with the inlined copy in scripts/score-supports.mjs.
export const WELLNESS_SUPPORTS: AssignedSupport[] = [
  { name: "Antioxidant & Cellular Protection", slug: "antioxidant-cellular-protection" },
  { name: "Inflammation Support", slug: "inflammation-support" },
  { name: "Immune Support", slug: "immune-support" },
  { name: "Natural Defense Support", slug: "natural-defense-support" },
  { name: "Heart & Circulation Support", slug: "heart-circulation-support" },
  { name: "Cholesterol & Lipid Balance", slug: "cholesterol-lipid-balance" },
  { name: "Blood Sugar Support", slug: "blood-sugar-support" },
  { name: "Weight & Metabolic Support", slug: "weight-metabolic-support" },
  { name: "Gut & Digestive Support", slug: "gut-digestive-support" },
  { name: "Microbiome Support", slug: "microbiome-support" },
  { name: "Liver & Detox Support", slug: "liver-detox-support" },
  { name: "Kidney & Fluid Balance Support", slug: "kidney-fluid-balance-support" },
  { name: "Brain & Cognitive Support", slug: "brain-cognitive-support" },
  { name: "Mood & Emotional Balance", slug: "mood-emotional-balance" },
  { name: "Stress Resilience Support", slug: "stress-resilience-support" },
  { name: "Sleep & Relaxation Support", slug: "sleep-relaxation-support" },
  { name: "Pain & Comfort Support", slug: "pain-comfort-support" },
  { name: "Temperature Balance Support", slug: "temperature-balance-support" },
  { name: "Hormonal Balance Support", slug: "hormonal-balance-support" },
  { name: "Bone & Joint Support", slug: "bone-joint-support" },
  { name: "Skin Health Support", slug: "skin-health-support" },
  { name: "Healthy Aging Support", slug: "healthy-aging-support" },
  { name: "Cellular Wellness Support", slug: "cellular-wellness-support" },
];

export interface SupportScore {
  slug: string;
  support: string;
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
      slug: z.string().describe("The exact slug of one assigned bioactivity"),
      bioactivityScore: z
        .number()
        .min(0)
        .max(100)
        .describe(
          "0–100: how strongly the recipe supports THIS bioactivity, blending potency, mechanism strength, and evidence tier",
        ),
    }),
  ),
});

export const SCORING_SYSTEM = `You are a clinical bioactivity assistant for the Nuko wellness app. You score how strongly a single recipe supports specific, predefined BIOACTIVITY categories. Bioactivities are effects driven by non-nutritive bioactive compounds (e.g. polyphenols, flavonoids, glucosinolates, allicin, curcuminoids, catechins, terpenes, alkaloids) — this is distinct from nutrition scoring (macro/micronutrient content), which is handled separately.

For EACH assigned bioactivity you are given, output ONE 0–100 bioactivityScore.

To arrive at that single score, internally weigh these factors (do not output them separately):
- Potency: how much bioactive material relevant to THIS bioactivity the recipe actually delivers in one serving — based on ingredient identity, compound class, quantity, and preparation method (raw vs. cooked, fresh vs. dried, presence of bioavailability enhancers like piperine or fat, or degraders like prolonged high heat).
- Mechanism strength: how well-established the biological mechanism of action is for the compounds present, specifically as it relates to THIS bioactivity — independent of dose.
- Evidence tier: weight compounds with human clinical trial (RCT) evidence more heavily than compounds supported only by traditional/folk use, animal studies, or in-vitro data. A well-studied compound with modest potency can outscore a traditionally-used compound with higher potency but thin evidence.

A recipe with a small amount of a compound with a strong, well-established, clinically-backed mechanism for a bioactivity can outscore a recipe with a large amount of a compound only weakly or traditionally linked to that bioactivity. Blend all factors into the single final score.

Bioactivity categories (score ONLY the ones provided, using their exact slug):
- antioxidant-cellular-protection
- inflammation-support
- immune-support
- natural-defense-support
- heart-circulation-support
- cholesterol-lipid-balance
- blood-sugar-support
- weight-metabolic-support
- gut-digestive-support
- microbiome-support
- liver-detox-support
- kidney-fluid-balance-support
- brain-cognitive-support
- mood-emotional-balance
- stress-resilience-support
- sleep-relaxation-support
- pain-comfort-support
- temperature-balance-support
- hormonal-balance-support
- bone-joint-support
- skin-health-support
- healthy-aging-support
- cellular-wellness-support

Rules:
- Score ONLY the bioactivities provided, identified by their exact slug. Never add others.
- Do NOT score based on nutrition (calories, macros, vitamin/mineral RDAs) — that is a separate scoring process.
- Use the full 0–100 range and be discriminating: a recipe can score high on one bioactivity and low on another depending on which compound classes it actually contains. Avoid clustering scores near the same value.
- If a recipe contains negligible or no compounds relevant to a given bioactivity, score it low (0–20) rather than omitting it — but only include bioactivities you were explicitly assigned.
- Base scores on the actual ingredients, quantities, and prep method — not the recipe's name, marketing copy, or intended use case.
- Output format: return only the bioactivityScore per slug, nothing else.`;

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
  const supportList = supports
    .map((s) => `- ${s.name} (slug: ${s.slug})`)
    .join("\n");
  return `Recipe: ${recipe.title}
${recipe.short_description ? `Summary: ${recipe.short_description}\n` : ""}
Ingredients (quantities are for one serving as written):
${formatIngredients(recipe.ingredients)}
${recipe.why_it_works ? `\nWhy it works: ${recipe.why_it_works}\n` : ""}
Score the recipe for these assigned bioactivities only:
${supportList}`;
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function scoreSupports(
  recipe: ScorableRecipe,
  supports: AssignedSupport[],
): Promise<SupportScore[]> {
  if (!supports.length) return [];

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    // One small number per assigned bioactivity — headroom for all 23.
    maxOutputTokens: 1500,
    schema: scoreSchema,
    system: SCORING_SYSTEM,
    prompt: buildScoringPrompt(recipe, supports),
  });

  const nameBySlug = new Map(supports.map((s) => [s.slug, s.name]));
  const scoredBySlug = new Map<string, SupportScore>();

  for (const s of object.supports) {
    // Keep only assigned slugs (never invent bioactivities) and ignore duplicates.
    if (!nameBySlug.has(s.slug) || scoredBySlug.has(s.slug)) continue;
    scoredBySlug.set(s.slug, {
      slug: s.slug,
      support: nameBySlug.get(s.slug)!,
      score: clampScore(s.bioactivityScore),
    });
  }

  // Drop any the model failed to return, then keep only the top N by final score.
  return supports
    .map((s) => scoredBySlug.get(s.slug))
    .filter((x): x is SupportScore => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUPPORT_SCORES);
}
