// Deterministic ingredient-label parser: "1 cup brewed green tea" →
// { quantity: 1, unit: "cup", name: "brewed green tea" }. No LLM. Handles
// integers, decimals, ASCII fractions ("1/2"), unicode fractions ("½"), mixed
// numbers ("1 ½", "1 1/2"), simple ranges ("1-2" → midpoint), and a canonical
// unit vocabulary. When no leading number is present, quantity defaults to 1.

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null; // canonical unit token, or null for count-based
  name: string; // remaining food name (lowercased, trimmed)
  raw: string;
  gramsHint?: number; // explicit grams from a parenthetical, e.g. "(approx. 25g)"
}

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// Unit synonym → canonical unit. Count-based sizes (small/medium/large) are NOT
// units — they stay with the name so units.ts can do a per-item gram lookup.
const UNIT_SYNONYMS: Record<string, string> = {
  cup: "cup", cups: "cup", c: "cup",
  inch: "inch", inches: "inch",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tb: "tbsp",
  teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp", tsps: "tsp",
  ounce: "oz", ounces: "oz", oz: "oz",
  "fl-oz": "fl_oz", floz: "fl_oz",
  gram: "g", grams: "g", g: "g", gr: "g",
  kilogram: "kg", kilograms: "kg", kg: "kg",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", ml: "ml",
  liter: "l", liters: "l", litre: "l", litres: "l", l: "l",
  pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
  pinch: "pinch", pinches: "pinch",
  dash: "dash", dashes: "dash",
  handful: "handful", handfuls: "handful",
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
  scoop: "scoop", scoops: "scoop",
  can: "can", cans: "can",
  sprig: "sprig", sprigs: "sprig",
  stalk: "stalk", stalks: "stalk",
  piece: "piece", pieces: "piece",
};

function parseNumberToken(token: string): number | null {
  // Unicode fraction (possibly attached: "1½")
  const uniMatch = token.match(/^(\d*)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (uniMatch) {
    const whole = uniMatch[1] ? parseInt(uniMatch[1], 10) : 0;
    return whole + UNICODE_FRACTIONS[uniMatch[2]];
  }
  if (UNICODE_FRACTIONS[token] !== undefined) return UNICODE_FRACTIONS[token];
  // ASCII fraction "1/2"
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const d = parseInt(frac[2], 10);
    return d ? parseInt(frac[1], 10) / d : null;
  }
  // Range "1-2" → midpoint
  const range = token.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  // Plain integer / decimal
  if (/^\d+(?:\.\d+)?$/.test(token)) return parseFloat(token);
  return null;
}

export function parseIngredient(label: string): ParsedIngredient {
  const raw = label;
  const lower = label.toLowerCase();
  // Explicit grams inside a parenthetical, e.g. "(approx. 25g)", "(100g)".
  const hint = lower.match(/\([^)]*?(\d+(?:\.\d+)?)\s*g\b[^)]*?\)/);
  const gramsHint = hint ? parseFloat(hint[1]) : undefined;

  // Normalize: drop parentheticals; strip a "juice of" prefix; split "1-inch"
  // into "1 inch"; drop trailing descriptors after a comma; collapse whitespace.
  const text = lower
    .replace(/\([^)]*\)/g, " ")
    .replace(/^\s*juice of\s+/, " ")
    .replace(/(\d)-(?=[a-z])/g, "$1 ")
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim();

  const tokens = text.split(" ").filter(Boolean);
  let quantity: number | null = null;
  let i = 0;

  // Consume leading numeric tokens (supports "1 1/2", "1 ½").
  while (i < tokens.length) {
    const n = parseNumberToken(tokens[i]);
    if (n === null) break;
    quantity = (quantity ?? 0) + n;
    i++;
  }

  // Optional unit token.
  let unit: string | null = null;
  if (i < tokens.length) {
    const cand = tokens[i].replace(/\.$/, "");
    if (UNIT_SYNONYMS[cand]) {
      unit = UNIT_SYNONYMS[cand];
      i++;
      // Handle "fl oz" written as two tokens.
      if (unit === "oz" && tokens[i - 2] === "fl") unit = "fl_oz";
    } else if (cand === "fl" && UNIT_SYNONYMS[tokens[i + 1]?.replace(/\.$/, "")] === "oz") {
      unit = "fl_oz";
      i += 2;
    }
  }

  const name = tokens
    .slice(i)
    .join(" ")
    .replace(/^(of|piece|pieces)\s+/, "")
    .trim();

  return {
    quantity: quantity ?? (name ? 1 : null),
    unit,
    name,
    raw,
    gramsHint,
  };
}
