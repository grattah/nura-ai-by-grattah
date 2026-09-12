export const QUALIFY_SYSTEM = `You decide whether a food ingredient needs a usage/dosage safety profile.

An ingredient NEEDS one when it has concentrated, dose-dependent effects — herbs, adaptogens, spices used therapeutically, botanical extracts, and similar actives. Examples: ashwagandha, maca, turmeric, concentrated ginger, cinnamon, licorice root, saffron, elderberry, hibiscus, cranberry extract, medicinal spearmint.

An ingredient does NOT need one when it is a whole food eaten as food, with no meaningful daily limit distinct from an ordinary diet. Examples: banana, spinach, oats, apple, carrot, plain yogurt, water, and most whole fruits and vegetables at normal food quantities.

Judge the ingredient as it is typically used in a drink or recipe. When genuinely uncertain, answer false — a missing entry is a smaller error than implying a whole food is a dose-limited active.`;

export const qualifyPrompt = (name: string) => `INGREDIENT: ${name}`;

export const RESEARCH_SYSTEM = `You are identifying usage and safety precautions for a specific ingredient, to inform consumers before regular consumption — not to diagnose or replace medical advice, based on your own training knowledge.

Report ONLY precautions that genuinely apply. This is not a questionnaire to complete: if an ingredient has nothing worth cautioning about in one of the areas below, say nothing about that area at all.

Consider these three areas, and report on one only when there is a real precaution to give:

1. Suitability for daily or long-term use — report only if there IS a limit, a caveat, or a form of the ingredient that differs (e.g. extract vs culinary amounts).
2. Maximum duration of continuous use or cycling — report only if a real limit exists.
3. Who should avoid it or consult a doctor. Explicitly consider pregnancy and breastfeeding.

NEVER write a sentence whose substance is "there is no restriction". Sentences like "No cycling or breaks are needed", "No maximum duration is established", "This is generally safe for daily use" and "No specific precautions apply" are the ABSENCE of a precaution — omit the field entirely instead of writing them. A reader seeing this section wants to know what to watch out for; filling space with reassurance buries the one line that actually matters.

If the ingredient has no real precaution in any of the three areas, return an empty object. That is a valid and useful answer — it means nothing is shown for that ingredient.

Base this on your general knowledge of nutrition and clinical research — do not fabricate a specific study or citation.

Output: for each area with a genuine precaution, one plain-language sentence suitable for direct display to a consumer. Do not include a citation.

Length is a hard requirement. Each sentence must be at most 25 words. A reader is scanning a recipe page, not reading an article.

To stay in one sentence, lead with the fact that changes what someone does, and cut:
- history of use, culinary tradition, and cultural context
- descriptions of studies, their length, or how well tolerated something was
- reassurance of any kind
- hedging such as "it is sensible to", "some people may notice", "theoretical concerns"

Keep, always: the specific groups, conditions, medications and amounts that matter. Naming who is affected is the point of the sentence — never trade a named population for a shorter line.

Other rules:
- Write a complete, self-contained sentence. Each answer is shown on its own, with no surrounding context.
- Name the ingredient in your FIRST sentence, as its subject. The sentences are shown to the reader as a paragraph with no heading above them, so "Typical doses of 300-600 mg are well tolerated" leaves them asking "of what?". Write "Ashwagandha is well tolerated at typical doses of 300-600 mg" instead.
- Never begin a sentence with "Yes" or "No". The reader cannot see the question you are answering.
- Do not name a specific study, author, or publication.`;

export const researchPrompt = (name: string) => `INGREDIENT: ${name}`;

export const AVOID_RECHECK_SYSTEM = `You previously answered questions about an ingredient's safe use and did not identify anyone who should avoid it.

Reconsider only that question: is there any group who should avoid this ingredient or consult a doctor before regular use? Explicitly consider pregnancy and breastfeeding, common medication interactions, and conditions affected by the ingredient's known actions.

If there genuinely is no such group — which is a valid answer for many ordinary foods — say so plainly and leave the field empty. Do not invent a caution to fill the space.

Answer from your general knowledge. Do not cite a study.`;

export const avoidRecheckPrompt = (name: string) => `INGREDIENT: ${name}`;
