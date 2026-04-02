// lib/nura-dummy-data.ts
// Replace all static data here with Supabase queries in production.

// ─── Types ───────────────────────────────────────────────────────────────────

export type GuideType = "risk_list" | "article" | "remedies";

export interface FilterPill {
  value: string;
  label: string;
}

export interface Category {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  filterGroup: string;
}

export interface Recipe {
  id: string;
  slug: string;
  categorySlug: string;
  title: string;
  imageUrl?: string;
  description: string;
  previewIngredients: string[];
  recipeTitle: string;
  ingredients: { icon: string; label: string }[];
  howToMake: string[];
  whyItWorks: string;
  insideTip: string;
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  level: 1 | 2 | 3;
  riskLabel: "High Risk" | "Medium Risk" | "Low Risk";
  cancerType: string;
  risksFrom: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  type: GuideType;
  followUpQuestions: string[];
  // type === "risk_list"
  riskItems?: RiskItem[];
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

export const filterPills: FilterPill[] = [
  { value: "all", label: "All" },
  { value: "heart", label: "Heart" },
  { value: "weight", label: "Weight" },
  { value: "liver-kidney", label: "Liver/Kidney" },
  { value: "detoxing", label: "Detoxing" },
];

// ─── Categories ──────────────────────────────────────────────────────────────

export const dummyCategories: Category[] = [
  { id: "cat-1", slug: "detoxing", title: "Detoxing", filterGroup: "detoxing" },
  {
    id: "cat-2",
    slug: "heart-health",
    title: "Heart Health",
    filterGroup: "heart",
  },
  {
    id: "cat-3",
    slug: "weight-loss",
    title: "Weight Loss",
    filterGroup: "weight",
  },
  {
    id: "cat-4",
    slug: "liver-kidney",
    title: "Liver & Kidney",
    filterGroup: "liver-kidney",
  },
  { id: "cat-5", slug: "anti-aging", title: "Anti-Aging", filterGroup: "all" },
  {
    id: "cat-6",
    slug: "immunity",
    title: "Immunity Boost",
    filterGroup: "all",
  },
];

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const dummyRecipes: Recipe[] = [
  {
    id: "rec-1",
    slug: "rec-1",
    categorySlug: "detoxing",
    title: "Healthy Juice Cleanses",
    description:
      "The body naturally detoxifies itself constantly via the liver, kidneys, lungs, intestines, and skin.",
    previewIngredients: ["Roots & Spices", "Citrus", "Detox Boosters"],
    recipeTitle: "Green Detox Juice Recipe",
    ingredients: [
      { icon: "🥬", label: "1 cup spinach" },
      { icon: "🥒", label: "Half cucumber" },
      { icon: "🍏", label: "1 green apple" },
      { icon: "🍋", label: "Half lemon (juice)" },
      { icon: "🌿", label: "Fresh mint leaves" },
      { icon: "🥥", label: "Half cup coconut water" },
    ],
    howToMake: [
      "Wash Thoroughly: rinse all produce under cold running water.",
      "Prep Produce: core the apple, peel the lemon, roughly chop cucumber.",
      "Juice Order: start with leafy greens, then soft produce, then hard items.",
      "Storage: drink immediately or refrigerate in an airtight jar for up to 24 hrs.",
    ],
    whyItWorks:
      "Spinach and cucumber are excellent for hydration and cleansing because they have a high water content and lots of essential minerals. Green apples add a low glycemic touch of sweetness, while lemon juice contains antioxidants and can even prevent some kidney stone formation. Coconut water replenishes your electrolytes.",
    insideTip:
      "Maximize nutrient retention by using a Hurom juicer. Our patented Slow Squeeze Technology means all your nutrients get inside your glass of juice – and not in the pulp collector.",
  },
  {
    id: "rec-2",
    slug: "rec-2",
    categorySlug: "detoxing",
    title: "Body Detox",
    description:
      "A powerful blend that supports your body's natural detox pathways.",
    previewIngredients: [
      "1 green apple",
      "Half lemon (juice)",
      "1 cup spinach",
    ],
    recipeTitle: "Body Detox Blend",
    ingredients: [
      { icon: "🍏", label: "1 green apple" },
      { icon: "🍋", label: "Half lemon (juice)" },
      { icon: "🥬", label: "1 cup spinach" },
      { icon: "🫚", label: "1 tbsp flaxseed oil" },
      { icon: "💧", label: "1 cup filtered water" },
    ],
    howToMake: [
      "Prep: peel and core apple, squeeze lemon.",
      "Blend: combine all ingredients in a high-speed blender.",
      "Strain: pour through a fine mesh sieve if desired.",
      "Serve: enjoy immediately over ice.",
    ],
    whyItWorks:
      "Green apples provide pectin which binds to toxins in the digestive tract. Lemon juice stimulates liver enzyme production and alkalises the body. Spinach delivers chlorophyll which acts as a natural cleanser.",
    insideTip:
      "Add a pinch of activated charcoal powder for an extra detox boost — it binds to toxins before they can be absorbed.",
  },
  {
    id: "rec-3",
    slug: "rec-3",
    categorySlug: "heart-health",
    title: "Beet Heart Tonic",
    description:
      "Naturally lowers blood pressure and supports cardiovascular health.",
    previewIngredients: ["Beets", "Ginger", "Pomegranate"],
    recipeTitle: "Heart Beet Tonic Recipe",
    ingredients: [
      { icon: "🫀", label: "2 medium beets" },
      { icon: "🫚", label: "1 tbsp ginger root" },
      { icon: "🍎", label: "1 pomegranate (seeds)" },
      { icon: "🍋", label: "Juice of 1 lemon" },
    ],
    howToMake: [
      "Peel and chop beets and ginger.",
      "Juice beets and ginger first.",
      "Add pomegranate seeds and lemon juice.",
      "Stir well and serve chilled.",
    ],
    whyItWorks:
      "Beets are rich in nitrates which the body converts to nitric oxide, relaxing blood vessels and lowering blood pressure. Pomegranate polyphenols reduce LDL oxidation.",
    insideTip:
      "Drink this tonic 2–3 hours before exercise for a natural performance boost.",
  },
];

// ─── Guides ───────────────────────────────────────────────────────────────────

export const dummyGuides: Guide[] = [
  {
    slug: "high-cancer-risks",
    title: "High Cancer Risks",
    type: "risk_list",
    description:
      "The body naturally detoxifies itself constantly via the liver, kidneys, lungs, intestines, and skin.",
    followUpQuestions: [
      "Does my body actually need a detox?",
      "How long will the detox take and is it sustainable?",
      "Are specialized detox diets or cleanses safe for me?",
      "What are the best foods to include in a detox diet?",
    ],
    riskItems: [
      {
        id: "risk-1",
        title: "Plastic Food Container",
        description: "Effect and cancer type description here...",
        level: 1,
        riskLabel: "High Risk",
        cancerType: "Breast / Lungs",
        risksFrom: "Daily Spray / Enclosed Spaces",
      },
      {
        id: "risk-2",
        title: "Air Fresheners",
        description: "Effect and cancer type description here...",
        level: 3,
        riskLabel: "Low Risk",
        cancerType: "Breast / Lungs",
        risksFrom: "Daily Spray / Enclosed Spaces",
      },
      {
        id: "risk-3",
        title: "Processed Meats",
        description: "Effect and cancer type description here...",
        level: 2,
        riskLabel: "Medium Risk",
        cancerType: "Breast / Lungs",
        risksFrom: "Daily Spray / Enclosed Spaces",
      },
      {
        id: "risk-4",
        title: "Non-Stick Pans",
        description: "Effect and cancer type description here...",
        level: 3,
        riskLabel: "Low Risk",
        cancerType: "Breast / Lungs",
        risksFrom: "Daily Spray / Enclosed Spaces",
      },
    ],
  },
  {
    slug: "remedies-and-preventions",
    title: "Remedies & Preventions",
    type: "remedies",
    description:
      "Evidence-based remedies and preventive strategies for long-term wellness.",
    followUpQuestions: [
      "Which remedies are safe for daily use?",
      "How do I know if a remedy is working?",
      "Can I combine multiple remedies safely?",
      "What's the difference between a remedy and a prevention?",
    ],
  },
  {
    slug: "recipes",
    title: "Recipes",
    type: "article",
    description: "Curated wellness recipes for your long-term health goals.",
    followUpQuestions: [
      "How often should I make these recipes?",
      "Can I substitute ingredients?",
      "Are these recipes suitable for children?",
      "What are the best recipes for weight loss?",
    ],
  },
];

// ─── Explore More items (maps directly to guide slugs) ────────────────────────

export const exploreMoreItems = dummyGuides.map((g) => ({
  id: g.slug,
  title: g.title,
  description: g.description,
  href: `/guides/${g.slug}`,
}));

// ─── Shared follow-up questions ───────────────────────────────────────────────

export const defaultFollowUpQuestions = [
  "Does my body actually need a detox?",
  "How long will the detox take and is it sustainable?",
  "Are specialized detox diets or cleanses safe for me?",
  "What are the best foods to include in a detox diet?",
];
