import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIngredient } from "./parse-ingredient";
import { toGrams } from "./units";
import { searchFoods, getFoods } from "./client";
import { extractNutrients, deriveComposites, DAILY_VALUES } from "./nutrient-ids";
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
  potassium_mg: number;
  is_probiotic: boolean;
  magnesium_dv: number | null;
  zinc_dv: number | null;
  omega3_g: number | null;
  tryptophan_g: number | null;
  b_vitamin_dv: number | null;
}

export interface ResolveOptions {
  cache?: Map<string, IngredientRow>;
  dryRun?: boolean;
  refresh?: boolean;
  onClassifyUsage?: (usage: unknown) => void;
}

const FVL_CATEGORIES = /fruit|vegetable|legume|bean|pea|lentil/i;
const SWEETENER_RE = /honey|syrup|agave|molasses|sugar|nectar|juice concentrate/i;
const NNUTRITIVE_RE = /stevia|sucralose|aspartame|erythritol|monk fruit|xylitol|saccharin/i;
const IRON_RICH_RE = /spinach|lentil|beef|liver|tofu|pumpkin seed|chickpea|kale|molasses|fortified/i;
const PROBIOTIC_RE = /yogurt|yoghurt|kefir|kimchi|miso|sauerkraut|kombucha|tempeh|natto/i;
const WHOLE_RE = /^(fresh |raw |whole )?(fruit|vegetable|leafy|herb|nut|seed|spice|water|ice)/i;
const ULTRA_RE = /powder|protein|flavored|syrup|artificial|isolate|mix\b/i;

const NovaSchema = z.object({
  nova_group: z.number().int().min(1).max(4),
  is_fvl: z.boolean(),
  is_added_sweetener: z.boolean(),
  is_sweetener_nnutritive: z.boolean(),
  iron_rich: z.boolean(),
  is_probiotic: z.boolean(),
});
type Classification = z.infer<typeof NovaSchema> & { needs_review: boolean };

const WHOLE_CATEGORY_RE = /fruits|vegetables|legumes|nut and seed|spices and herbs/i;
const PROCESSED_NAME_RE = /juice|syrup|powder|canned|dried|concentrate|extract|flavored|sweetened|milk|butter/i;

export function heuristicClassify(name: string, usdaCategory: string): Classification | null {
  const n = name.toLowerCase();
  const cat = usdaCategory.toLowerCase();
  const hay = `${n} ${cat}`;
  const is_added_sweetener = SWEETENER_RE.test(hay) && !/whole|fresh fruit/.test(hay);
  const is_sweetener_nnutritive = NNUTRITIVE_RE.test(hay);
  const iron_rich = IRON_RICH_RE.test(hay);
  const is_probiotic = PROBIOTIC_RE.test(hay);
  const is_fvl = FVL_CATEGORIES.test(hay) && !is_added_sweetener;
  const base = { is_fvl, is_added_sweetener, is_sweetener_nnutritive, iron_rich, is_probiotic, needs_review: false };

  if (is_sweetener_nnutritive || /flavored|artificial/.test(hay)) return { nova_group: 4, ...base };
  if (is_added_sweetener) return { nova_group: 2, ...base, is_fvl: false };
  if (ULTRA_RE.test(hay)) return { nova_group: 4, ...base };
  if (WHOLE_RE.test(n) || (WHOLE_CATEGORY_RE.test(cat) && !PROCESSED_NAME_RE.test(n)))
    return { nova_group: 1, ...base };
  return null;
}

async function llmClassify(name: string, onUsage?: (u: unknown) => void): Promise<Classification> {
  const { object, usage } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: NovaSchema,
    system:
      "Classify a single food/drink ingredient for nutrition scoring. nova_group: 1 unprocessed/minimally processed (fresh produce, nuts, plain dairy, herbs, water), 2 processed culinary (oils, butter, honey, syrups, nut butters, dried whole-food powders), 3 processed foods (canned goods, cheese, plant milks, bread), 4 ultra-processed (flavored syrups, artificial sweeteners, protein powders with additives, packaged mixes). is_fvl: is it a whole fruit, vegetable, or legume (not a juice/sweetener). is_added_sweetener: honey/syrup/agave/added sugar. is_sweetener_nnutritive: stevia/sucralose/etc. iron_rich: notably iron-rich. is_probiotic: is it a fermented/live-culture food (yogurt, kefir, kimchi, miso, sauerkraut, kombucha, tempeh, natto).",
    prompt: `Ingredient: "${name}"`,
  });
  onUsage?.(usage);
  return { ...object, needs_review: false };
}

const PURE_WATER_RE =
  /^(a few |some |cold |warm |hot |boiling |filtered |plain |sparkling |tap |crushed |cubed )*(ice|water|ice cubes?|water cubes?)$/;
const SALT_RE = /^(a )?(pinch of |dash of )?(fine |coarse |flaky |sea |table |kosher |himalayan |pink )*salt$/;

const SALT_SODIUM_MG_PER_100G = 38758;

const ZERO_NUTRIENTS = {
  energy_kcal: 0, protein_g: 0, total_fat_g: 0, sat_fat_g: 0, carbs_g: 0,
  fiber_g: 0, total_sugar_g: 0, sodium_mg: 0, calcium_dv: 0, vitamin_c_dv: 0,
  iron_mg: 0, water_pct: 0, potassium_mg: 0,
  magnesium_dv: 0, zinc_dv: 0, omega3_g: 0, tryptophan_g: 0, b_vitamin_dv: 0,
};

/** Zero-nutrient profile for plain water and salt, resolved without USDA. */
export function zeroNutrientProfile(
  key: string,
): (typeof ZERO_NUTRIENTS & { water_pct: number; sodium_mg: number }) | null {
  const k = key.toLowerCase().trim();
  if (PURE_WATER_RE.test(k)) return { ...ZERO_NUTRIENTS, water_pct: 100 };
  if (SALT_RE.test(k)) return { ...ZERO_NUTRIENTS, sodium_mg: SALT_SODIUM_MG_PER_100G };
  return null;
}

const STOP_WORDS = new Set([
  "fresh", "raw", "whole", "of", "a", "the", "or", "and", "chopped", "sliced",
  "peeled", "pitted", "frozen", "large", "small", "medium", "optional", "for",
  "unsweetened", "organic", "ripe", "cubes", "cube", "piece", "pieces",
]);
const singular = (t: string) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
      .map(singular),
  );

const DESCRIPTORS =
  /\b(a|few|some|medium|small|large|extra|fresh|frozen|chopped|peeled|sliced|diced|quartered|halved|scrubbed|crushed|cored|pitted|shredded|grated|minced|whole|raw|ripe|dried|ground|packed|heaping|level|thinly|roughly|finely|unsweetened|sweetened|organic|plain|cold|hot|warm|boiling|optional|garnish|taste|adjust|to|for|of|about|approx|approximately|sticks?|bags?|pieces?|scoops?|pinch|dash|handful|cubes?|slices?|wedges?|loose|leaf)\b/g;

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

export function cleanQuery(name: string): string {
  let s = name.toLowerCase();
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

const DERIVED =
  /\b(oil|butter|juice|flour|powder|paste|milk|cream|syrup|sauce|bread|cake|pie|croissant|strudel|candy|snack|soup|salad|sandwich|pizza|cookie|dessert|pudding|jam|jelly|wine|beer|chips?|bars?|roasted|toasted|salted|unsalted|sweetened|chocolate|vanilla|flavou?red|canned|cooked|fried|smoked|blanched|candied|glazed|seasoned|honey|sugars?)\b/g;

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
    const headIsCategory = [...headTokens].some((t) => CATEGORY_HEADS.has(t));
    if (headHits === 0 && !(headIsCategory && restHits > 0)) continue;

    const derived = (desc.toLowerCase().match(DERIVED) ?? []).filter(
      (w) => !qRaw.includes(w.replace(/s$/, "")),
    ).length;
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

/** Resolves one ingredient to a cached USDA-backed row. */
export async function resolveIngredient(
  admin: DB,
  name: string,
  opts: ResolveOptions = {},
): Promise<IngredientRow | null> {
  const key = name.toLowerCase().trim();
  if (!key) return null;
  const cache = opts.cache;

  const zero = zeroNutrientProfile(key);
  if (zero) {
    const row = {
      name: key, nova_group: 1, is_fvl: false, iron_rich: false,
      is_added_sweetener: false, is_sweetener_nnutritive: false, is_probiotic: false, ...zero,
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

  if (!cache && !opts.refresh) {
    const { data: existing } = await admin
      .from("ingredients")
      .select("*")
      .eq("name", key)
      .maybeSingle();
    if (existing) return existing as IngredientRow;
  }

  const q = cleanQuery(name);
  let n: Partial<Record<string, number>> = {};
  let fdc: number | null = null;
  let category = "";
  let usdaFailed = false;
  try {
    const foods = q ? await searchFoods(q, 25) : [];
    const top = pickBestFood(q, foods);
    if (top) {
      fdc = top.fdcId;
      category = top.foodCategory ?? "";
      const [full] = await getFoods([top.fdcId]);
      n = extractNutrients((full ?? top).foodNutrients ?? []);
    } else {
      usdaFailed = true;
    }
  } catch {
    usdaFailed = true;
  }

  let cls = heuristicClassify(name, category);
  if (!cls) {
    try {
      cls = await llmClassify(name, opts.onClassifyUsage);
    } catch {
      cls = { nova_group: 3, is_fvl: false, is_added_sweetener: false, is_sweetener_nnutritive: false, iron_rich: false, is_probiotic: PROBIOTIC_RE.test(name), needs_review: true };
    }
  }
  const needs_review = cls.needs_review || usdaFailed;

  const composites = deriveComposites(n);
  const dv = (raw: number | undefined, daily: number): number | null =>
    typeof raw === "number" && Number.isFinite(raw) ? (raw / daily) * 100 : null;

  const row: Omit<IngredientRow, "id" | "needs_review"> = {
    name: key,
    nova_group: cls.nova_group,
    is_fvl: cls.is_fvl,
    iron_rich: cls.iron_rich,
    is_added_sweetener: cls.is_added_sweetener,
    is_sweetener_nnutritive: cls.is_sweetener_nnutritive,
    is_probiotic: cls.is_probiotic,
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
    potassium_mg: n.potassium_mg ?? 0,
    magnesium_dv: dv(n.magnesium_mg, DAILY_VALUES.magnesium_mg),
    zinc_dv: dv(n.zinc_mg, DAILY_VALUES.zinc_mg),
    omega3_g: composites.omega3_g ?? null,
    tryptophan_g: n.tryptophan_g ?? null,
    b_vitamin_dv: composites.b_vitamin_dv ?? null,
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
    potassium_mg: ing.potassium_mg, is_probiotic: ing.is_probiotic,
  };
}

/** Resolves a recipe's ingredients and rewrites recipe_ingredients. */
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
