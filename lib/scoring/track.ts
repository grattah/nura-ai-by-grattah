// Deterministic Track + Preparation classification (PRD: Base Nutrition Score
// §2 & §5). Keyword-based, no LLM. Track = how it's consumed (drunk vs eaten);
// Preparation (Beverage only) = Juiced vs Blended from the prep instructions.

export type Track = "Beverage" | "Solid Food";
export type Preparation = "Juiced" | "Blended" | "N/A";

const BEVERAGE_KEYWORDS = [
  "shake", "smoothie", "juice", "tea", "latte", "tonic", "drink", "infusion", "elixir",
];
// Solid-Food indicators that OVERRIDE a beverage keyword (PRD §2 step 0.2 —
// "Smoothie Bowl" is eaten). These describe the physical form, so they win.
const SOLID_OVERRIDE_KEYWORDS = [
  "bowl", "oats", "parfait", "pudding", "popsicle", "bar", "bite",
];
// Weaker signals: foods that are usually eaten but are also common smoothie
// INGREDIENTS. They only decide the track when no beverage word is present, so
// "Greek Yogurt with Chia Seeds" is Solid Food while "Banana Yogurt Smoothie"
// stays a Beverage. (An extension beyond the PRD's list, which omits yogurt.)
const WEAK_SOLID_KEYWORDS = ["yogurt", "yoghurt", "granola", "chia seeds"];

const JUICED_KEYWORDS = ["juice", "extract", "cold-press", "cold press", "strain", "juicer"];
const BLENDED_KEYWORDS = ["blend", "purée", "puree", "blender", "until smooth"];

// Whole-word match: several keywords are substrings of unrelated foods —
// "bar" is inside "rhubarb"/"barley" and "bite" is inside "bitter", which would
// otherwise score a rhubarb juice against solid-food thresholds.
const hasWord = (haystack: string, word: string) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);

export function classifyTrack(name: string): Track {
  const n = name.toLowerCase();
  if (SOLID_OVERRIDE_KEYWORDS.some((k) => hasWord(n, k))) return "Solid Food";
  if (BEVERAGE_KEYWORDS.some((k) => hasWord(n, k))) return "Beverage";
  if (WEAK_SOLID_KEYWORDS.some((k) => hasWord(n, k))) return "Solid Food";
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
