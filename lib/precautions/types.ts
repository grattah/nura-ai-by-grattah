// Precautions tab — PRD §2/§3/§5, kept pure so the rules are pinned by tests
// rather than living inside a script or a React component.

/**
 * PRD §3 — the four fields.
 *
 * Every field is optional by design: "If a field genuinely doesn't apply (e.g.
 * no meaningful duration/cycling guidance exists for an ingredient), it should
 * be omitted for that ingredient rather than filled with a generic placeholder."
 * A profile with all four missing is not a valid profile — see isUsableProfile.
 */
export interface UsageProfile {
  /** §3 — upper bound of typical safe intake, per available guidance. */
  dailyLimit?: string;
  /** §3 — can this be consumed every day indefinitely? */
  longTermUse?: string;
  /** §3 — maximum continuous-use period, and whether to cycle. */
  durationCycling?: string;
  /** §3 — populations who should avoid it or consult a doctor first. */
  whoShouldAvoid?: string;
  /** §4.1 — brief citation per answered question. */
  sources?: string[];
}

export const USAGE_FIELDS = [
  ["dailyLimit", "Daily limit"],
  ["longTermUse", "Long-term use"],
  ["durationCycling", "Duration / cycling"],
  ["whoShouldAvoid", "Who should avoid"],
] as const satisfies readonly (readonly [keyof UsageProfile, string])[];

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

/** Narrow raw jsonb to the fields we display, dropping empties (§3 omission). */
export function parseUsageProfile(raw: unknown): UsageProfile | null {
  if (!isUsableProfile(raw)) return null;
  const p = raw as Record<string, unknown>;
  const out: UsageProfile = {};
  for (const [key] of USAGE_FIELDS) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  const sources = p.sources;
  if (Array.isArray(sources)) {
    const clean = sources.filter(
      (s): s is string => typeof s === "string" && s.trim().length > 0,
    );
    if (clean.length) out.sources = clean;
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
