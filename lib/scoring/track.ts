export type Track = "Beverage" | "Solid Food";
export type Preparation = "Juiced" | "Blended" | "N/A";

const BEVERAGE_KEYWORDS = [
  "shake", "smoothie", "juice", "tea", "latte", "tonic", "drink", "infusion", "elixir",
];
const SOLID_OVERRIDE_KEYWORDS = [
  "bowl", "oats", "parfait", "pudding", "popsicle", "bar", "bite",
];
const WEAK_SOLID_KEYWORDS = ["yogurt", "yoghurt", "granola", "chia seeds"];

const JUICED_KEYWORDS = ["juice", "extract", "cold-press", "cold press", "strain", "juicer"];
const BLENDED_KEYWORDS = ["blend", "purée", "puree", "blender", "until smooth"];

/** Whole-word match so short keywords don't hit longer foods. */
const hasWord = (haystack: string, word: string) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);

export function classifyTrack(name: string): Track {
  const n = name.toLowerCase();
  if (SOLID_OVERRIDE_KEYWORDS.some((k) => hasWord(n, k))) return "Solid Food";
  if (BEVERAGE_KEYWORDS.some((k) => hasWord(n, k))) return "Beverage";
  if (WEAK_SOLID_KEYWORDS.some((k) => hasWord(n, k))) return "Solid Food";
  return "Beverage";
}

export function classifyPreparation(track: Track, prepText: string): Preparation {
  if (track === "Solid Food") return "N/A";
  const t = prepText.toLowerCase();
  const hasBlend = BLENDED_KEYWORDS.some((k) => t.includes(k));
  const hasJuice = JUICED_KEYWORDS.some((k) => t.includes(k));
  if (hasBlend && !hasJuice) return "Blended";
  if (hasJuice) return "Juiced";
  return hasBlend ? "Blended" : "Juiced";
}
