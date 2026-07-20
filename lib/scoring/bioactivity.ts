import "server-only";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { WELLNESS_SUPPORTS, type ScorableRecipe } from "@/lib/wellness-score";
import { type TraceOverride } from "@/lib/bioactivity-categories";

// Bioactivity scoring — the TS twin of scripts/score-supports.mjs (scores all 23
// bioactivities + trace-override categories). Used by the lazy per-recipe scoring
// endpoint; runs on Haiku for speed (the batch script uses sonnet). KEEP IN SYNC
// with the .mjs script's prompt/schema.

export const scoreSchema = z.object({
  bioactivities: z.array(
    z.object({
      slug: z.string(),
      bioactivityScore: z.number().min(0).max(100),
    }),
  ),
  traceOverrides: z
    .array(
      z.object({
        category: z.string(),
        ingredient: z.string().optional(),
        confidence: z.number().min(0).max(100),
      }),
    )
    .optional(),
});

const SCORING_SYSTEM = `You are a clinical bioactivity assistant for the Nuko wellness app. You score how strongly a single recipe supports specific, predefined BIOACTIVITY categories. Bioactivities are effects driven by non-nutritive bioactive compounds (e.g. polyphenols, flavonoids, glucosinolates, allicin, curcuminoids, catechins, terpenes, alkaloids) — this is distinct from nutrition scoring (macro/micronutrient content), which is handled separately.

For EACH assigned bioactivity you are given, output ONE 0–100 bioactivityScore.

To arrive at that single score, internally weigh these factors (do not output them separately):
- Potency: how much bioactive material relevant to THIS bioactivity the recipe actually delivers in one serving — based on ingredient identity, compound class, quantity, and preparation method (raw vs. cooked, fresh vs. dried, presence of bioavailability enhancers like piperine or fat, or degraders like prolonged high heat).
- Mechanism strength: how well-established the biological mechanism of action is for the compounds present, specifically as it relates to THIS bioactivity — independent of dose.
- Evidence tier: weight compounds with human clinical trial (RCT) evidence more heavily than compounds supported only by traditional/folk use, animal studies, or in-vitro data. A well-studied compound with modest potency can outscore a traditionally-used compound with higher potency but thin evidence.

A recipe with a small amount of a compound with a strong, well-established, clinically-backed mechanism for a bioactivity can outscore a recipe with a large amount of a compound only weakly or traditionally linked to that bioactivity. Blend all factors into the single final score.

Rules:
- Score ONLY the bioactivities provided, identified by their exact slug. Never add others.
- Do NOT score based on nutrition (calories, macros, vitamin/mineral RDAs) — that is a separate scoring process.
- Use the full 0–100 range and be discriminating: a recipe can score high on one bioactivity and low on another depending on which compound classes it actually contains. Avoid clustering scores near the same value.
- If a recipe contains negligible or no compounds relevant to a given bioactivity, score it low (0–20) rather than omitting it — but only include bioactivities you were explicitly assigned.
- Base scores on the actual ingredients, quantities, and prep method — not the recipe's name, marketing copy, or intended use case.

TRACE EXCEPTION (category overrides):
Certain ingredients exert strong, clinically-meaningful biological effects despite small quantities: turmeric, ginger, cinnamon, cloves, black pepper, matcha, saffron, moringa, spirulina, medicinal mushrooms. Averaged category scoring can wrongly exclude such recipes.
The 14 recipe categories are: energy, hormones, hydration, fitness, focus, beauty, sleep, detox, gut-health, immunity, weight-loss, diabetes, menopause, heart.
In "traceOverrides", list any category this recipe should still be admitted to because it contains a clinically-meaningful amount of a trace-active ingredient strongly associated with that category's primary effect. For each, give the category slug, the ingredient, and your override confidence (0–100). Only include categories you genuinely believe warrant an override; return an empty array otherwise.

Output only the schema fields, nothing else.`;

function formatIngredients(ingredients: unknown): string {
  if (!Array.isArray(ingredients)) return "(none listed)";
  return (ingredients as Array<{ label?: string }>)
    .map((i) => i?.label?.trim())
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");
}

function buildPrompt(recipe: ScorableRecipe): string {
  const list = WELLNESS_SUPPORTS.map((s) => `- ${s.name} (slug: ${s.slug})`).join(
    "\n",
  );
  return `Recipe: ${recipe.title}
${recipe.short_description ? `Summary: ${recipe.short_description}\n` : ""}
Ingredients (quantities are for one serving as written):
${formatIngredients(recipe.ingredients)}
${recipe.why_it_works ? `\nWhy it works: ${recipe.why_it_works}\n` : ""}
Score the recipe for these assigned bioactivities only:
${list}`;
}

const clampScore = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export interface BioactivityResult {
  scoresBySlug: Record<string, number>;
  overrides: TraceOverride[];
  totalTokens: number;
}

export async function scoreBioactivities(
  recipe: ScorableRecipe,
): Promise<BioactivityResult> {
  const { object, usage } = await generateObject({
    // Haiku over sonnet for the inline lazy path — sonnet ran ~59s, near the
    // 60s function cap. The batch scripts still use sonnet for the catalogue.
    model: anthropic("claude-haiku-4-5"),
    maxOutputTokens: 2000,
    schema: scoreSchema,
    system: SCORING_SYSTEM,
    prompt: buildPrompt(recipe),
  });

  const valid = new Set(WELLNESS_SUPPORTS.map((b) => b.slug));
  const scoresBySlug: Record<string, number> = {};
  for (const s of object.bioactivities ?? []) {
    if (valid.has(s.slug)) scoresBySlug[s.slug] = clampScore(s.bioactivityScore);
  }

  return {
    scoresBySlug,
    overrides: (object.traceOverrides ?? []) as TraceOverride[],
    totalTokens:
      usage?.totalTokens ??
      (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
  };
}
