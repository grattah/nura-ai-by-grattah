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

// ── Resolve one ingredient (cached in `ingredients`) ─────────────────────────
export async function resolveIngredient(
  admin: DB,
  name: string,
  opts: ResolveOptions = {},
): Promise<IngredientRow | null> {
  const key = name.toLowerCase().trim();
  if (!key) return null;
  const cache = opts.cache;
  if (cache?.has(key)) return cache.get(key)!;

  // Cache miss with no process cache → check the DB for an existing row first.
  if (!cache) {
    const { data: existing } = await admin
      .from("ingredients")
      .select("*")
      .eq("name", key)
      .maybeSingle();
    if (existing) return existing as IngredientRow;
  }

  // Pure water / ice: skip USDA (it 400s on "ice cubes") — it's just water.
  if (/\bice\b/.test(key) || /^(cold |warm |hot |filtered )?water$/.test(key)) {
    const water = {
      name: key, nova_group: 1, is_fvl: false, iron_rich: false,
      is_added_sweetener: false, is_sweetener_nnutritive: false,
      energy_kcal: 0, protein_g: 0, total_fat_g: 0, sat_fat_g: 0, carbs_g: 0,
      fiber_g: 0, total_sugar_g: 0, sodium_mg: 0, calcium_dv: 0, vitamin_c_dv: 0,
      iron_mg: 0, water_pct: 100,
    };
    if (opts.dryRun) {
      const t: IngredientRow = { id: `dry-${key}`, needs_review: false, ...water };
      cache?.set(key, t);
      return t;
    }
    const { data: up, error } = await admin
      .from("ingredients")
      .upsert({ ...water, fdc_id: null, needs_review: false, verified_at: new Date().toISOString(), calorie_density: 0 }, { onConflict: "name" })
      .select("*")
      .single();
    if (error) throw new Error(`water upsert failed: ${error.message}`);
    const saved = up as IngredientRow;
    cache?.set(key, saved);
    return saved;
  }

  const q = name.replace(/\s+/g, " ").trim();
  let n: Partial<Record<string, number>> = {};
  let fdc: number | null = null;
  let category = "";
  let usdaFailed = false;
  try {
    const foods = q ? await searchFoods(q, 3) : [];
    const top = foods[0];
    if (top) {
      fdc = top.fdcId;
      category = top.foodCategory ?? "";
      const [full] = await getFoods([top.fdcId]);
      n = extractNutrients((full ?? top).foodNutrients ?? []);
    } else {
      usdaFailed = true;
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
