// Per-recipe USDA ingredient resolution (PRD: USDA Nutrient Integration).
// Parses a recipe's free-text ingredient labels → resolves each to a cached
// canonical `ingredients` row (USDA nutrients + hybrid NOVA/FVL/sweetener
// classification) → converts to grams → writes `recipe_ingredients`, and returns
// the resolved list ready for rollupRecipe(). Shared by the batch script
// (scripts/usda-build.ts) and the lazy score route.
//
// IMPORTANT: no `server-only` import — this module is bundled into the Node
// script by esbuild. LLM-classification token accounting is delegated to the
// caller via `onClassifyUsage` (recordScriptUsage in the script, recordUsage in
// the route) so this file doesn't depend on either logging path.

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIngredient } from "./parse-ingredient";
import { toGrams } from "./units";
import { searchFoods, getFoods } from "./client";
import { extractNutrients, DAILY_VALUES } from "./nutrient-ids";
import type { ResolvedIngredient } from "./rollup";

type DB = SupabaseClient;

export interface IngredientRow {
  id: string;
  name: string;
  needs_review: boolean;
  nova_group: number;
  is_fvl: boolean;
  iron_rich: boolean;
  is_added_sweetener: boolean;
  is_sweetener_nnutritive: boolean;
  energy_kcal: number; protein_g: number; total_fat_g: number; sat_fat_g: number;
  carbs_g: number; fiber_g: number; total_sugar_g: number; sodium_mg: number;
  calcium_dv: number; vitamin_c_dv: number; iron_mg: number; water_pct: number;
}

export interface ResolveOptions {
  /** Process-wide ingredient cache (the batch shares one across all recipes). */
  cache?: Map<string, IngredientRow>;
  /** Skip all writes (batch --dry-run). */
  dryRun?: boolean;
  /**
   * Ignore the cached `ingredients` row and re-resolve from USDA. `ingredients`
   * is a permanent cache, so without this a row stored with a bad match stays
   * bad forever — re-running the build would keep returning it.
   */
  refresh?: boolean;
  /** Called with the AI SDK usage after each LLM classification (token logging). */
  onClassifyUsage?: (usage: unknown) => void;
}

// ── Hybrid classification (heuristics first, LLM only when ambiguous) ─────────
const FVL_CATEGORIES = /fruit|vegetable|legume|bean|pea|lentil/i;
const SWEETENER_RE = /honey|syrup|agave|molasses|sugar|nectar|juice concentrate/i;
const NNUTRITIVE_RE = /stevia|sucralose|aspartame|erythritol|monk fruit|xylitol|saccharin/i;
const IRON_RICH_RE = /spinach|lentil|beef|liver|tofu|pumpkin seed|chickpea|kale|molasses|fortified/i;
const WHOLE_RE = /^(fresh |raw |whole )?(fruit|vegetable|leafy|herb|nut|seed|spice|water|ice)/i;
const ULTRA_RE = /powder|protein|flavored|syrup|artificial|isolate|mix\b/i;

const NovaSchema = z.object({
  nova_group: z.number().int().min(1).max(4),
  is_fvl: z.boolean(),
  is_added_sweetener: z.boolean(),
  is_sweetener_nnutritive: z.boolean(),
  iron_rich: z.boolean(),
});
type Classification = z.infer<typeof NovaSchema> & { needs_review: boolean };

// Unambiguous whole-food USDA categories; combined with an absence of
// processing markers in the NAME they safely classify NOVA 1 without an LLM.
const WHOLE_CATEGORY_RE = /fruits|vegetables|legumes|nut and seed|spices and herbs/i;
const PROCESSED_NAME_RE = /juice|syrup|powder|canned|dried|concentrate|extract|flavored|sweetened|milk|butter/i;

export function heuristicClassify(name: string, usdaCategory: string): Classification | null {
  const n = name.toLowerCase();
  const cat = usdaCategory.toLowerCase();
  const hay = `${n} ${cat}`;
  const is_added_sweetener = SWEETENER_RE.test(hay) && !/whole|fresh fruit/.test(hay);
  const is_sweetener_nnutritive = NNUTRITIVE_RE.test(hay);
  const iron_rich = IRON_RICH_RE.test(hay);
  const is_fvl = FVL_CATEGORIES.test(hay) && !is_added_sweetener;
  const base = { is_fvl, is_added_sweetener, is_sweetener_nnutritive, iron_rich, needs_review: false };

  // Order matters (PRD tiers): artificial/flavored → 4; nutritive sweeteners
  // (honey, maple syrup) → 2 BEFORE the generic ultra keywords, so "maple
  // syrup" isn't swallowed by ULTRA's `syrup`; remaining ultra markers → 4.
  if (is_sweetener_nnutritive || /flavored|artificial/.test(hay)) return { nova_group: 4, ...base };
  if (is_added_sweetener) return { nova_group: 2, ...base, is_fvl: false };
  if (ULTRA_RE.test(hay)) return { nova_group: 4, ...base };
  // Whole/minimally processed: generic name prefix (e.g. "fresh herb …"), OR an
  // unambiguous whole-food category with no processing marker in the name
  // (catches plain produce like "banana" / "fresh spinach").
  if (WHOLE_RE.test(n) || (WHOLE_CATEGORY_RE.test(cat) && !PROCESSED_NAME_RE.test(n)))
    return { nova_group: 1, ...base };
  return null; // ambiguous → LLM
}

async function llmClassify(name: string, onUsage?: (u: unknown) => void): Promise<Classification> {
  const { object, usage } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: NovaSchema,
    system:
      "Classify a single food/drink ingredient for nutrition scoring. nova_group: 1 unprocessed/minimally processed (fresh produce, nuts, plain dairy, herbs, water), 2 processed culinary (oils, butter, honey, syrups, nut butters, dried whole-food powders), 3 processed foods (canned goods, cheese, plant milks, bread), 4 ultra-processed (flavored syrups, artificial sweeteners, protein powders with additives, packaged mixes). is_fvl: is it a whole fruit, vegetable, or legume (not a juice/sweetener). is_added_sweetener: honey/syrup/agave/added sugar. is_sweetener_nnutritive: stevia/sucralose/etc. iron_rich: notably iron-rich.",
    prompt: `Ingredient: "${name}"`,
  });
  onUsage?.(usage);
  return { ...object, needs_review: false };
}

// ── Zero-nutrient items ──────────────────────────────────────────────────────
// Water and ice contribute mass (which dilutes the per-100 standardisation) but
// NO nutrients. USDA search matches them to unrelated foods — "ice cubes" once
// resolved to a food with 28.8 g protein / 187 kcal per 100 g, which at 120 g of
// a 512 g drink supplied 86% of the recipe's protein and pinned protein/energy
// points at max. These are decided here and never looked up.
//
// Deliberately narrow: `coconut water`, `rose water`, `milk or water` etc. carry
// real nutrients and must NOT match.
const PURE_WATER_RE =
  /^(a few |some |cold |warm |hot |boiling |filtered |plain |sparkling |tap |crushed |cubed )*(ice|water|ice cubes?|water cubes?)$/;
const SALT_RE = /^(a )?(pinch of |dash of )?(fine |coarse |flaky |sea |table |kosher |himalayan |pink )*salt$/;

/** Salt: no calories or protein, but real sodium — it drives `salt_points`. */
const SALT_SODIUM_MG_PER_100G = 38758; // USDA "Salt, table" (FDC 173468)

const ZERO_NUTRIENTS = {
  energy_kcal: 0, protein_g: 0, total_fat_g: 0, sat_fat_g: 0, carbs_g: 0,
  fiber_g: 0, total_sugar_g: 0, sodium_mg: 0, calcium_dv: 0, vitamin_c_dv: 0,
  iron_mg: 0, water_pct: 0,
};

/**
 * Known zero-calorie ingredients, resolved without USDA. Returns null when the
 * name isn't one. Pure + exported so the regressions are unit-testable.
 */
export function zeroNutrientProfile(
  key: string,
): (typeof ZERO_NUTRIENTS & { water_pct: number; sodium_mg: number }) | null {
  const k = key.toLowerCase().trim();
  if (PURE_WATER_RE.test(k)) return { ...ZERO_NUTRIENTS, water_pct: 100 };
  if (SALT_RE.test(k)) return { ...ZERO_NUTRIENTS, sodium_mg: SALT_SODIUM_MG_PER_100G };
  return null;
}

// ── USDA match selection ─────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "fresh", "raw", "whole", "of", "a", "the", "or", "and", "chopped", "sliced",
  "peeled", "pitted", "frozen", "large", "small", "medium", "optional", "for",
  "unsweetened", "organic", "ripe", "cubes", "cube", "piece", "pieces",
]);
// Crude singularisation: USDA descriptions are pluralised ("Bananas, raw",
// "Nuts, almonds"), so without this a query for "banana" would overlap nothing
// and be rejected as spurious.
const singular = (t: string) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
      .map(singular),
  );

// Recipe phrasing → the core food noun. USDA search is literal: "chopped apple"
// returns "Lamb, chop"/"Veal, chop" (it matches "chop"), and "medium beetroots"
// returns "Rye flour, medium". Stripping preparation/size words is what makes the
// search return the actual food.
const DESCRIPTORS =
  /\b(a|few|some|medium|small|large|extra|fresh|frozen|chopped|peeled|sliced|diced|quartered|halved|scrubbed|crushed|cored|pitted|shredded|grated|minced|whole|raw|ripe|dried|ground|packed|heaping|level|thinly|roughly|finely|unsweetened|sweetened|organic|plain|cold|hot|warm|boiling|optional|garnish|taste|adjust|to|for|of|about|approx|approximately|sticks?|bags?|pieces?|scoops?|pinch|dash|handful|cubes?|slices?|wedges?|loose|leaf)\b/g;

/** Vocabulary the recipes use vs. what USDA calls it. */
const SYNONYMS: Record<string, string> = {
  beetroot: "beets",
  beetroots: "beets",
  coriander: "cilantro",
  rocket: "arugula",
  aubergine: "eggplant",
  courgette: "zucchini",
  cacao: "cocoa",
  "acv": "apple cider vinegar",
};

/** Reduce an ingredient label to the searchable food noun. */
export function cleanQuery(name: string): string {
  let s = name.toLowerCase();
  // "X or Y" → X (recipes offer alternatives; score the first).
  s = s.split(/\bor\b/)[0];
  s = s
    .replace(/\([^)]*\)/g, " ")
    .replace(DESCRIPTORS, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const mapped = s
    .split(" ")
    .map((w) => SYNONYMS[w] ?? w)
    .join(" ")
    .trim();
  return mapped || name.toLowerCase().trim();
}

/**
 * Pick the best candidate. USDA descriptions are "Food, qualifier, qualifier",
 * so the segment BEFORE the first comma is the actual food — "Apples, raw" is an
 * apple, "Croissants, apple" is a croissant. Requiring the query noun to appear
 * in that head segment is what separates them; plain token overlap accepts both.
 *
 * Returns null when no candidate head-matches — the signature of a spurious match
 * (the "ice cubes" → protein-food case) — so the caller flags it for review
 * rather than silently storing nonsense.
 */
// Products DERIVED from a food. If one of these appears in the description but
// wasn't asked for, the candidate is a different food: "Walnut oil" ≠ walnuts,
// "Croissants, apple" ≠ apple. Asking for "almond butter" or "walnut oil"
// explicitly puts the word in the query, so no penalty applies.
// Also covers unrequested PROCESSING/flavouring: "Walnuts, honey roasted" and
// "Almond milk, chocolate" are not what a recipe calling for walnuts or almond
// milk means.
const DERIVED =
  /\b(oil|butter|juice|flour|powder|paste|milk|cream|syrup|sauce|bread|cake|pie|croissant|strudel|candy|snack|soup|salad|sandwich|pizza|cookie|dessert|pudding|jam|jelly|wine|beer|chips?|bars?|roasted|toasted|salted|unsalted|sweetened|chocolate|vanilla|flavou?red|canned|cooked|fried|smoked|blanched|candied|glazed|seasoned|honey|sugars?)\b/g;

// USDA files many whole foods under a category head. These are legitimate
// containers; any other head means the candidate is a different food.
const CATEGORY_HEADS = new Set([
  "nut", "seed", "spice", "herb", "tea", "oil", "milk", "yogurt", "cheese",
  "fruit", "vegetable", "beverage", "cereal", "grain", "flour", "bean",
  "legume", "fish", "egg", "juice", "water",
]);

export function pickBestFood<T extends { description?: string }>(
  query: string,
  foods: T[],
): T | null {
  const q = tokens(query);
  if (q.size === 0) return foods[0] ?? null;
  const qRaw = query.toLowerCase();
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const f of foods) {
    const desc = f.description ?? "";
    const [head, ...rest] = desc.split(",");
    const headTokens = tokens(head);
    const restTokens = tokens(rest.join(" "));
    let headHits = 0;
    let restHits = 0;
    for (const t of q) {
      if (headTokens.has(t)) headHits++;
      else if (restTokens.has(t)) restHits++;
    }
    // The food must either BE the head ("Apples, raw") or sit under a genuine
    // USDA category head ("Nuts, walnuts", "Spices, cinnamon", "Tea, chamomile").
    // Anything else naming the food only as a flavour is a different product:
    // "Waffle, cinnamon", "Croissants, apple", "Candies, …NIBS…".
    const headIsCategory = [...headTokens].some((t) => CATEGORY_HEADS.has(t));
    if (headHits === 0 && !(headIsCategory && restHits > 0)) continue;

    // Unrequested derived products are a different food entirely.
    const derived = (desc.toLowerCase().match(DERIVED) ?? []).filter(
      (w) => !qRaw.includes(w.replace(/s$/, "")),
    ).length;
    // Head match is strongest, but a category head ("Nuts, walnuts, english")
    // still counts via restHits — hence both are scored rather than gating.
    const rawBonus = /\braw\b/i.test(desc) ? 5 : 0;
    const score =
      headHits * 100 + restHits * 40 - derived * 60 - rest.length + rawBonus;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return bestScore > 0 ? best : null;
}

// ── Resolve one ingredient (cached in `ingredients`) ─────────────────────────
export async function resolveIngredient(
  admin: DB,
  name: string,
  opts: ResolveOptions = {},
): Promise<IngredientRow | null> {
  const key = name.toLowerCase().trim();
  if (!key) return null;
  const cache = opts.cache;

  // Zero-nutrient items are decided BEFORE any cache lookup, so a row poisoned by
  // an earlier run (when this rule didn't exist) can never win — `ingredients` is
  // a permanent cache, which previously made such corruption unfixable.
  const zero = zeroNutrientProfile(key);
  if (zero) {
    const row = {
      name: key, nova_group: 1, is_fvl: false, iron_rich: false,
      is_added_sweetener: false, is_sweetener_nnutritive: false, ...zero,
    };
    if (opts.dryRun) {
      const t: IngredientRow = { id: `dry-${key}`, needs_review: false, ...row };
      cache?.set(key, t);
      return t;
    }
    const { data: up, error } = await admin
      .from("ingredients")
      .upsert({ ...row, fdc_id: null, needs_review: false, verified_at: new Date().toISOString(), calorie_density: 0 }, { onConflict: "name" })
      .select("*")
      .single();
    if (error) throw new Error(`zero-nutrient upsert failed: ${error.message}`);
    const saved = up as IngredientRow;
    cache?.set(key, saved);
    return saved;
  }

  if (cache?.has(key)) return cache.get(key)!;

  // Cache miss with no process cache → check the DB for an existing row first
  // (skipped by --refresh, which forces a fresh USDA resolution).
  if (!cache && !opts.refresh) {
    const { data: existing } = await admin
      .from("ingredients")
      .select("*")
      .eq("name", key)
      .maybeSingle();
    if (existing) return existing as IngredientRow;
  }

  // Search the core food noun, not the recipe phrasing, and over a wider pool —
  // USDA ranks prepared products above raw foods ("apple" → "Croissants, apple"),
  // so the real match is often outside the top 3.
  const q = cleanQuery(name);
  let n: Partial<Record<string, number>> = {};
  let fdc: number | null = null;
  let category = "";
  let usdaFailed = false;
  try {
    const foods = q ? await searchFoods(q, 25) : [];
    // Head-noun match, not blind first hit; null means no candidate is credible.
    const top = pickBestFood(q, foods);
    if (top) {
      fdc = top.fdcId;
      category = top.foodCategory ?? "";
      const [full] = await getFoods([top.fdcId]);
      n = extractNutrients((full ?? top).foodNutrients ?? []);
    } else {
      usdaFailed = true; // no match, or none plausible → zeros + needs_review
    }
  } catch {
    usdaFailed = true; // one bad ingredient must not abort the run — flag it
  }

  let cls = heuristicClassify(name, category);
  if (!cls) {
    try {
      cls = await llmClassify(name, opts.onClassifyUsage);
    } catch {
      cls = { nova_group: 3, is_fvl: false, is_added_sweetener: false, is_sweetener_nnutritive: false, iron_rich: false, needs_review: true };
    }
  }
  const needs_review = cls.needs_review || usdaFailed;

  const row: Omit<IngredientRow, "id" | "needs_review"> = {
    name: key,
    nova_group: cls.nova_group,
    is_fvl: cls.is_fvl,
    iron_rich: cls.iron_rich,
    is_added_sweetener: cls.is_added_sweetener,
    is_sweetener_nnutritive: cls.is_sweetener_nnutritive,
    energy_kcal: n.energy_kcal ?? 0,
    protein_g: n.protein_g ?? 0,
    total_fat_g: n.total_fat_g ?? 0,
    sat_fat_g: n.sat_fat_g ?? 0,
    carbs_g: n.carbs_g ?? 0,
    fiber_g: n.fiber_g ?? 0,
    total_sugar_g: n.total_sugar_g ?? 0,
    sodium_mg: n.sodium_mg ?? 0,
    calcium_dv: ((n.calcium_mg ?? 0) / DAILY_VALUES.calcium_mg) * 100,
    vitamin_c_dv: ((n.vitamin_c_mg ?? 0) / DAILY_VALUES.vitamin_c_mg) * 100,
    iron_mg: n.iron_mg ?? 0,
    water_pct: n.water_g ?? 0,
  };

  if (opts.dryRun) {
    const tmp: IngredientRow = { id: `dry-${key}`, needs_review, ...row };
    cache?.set(key, tmp);
    return tmp;
  }
  const { data: up, error: upErr } = await admin
    .from("ingredients")
    .upsert({ ...row, fdc_id: fdc, needs_review, verified_at: new Date().toISOString(), calorie_density: row.energy_kcal }, { onConflict: "name" })
    .select("*")
    .single();
  if (upErr) throw new Error(`ingredient upsert failed: ${upErr.message}`);
  const saved = up as IngredientRow;
  cache?.set(key, saved);
  return saved;
}

function toResolved(ing: IngredientRow, grams: number): ResolvedIngredient {
  return {
    name: ing.name, grams, nova_group: ing.nova_group, is_fvl: ing.is_fvl,
    iron_rich: ing.iron_rich, is_added_sweetener: ing.is_added_sweetener,
    is_sweetener_nnutritive: ing.is_sweetener_nnutritive,
    energy_kcal: ing.energy_kcal, protein_g: ing.protein_g, total_fat_g: ing.total_fat_g,
    sat_fat_g: ing.sat_fat_g, carbs_g: ing.carbs_g, fiber_g: ing.fiber_g,
    total_sugar_g: ing.total_sugar_g, sodium_mg: ing.sodium_mg, calcium_dv: ing.calcium_dv,
    vitamin_c_dv: ing.vitamin_c_dv, iron_mg: ing.iron_mg, water_pct: ing.water_pct,
  };
}

/**
 * Resolve every ingredient of a recipe and (unless dryRun) rewrite its
 * `recipe_ingredients`. Returns the resolved list for rollupRecipe() plus a list
 * of labels flagged for manual review (unresolvable unit / no USDA match).
 */
export async function resolveRecipeIngredients(
  admin: DB,
  recipe: { id: string; ingredients: unknown },
  opts: ResolveOptions = {},
): Promise<{ resolved: ResolvedIngredient[]; review: string[] }> {
  const labels = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as Array<{ label?: string }>).map((i) => i?.label ?? "").filter(Boolean)
    : [];

  const resolved: ResolvedIngredient[] = [];
  const review: string[] = [];
  const linkRows: Array<Record<string, unknown>> = [];
  let pos = 0;
  for (const label of labels) {
    const parsed = parseIngredient(label);
    const g = toGrams(parsed);
    const ing = parsed.name ? await resolveIngredient(admin, parsed.name, opts) : null;
    if (ing?.needs_review || g.needsReview) review.push(label);
    linkRows.push({
      recipe_id: recipe.id,
      ingredient_id: ing && !ing.id.startsWith("dry-") ? ing.id : null,
      raw_label: label, quantity: parsed.quantity, unit: parsed.unit, grams: g.grams,
      position: pos++, needs_review: !!(g.needsReview || ing?.needs_review),
    });
    if (ing && g.grams != null) resolved.push(toResolved(ing, g.grams));
  }

  if (!opts.dryRun) {
    await admin.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);
    if (linkRows.length) await admin.from("recipe_ingredients").insert(linkRows);
  }

  return { resolved, review };
}
