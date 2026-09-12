export interface UsageProfile {
  longTermUse?: string;
  durationCycling?: string;
  whoShouldAvoid?: string;
}

export const USAGE_FIELDS = [
  "longTermUse",
  "durationCycling",
  "whoShouldAvoid",
] as const satisfies readonly (keyof UsageProfile)[];

export const CRITICAL_FIELD = "whoShouldAvoid" as const;

export interface IngredientPrecaution {
  ingredientId: string;
  name: string;
  profile: UsageProfile;
}

/** True for a resolved ingredient with a real quantity and weight (PRD §2). */
export function isMeaningfulAmount(row: {
  ingredient_id?: string | null;
  quantity?: number | null;
  grams?: number | null;
}): boolean {
  if (!row.ingredient_id) return false;
  if (row.quantity == null || row.quantity <= 0) return false;
  return (row.grams ?? 0) > 0;
}

export function isUsableProfile(profile: unknown): profile is UsageProfile {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Record<string, unknown>;
  return USAGE_FIELDS.some((key) => {
    const v = p[key];
    return typeof v === "string" && v.trim().length > 0;
  });
}

export function parseUsageProfile(raw: unknown): UsageProfile | null {
  if (!isUsableProfile(raw)) return null;
  const p = raw as Record<string, unknown>;
  const out: UsageProfile = {};
  for (const key of USAGE_FIELDS) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

/** Builds the Precautions tab contents for one recipe (PRD §5). */
export function buildPrecautions(
  rows: {
    ingredient_id?: string | null;
    quantity?: number | null;
    grams?: number | null;
    position?: number | null;
    ingredients?: {
      id?: string | null;
      name?: string | null;
      needs_usage_profile?: boolean | null;
      usage_profile?: unknown;
    } | null;
  }[],
): IngredientPrecaution[] {
  const seen = new Set<string>();
  const out: IngredientPrecaution[] = [];

  const ordered = [...rows].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  for (const row of ordered) {
    if (!isMeaningfulAmount(row)) continue;
    const ing = row.ingredients;
    if (!ing?.id || !ing.name) continue;
    if (ing.needs_usage_profile !== true) continue;
    if (seen.has(ing.id)) continue;

    const profile = parseUsageProfile(ing.usage_profile);
    if (!profile) continue;

    seen.add(ing.id);
    out.push({ ingredientId: ing.id, name: ing.name, profile });
  }

  return out;
}

/** Joins the precaution answers into one paragraph. */
export function precautionProse(profile: UsageProfile): string {
  return USAGE_FIELDS.map((key) => profile[key]?.trim())
    .filter((s): s is string => !!s)
    .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`))
    .join(" ");
}

const NAME_STOPWORDS = new Set([
  "fresh", "ground", "dried", "raw", "whole", "large", "small", "organic",
  "powder", "powdered", "leaf", "leaves", "root", "roots", "seed", "seeds",
  "juice", "inner", "food", "grade", "brewed", "freshly", "chopped", "sliced",
  "concentrate", "extract", "unsweetened", "plain", "pure",
]);

/** True when the first sentence names its ingredient. */
export function opensByNaming(
  ingredientName: string,
  profile: UsageProfile,
): boolean {
  const first = USAGE_FIELDS.map((k) => profile[k]?.trim()).find((v) => !!v);
  if (!first) return true;

  const words = (ingredientName.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(
    (w) => !NAME_STOPWORDS.has(w),
  );
  if (words.length === 0) return true;

  const opening = first.toLowerCase();
  return words.some((w) => opening.includes(w.slice(0, 6)));
}
