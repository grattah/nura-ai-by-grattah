// Deterministic Track + Preparation classification (PRD: Base Nutrition Score
// §2 & §5). Keyword-based, no LLM. Track = how it's consumed (drunk vs eaten);
// Preparation (Beverage only) = Juiced vs Blended from the prep instructions.

export type Track = "Beverage" | "Solid Food";
export type Preparation = "Juiced" | "Blended" | "N/A";

const BEVERAGE_KEYWORDS = [
  "shake", "smoothie", "juice", "tea", "latte", "tonic", "drink", "infusion", "elixir",
];
// Solid-Food indicators OVERRIDE a beverage keyword (e.g. "Smoothie Bowl").
const SOLID_OVERRIDE_KEYWORDS = [
  "bowl", "oats", "parfait", "pudding", "popsicle", "bar", "bite",
];

const JUICED_KEYWORDS = ["juice", "extract", "cold-press", "cold press", "strain", "juicer"];
const BLENDED_KEYWORDS = ["blend", "purée", "puree", "blender", "until smooth"];

export function classifyTrack(name: string): Track {
  const n = name.toLowerCase();
  if (SOLID_OVERRIDE_KEYWORDS.some((k) => n.includes(k))) return "Solid Food";
  if (BEVERAGE_KEYWORDS.some((k) => n.includes(k))) return "Beverage";
  // Fallback: this is a drinks-first app — default ambiguous names to Beverage.
  return "Beverage";
}

export function classifyPreparation(track: Track, prepText: string): Preparation {
  if (track === "Solid Food") return "N/A";
  const t = prepText.toLowerCase();
  // Prefer instructions over the name; blended cues win when both appear with no
  // straining. If neither is present, default to the stricter Juiced.
  const hasBlend = BLENDED_KEYWORDS.some((k) => t.includes(k));
  const hasJuice = JUICED_KEYWORDS.some((k) => t.includes(k));
  if (hasBlend && !hasJuice) return "Blended";
  if (hasJuice) return "Juiced";
  return hasBlend ? "Blended" : "Juiced";
}
