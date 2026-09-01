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

/**
 * The order the three answers are read in, and nothing else.
 *
 * These used to carry display labels ("Long-term use", "Duration / cycling",
 * "Who should avoid") because the tab rendered a labelled bullet per field. It
 * renders prose now — see precautionProse — so the labels were dead data, and
 * dead labels invite the next reader to believe they appear somewhere.
 */
export const USAGE_FIELDS = [
  "longTermUse",
  "durationCycling",
  "whoShouldAvoid",
] as const satisfies readonly (keyof UsageProfile)[];

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
  return USAGE_FIELDS.some((key) => {
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
  for (const key of USAGE_FIELDS) {
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

/**
 * The three answers as one paragraph, in USAGE_FIELDS order.
 *
 * The tab previously showed a labelled bullet per field, which read as a form
 * rather than as advice and made three short answers look like a checklist to
 * skim past. Prose matches how "Why it works" is presented on the same page.
 *
 * Joining is safe because the §4.1 prompt requires each answer to be "a
 * complete, self-contained sentence … shown to a consumer on its own, with no
 * surrounding context" — they were written to stand alone, so they run together
 * without a connective. A missing field simply leaves its sentence out.
 *
 * Terminal punctuation is added when absent: a model that ends an answer
 * without a full stop would otherwise fuse two sentences into one unreadable
 * run-on, and that is a silent, per-ingredient defect nobody would catch.
 */
export function precautionProse(profile: UsageProfile): string {
  return USAGE_FIELDS.map((key) => profile[key]?.trim())
    .filter((s): s is string => !!s)
    .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`))
    .join(" ");
}

/**
 * Words in an ingredient name that identify nothing on their own.
 *
 * "fresh ginger" and "ground ginger" are both identified by `ginger`; matching
 * on `fresh` would call almost any sentence a hit.
 */
const NAME_STOPWORDS = new Set([
  "fresh", "ground", "dried", "raw", "whole", "large", "small", "organic",
  "powder", "powdered", "leaf", "leaves", "root", "roots", "seed", "seeds",
  "juice", "inner", "food", "grade", "brewed", "freshly", "chopped", "sliced",
  "concentrate", "extract", "unsweetened", "plain", "pure",
]);

/**
 * Does the profile's opening sentence identify its own ingredient?
 *
 * The tab renders these as prose with NO heading, so an answer that opens
 * "Typical doses of 300-600 mg daily appear well tolerated" leaves the reader
 * asking what it is about — and a recipe can show several of these paragraphs
 * in a row. 123 of 132 profiles already open by naming themselves; this finds
 * the rest so they can be regenerated rather than hand-listed.
 *
 * Matches on a six-character prefix so "cinnamon" catches "Cinnamon" and
 * "roselle" catches "Roselle calyces", without needing a stemmer.
 */
export function opensByNaming(
  ingredientName: string,
  profile: UsageProfile,
): boolean {
  const first = USAGE_FIELDS.map((k) => profile[k]?.trim()).find((v) => !!v);
  if (!first) return true; // nothing to show, so nothing to mislabel

  const words = (ingredientName.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(
    (w) => !NAME_STOPWORDS.has(w),
  );
  if (words.length === 0) return true; // no distinctive word to look for

  const opening = first.toLowerCase();
  return words.some((w) => opening.includes(w.slice(0, 6)));
}
