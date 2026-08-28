// Precautions tab — PRD-4 §2/§3/§5, kept pure so the rules are pinned by tests
// rather than living inside a script or a React component.

/**
 * PRD-4 §3 — the three fields.
 *
 * PRD-3 had a fourth, `dailyLimit`, and a `sources` citation list. Both are
 * gone in PRD-4: without live web search there is no source to cite, and a
 * dosage figure recalled from training rather than read from a fact sheet is
 * exactly the kind of number the PRD forbids inventing. Dropping the field is
 * safer than keeping it and hoping the model self-censors.
 *
 * Every remaining field is optional by design: "If no meaningful information
 * exists for a question, omit it rather than guessing". A profile with all
 * three missing is not a valid profile — see isUsableProfile.
 */
export interface UsageProfile {
  /** §3 — can this be consumed every day indefinitely? */
  longTermUse?: string;
  /** §3 — maximum continuous-use period, and whether to cycle. */
  durationCycling?: string;
  /** §3 — populations who should avoid it or consult a doctor first. */
  whoShouldAvoid?: string;
}

export const USAGE_FIELDS = [
  ["longTermUse", "Long-term use"],
  ["durationCycling", "Duration / cycling"],
  ["whoShouldAvoid", "Who should avoid"],
] as const satisfies readonly (readonly [keyof UsageProfile, string])[];

/**
 * The field the generator must not silently drop.
 *
 * Measured on Opus with the §4.1 prompt: `licorice root` came back with
 * longTermUse and durationCycling but NO whoShouldAvoid on one run and all
 * three on the next — same prompt, both `stop_reason: end_turn`, so this is
 * the model applying "omit rather than guess" to question 3, not truncation.
 *
 * Licorice root plainly has an answer here (pregnancy, hypertension,
 * potassium), and PRD-4 §7 names it as a spot-check case. An absent
 * contraindication reads to a user as "nothing to worry about", so the
 * pipeline re-asks and then flags rather than accepting the omission. It never
 * fills the gap itself — see scripts/classify-ingredient-usage.ts.
 */
export const CRITICAL_FIELD = "whoShouldAvoid" as const;

/** One ingredient's block in the tab (§5). */
export interface IngredientPrecaution {
  ingredientId: string;
  name: string;
  profile: UsageProfile;
}

/**
 * PRD §2 — does this recipe_ingredients row count as a real ingredient?
 *
 * The PRD defers to "the same threshold rule already used elsewhere in Nuko's
 * scoring system (a real recipe-level ingredient with its own listed quantity,
 * not a garnish or trace mention)". No named constant existed, so this encodes
 * that sentence directly: resolved to an ingredient, and carrying real weight.
 *
 * `grams` is what the USDA roll-up actually sums, so a row with no grams
 * contributes nothing to any other score either — treating it as a trace
 * mention here keeps this tab consistent with the rest of the system.
 */
export function isMeaningfulAmount(row: {
  ingredient_id?: string | null;
  quantity?: number | null;
  grams?: number | null;
}): boolean {
  if (!row.ingredient_id) return false;
  if (row.quantity == null || row.quantity <= 0) return false;
  return (row.grams ?? 0) > 0;
}

/** A profile is only worth showing if at least one field has a real answer. */
export function isUsableProfile(profile: unknown): profile is UsageProfile {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Record<string, unknown>;
  return USAGE_FIELDS.some(([key]) => {
    const v = p[key];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/**
 * Narrow raw jsonb to the fields we display, dropping empties (§3 omission).
 *
 * Reads only the three PRD-4 keys, so a profile written by the PRD-3 pipeline
 * loses its `dailyLimit` and `sources` on display without needing a data
 * migration — the stale keys stay in the jsonb and are simply never rendered.
 */
export function parseUsageProfile(raw: unknown): UsageProfile | null {
  if (!isUsableProfile(raw)) return null;
  const p = raw as Record<string, unknown>;
  const out: UsageProfile = {};
  for (const [key] of USAGE_FIELDS) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

/**
 * PRD §5 — build the tab's contents for one recipe.
 *
 * Only ingredients that both qualify (§2) and have a usable cached profile
 * appear. Returning an empty array is a normal, expected outcome: the caller
 * shows the reassuring empty state rather than hiding the tab.
 */
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
    // One block per ingredient even if a recipe lists it twice (e.g. "ginger,
    // grated" and "ginger, for garnish" resolving to the same row).
    if (seen.has(ing.id)) continue;

    const profile = parseUsageProfile(ing.usage_profile);
    if (!profile) continue;

    seen.add(ing.id);
    out.push({ ingredientId: ing.id, name: ing.name, profile });
  }

  return out;
}
