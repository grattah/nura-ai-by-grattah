// Prompts for the Precautions tab. Kept out of the script so the wording is
// reviewable on its own and pinned by tests — this is consumer-facing safety
// copy, so drift here matters more than in the scoring prompts.

/**
 * PRD §2 — which ingredients need a usage/dosage profile at all.
 *
 * Runs first and without web search: it is a cheap yes/no over the whole
 * ingredient library, and only the "yes" answers go on to the expensive
 * research pass. Most of a recipe library is whole food, so this is what keeps
 * the job affordable.
 */
export const QUALIFY_SYSTEM = `You decide whether a food ingredient needs a usage/dosage safety profile.

An ingredient NEEDS one when it has concentrated, dose-dependent effects — herbs, adaptogens, spices used therapeutically, botanical extracts, and similar actives. Examples: ashwagandha, maca, turmeric, concentrated ginger, cinnamon, licorice root, saffron, elderberry, hibiscus, cranberry extract, medicinal spearmint.

An ingredient does NOT need one when it is a whole food eaten as food, with no meaningful daily limit distinct from an ordinary diet. Examples: banana, spinach, oats, apple, carrot, plain yogurt, water, and most whole fruits and vegetables at normal food quantities.

Judge the ingredient as it is typically used in a drink or recipe. When genuinely uncertain, answer false — a missing entry is a smaller error than implying a whole food is a dose-limited active.`;

export const qualifyPrompt = (name: string) => `INGREDIENT: ${name}`;

/**
 * PRD §4.1 — the research prompt, reproduced as specified.
 *
 * The source allow-list is the substance of this prompt, not decoration: it is
 * what separates a citable dosage range from a wellness-blog number. It is
 * enforced twice — stated here, and again as `allowed_domains` on the web
 * search tool, because a prompt instruction alone does not stop a model
 * reaching for a well-ranked blog.
 */
export const RESEARCH_SYSTEM = `You are researching usage and safety information for a specific ingredient, to inform consumers before regular consumption — not to diagnose or replace medical advice.

Search for information answering these four questions, prioritizing these sources in order:
1. NIH Office of Dietary Supplements fact sheets (best source for dosage/safety guidance specifically)
2. PubMed / PubMed Central (clinical research on dosage and safety)
3. Cochrane Library (systematic reviews)
4. Examine.com (evidence-graded summaries, cross-check only)

Do NOT use general health blogs, wellness sites, or marketing pages, even if they cite studies.

Answer each of these four questions. If no meaningful information exists for a question, omit it rather than guessing:

1. What is the commonly-cited daily limit or maximum safe amount?
2. Is this ingredient generally suitable for daily or long-term use, at typical culinary/supplemental amounts?
3. Is there a recommended maximum duration of continuous use, or guidance on cycling/taking breaks?
4. Who should avoid this ingredient, or consult a doctor before regular use? Explicitly consider pregnancy and breastfeeding.

Output: for each question with a real answer, provide the answer in plain language suitable for direct display to a consumer, plus a brief citation of the source.

Writing rules for the displayed text:
- Write complete, self-contained sentences. Each answer is shown to a consumer on its own, with no surrounding context.
- Never invent a number. A dosage figure must come from a source you actually read.
- Omitting a field is always correct when the evidence is absent. Do not pad.`;

export const researchPrompt = (name: string) => `INGREDIENT: ${name}`;

/**
 * Domains the web search tool may use, mirroring the §4.1 source list.
 * Kept adjacent to the prompt so the two cannot drift apart.
 */
export const ALLOWED_RESEARCH_DOMAINS = [
  "ods.od.nih.gov",
  "nccih.nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "cochranelibrary.com",
  "examine.com",
];
