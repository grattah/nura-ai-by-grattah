import { z } from "zod";

/**
 * Copy rules for generated recipe text, in one place.
 *
 * Both the live generator (app/api/recipes/generate/route.ts) and the backfill
 * that rewrites existing rows read from here, so the rules can't drift apart —
 * a rewritten recipe and a freshly generated one must read the same.
 */

// ── QA ⑩: the intro must not name specific body systems ─────────────────────
//
// The intro is marketing copy shown on cards and at the top of the recipe. QA's
// rule is that it stays experiential ("light, refreshing, keeps you going")
// rather than clinical ("supports cardiovascular health and cognitive
// function") — naming organs and systems reads as a medical claim about what
// the drink will do to the reader's body. The mechanism detail still lives in
// "Why it works", which is where a specific claim belongs.
export const BODY_SYSTEM_TERMS = [
  "cardiovascular", "heart health", "circulatory", "circulation",
  "digestive", "digestion", "gut health", "gastrointestinal",
  "cognitive", "brain health", "neurological", "nervous system",
  "immune", "immunity",
  "respiratory", "lungs",
  "metabolic", "metabolism",
  "liver", "hepatic", "kidney", "renal",
  "musculoskeletal", "joint health",
  "endocrine", "hormonal", "thyroid",
  "blood sugar", "blood glucose", "blood pressure",
  "skin health", "vision", "eye health",
  "organ-system", "body system",
] as const;

const BODY_SYSTEM_RE = new RegExp(
  `\\b(${BODY_SYSTEM_TERMS.map((t) => t.replace(/[-\s]/g, "[-\\s]")).join("|")})`,
  "i",
);

/** True when a recipe intro names a specific body system (QA ⑩ violation). */
export function mentionsBodySystem(text: string | null | undefined): boolean {
  return !!text && BODY_SYSTEM_RE.test(text);
}

export const INTRO_RULE = `INTRO (short_description): One or two warm, plain sentences describing what the
drink is, how it tastes, and the everyday benefit someone would notice. Do NOT
name specific body systems, organs, or clinical markers — no "cardiovascular",
"digestive", "immune", "cognitive", "metabolic", "blood sugar", "blood
pressure", "liver", "gut health", or similar. Say "keeps you feeling steady
through the afternoon", not "supports cardiovascular and metabolic health".
Save every mechanism and nutrient claim for why_it_works.`;

// ── QA ⑪: 3-5 functions per ingredient ──────────────────────────────────────

export const WHY_IT_WORKS_RULE = `WHY IT WORKS (why_it_works_detail): One entry per MAIN ingredient — skip water,
ice, and pure garnishes. For each, give between 3 and 5 distinct functions:
what that ingredient contributes and what it does. Each function is one short,
concrete phrase (roughly 8-20 words), grounded in established nutrition science.
Do not repeat the same function across ingredients, and do not pad to reach
three — if an ingredient genuinely has only a couple of established functions,
choose a different main ingredient to describe instead.

Also provide why_it_works as 2-3 plain prose sentences covering how the
ingredients work together. Body systems ARE allowed here; this is the section
where the mechanism belongs.`;

/** One ingredient's contribution, as shown under "Why it works". */
export const WhyItWorksEntrySchema = z.object({
  ingredient: z
    .string()
    .describe("The ingredient name alone, no amount — e.g. 'Pineapple'"),
  functions: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("3-5 distinct things this ingredient contributes"),
});

export const WhyItWorksDetailSchema = z
  .array(WhyItWorksEntrySchema)
  .min(1)
  .describe("Per-ingredient breakdown, one entry per main ingredient");

export type WhyItWorksEntry = z.infer<typeof WhyItWorksEntrySchema>;
export type WhyItWorksDetail = z.infer<typeof WhyItWorksDetailSchema>;

/**
 * Parses the jsonb column into a usable shape, or null if a row predates the
 * column or holds something unexpected. Callers fall back to the prose.
 */
export function parseWhyItWorksDetail(raw: unknown): WhyItWorksDetail | null {
  const parsed = WhyItWorksDetailSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
