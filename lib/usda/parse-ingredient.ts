export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  raw: string;
  gramsHint?: number;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

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
  const uniMatch = token.match(/^(\d*)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (uniMatch) {
    const whole = uniMatch[1] ? parseInt(uniMatch[1], 10) : 0;
    return whole + UNICODE_FRACTIONS[uniMatch[2]];
  }
  if (UNICODE_FRACTIONS[token] !== undefined) return UNICODE_FRACTIONS[token];
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const d = parseInt(frac[2], 10);
    return d ? parseInt(frac[1], 10) / d : null;
  }
  const range = token.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  if (/^\d+(?:\.\d+)?$/.test(token)) return parseFloat(token);
  return null;
}

export function parseIngredient(label: string): ParsedIngredient {
  const raw = label;
  const lower = label.toLowerCase();
  const hint = lower.match(/\([^)]*?(\d+(?:\.\d+)?)\s*g\b[^)]*?\)/);
  const gramsHint = hint ? parseFloat(hint[1]) : undefined;

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

  while (i < tokens.length) {
    const n = parseNumberToken(tokens[i]);
    if (n === null) break;
    quantity = (quantity ?? 0) + n;
    i++;
  }

  let unit: string | null = null;
  if (i < tokens.length) {
    const cand = tokens[i].replace(/\.$/, "");
    if (UNIT_SYNONYMS[cand]) {
      unit = UNIT_SYNONYMS[cand];
      i++;
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
