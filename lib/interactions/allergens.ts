import { ALLERGENS, labelFor } from "@/lib/health-profile/options";

// Deterministic allergen matching (replaces the LLM allergy job). Keyed on the
// 7 ALLERGENS option keys; celiac is treated as a gluten allergy.

const ALLERGEN_ALIASES: Record<string, string[]> = {
  "tree-nuts": [
    "almond",
    "walnut",
    "cashew",
    "pecan",
    "pistachio",
    "hazelnut",
    "macadamia",
    "brazil nut",
    "pine nut",
    "tree nut",
  ],
  peanuts: ["peanut", "groundnut"],
  dairy: [
    "milk",
    "cheese",
    "butter",
    "yogurt",
    "yoghurt",
    "cream",
    "custard",
    "whey",
    "casein",
    "ghee",
    "buttermilk",
    "dairy",
  ],
  gluten: [
    "wheat",
    "barley",
    "rye",
    "malt",
    "spelt",
    "farro",
    "bulgur",
    "semolina",
    "couscous",
    "seitan",
    "gluten",
  ],
  soy: ["soy", "soya", "soybean", "edamame", "tofu", "tempeh", "miso", "tamari"],
  shellfish: [
    "shrimp",
    "prawn",
    "crab",
    "lobster",
    "crayfish",
    "langoustine",
    "scallop",
    "clam",
    "mussel",
    "oyster",
    "squid",
    "calamari",
    "shellfish",
  ],
  eggs: ["egg"],
};

// Dairy terms that also appear in plant products ("almond milk", "peanut
// butter", "coconut cream", "vegan cheese") — skip these when a plant/vegan
// qualifier is present in the same label.
const DAIRY_AMBIGUOUS = new Set([
  "milk",
  "cream",
  "butter",
  "yogurt",
  "yoghurt",
  "custard",
  "cheese",
]);
const PLANT_QUALIFIERS = [
  "almond",
  "oat",
  "soy",
  "soya",
  "coconut",
  "rice",
  "cashew",
  "hemp",
  "pea",
  "macadamia",
  "peanut",
  "sunflower",
  "plant",
  "non-dairy",
  "nondairy",
  "vegan",
  "dairy-free",
  "dairy free",
];

export interface AllergyAlert {
  type: "allergy";
  severity: "avoid";
  label: "Allergy";
  message: string;
}

function labels(ingredients: unknown): string[] {
  return (Array.isArray(ingredients) ? ingredients : [])
    .map((i) => (i as { label?: string })?.label?.toLowerCase().trim())
    .filter((l): l is string => !!l);
}

const hasPlantQualifier = (label: string) =>
  PLANT_QUALIFIERS.some((q) => label.includes(q));

/** Allergy/celiac alerts for a recipe given the user's disclosed allergens. */
export function detectAllergens(
  ingredients: unknown,
  allergenKeys: string[],
  allergiesOther: string,
  celiac: boolean,
): AllergyAlert[] {
  const ls = labels(ingredients);
  if (!ls.length) return [];
  const out: AllergyAlert[] = [];

  const findMatch = (aliases: string[], guardDairy: boolean): string | null => {
    for (const label of ls) {
      for (const alias of aliases) {
        if (!label.includes(alias)) continue;
        if (guardDairy && DAIRY_AMBIGUOUS.has(alias) && hasPlantQualifier(label))
          continue;
        return alias;
      }
    }
    return null;
  };

  for (const key of allergenKeys) {
    const aliases = ALLERGEN_ALIASES[key];
    if (!aliases) continue;
    const matched = findMatch(aliases, key === "dairy");
    if (matched) {
      out.push({
        type: "allergy",
        severity: "avoid",
        label: "Allergy",
        message: `Contains ${matched}. You reported a ${labelFor(
          ALLERGENS,
          key,
        ).toLowerCase()} allergy/intolerance.`,
      });
    }
  }

  // Celiac → gluten (unless the user already disclosed a gluten allergy above).
  if (celiac && !allergenKeys.includes("gluten")) {
    const matched = findMatch(ALLERGEN_ALIASES.gluten, false);
    if (matched) {
      out.push({
        type: "allergy",
        severity: "avoid",
        label: "Allergy",
        message: "Contains gluten. You reported celiac disease.",
      });
    }
  }

  // Free-text "other" allergens.
  for (const raw of allergiesOther.split(/[,\n]/)) {
    const token = raw.trim().toLowerCase();
    if (token.length < 2) continue;
    if (ls.some((l) => l.includes(token))) {
      out.push({
        type: "allergy",
        severity: "avoid",
        label: "Allergy",
        message: `Contains ${token}. You reported it as an allergy/intolerance.`,
      });
    }
  }

  return out;
}
