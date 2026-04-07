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
  tags: string[];
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
  { value: "immunity", label: "Immunity" },
  { value: "digestion", label: "Digestion" },
  { value: "energy", label: "Energy" },
  { value: "skin", label: "Skin" },
  { value: "anti-inflammatory", label: "Anti-Inflammatory" },
  { value: "gut-health", label: "Gut Health" },
  { value: "hydration", label: "Hydration" },
  { value: "brain", label: "Brain" },
  { value: "blood-sugar", label: "Blood Sugar" },
  { value: "bone", label: "Bone" },
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
    slug: "green-detox-juice",
    categorySlug: "detoxing",
    tags: ["detoxing", "hydration"],
    title: "Green Detox Juice",
    description: "Supports natural detox and hydration.",
    previewIngredients: ["Spinach", "Cucumber", "Apple"],
    recipeTitle: "Green Detox Juice Recipe",
    ingredients: [
      { icon: "🥬", label: "1 cup spinach" },
      { icon: "🥒", label: "1 cucumber" },
      { icon: "🍏", label: "1 green apple" },
      { icon: "🍋", label: "Half lemon" },
    ],
    howToMake: [
      "Wash all ingredients.",
      "Chop into pieces.",
      "Blend or juice.",
      "Serve immediately.",
    ],
    whyItWorks:
      "Hydrating ingredients support the body’s natural detox systems.",
    insideTip: "Add ginger for extra anti-inflammatory benefits.",
  },

  {
    id: "rec-2",
    slug: "lemon-detox-water",
    categorySlug: "detoxing",
    tags: ["hydration", "skin"],
    title: "Lemon Detox Water",
    description: "Boosts hydration and skin health.",
    previewIngredients: ["Lemon", "Water", "Mint"],
    recipeTitle: "Lemon Detox Water",
    ingredients: [
      { icon: "🍋", label: "1 lemon" },
      { icon: "💧", label: "2 cups water" },
      { icon: "🌿", label: "Mint leaves" },
    ],
    howToMake: ["Slice, mix, infuse, serve."],
    whyItWorks: "Vitamin C supports hydration and skin clarity.",
    insideTip: "Drink in the morning.",
  },

  {
    id: "rec-3",
    slug: "beet-heart-tonic",
    categorySlug: "heart-health",
    tags: ["heart", "energy"],
    title: "Beet Heart Tonic",
    description: "Improves circulation and stamina.",
    previewIngredients: ["Beetroot", "Ginger", "Lemon"],
    recipeTitle: "Beet Heart Tonic",
    ingredients: [
      { icon: "🫀", label: "2 beets" },
      { icon: "🫚", label: "Ginger" },
      { icon: "🍋", label: "Lemon" },
    ],
    howToMake: ["Juice, mix, serve chilled."],
    whyItWorks: "Boosts nitric oxide and blood flow.",
    insideTip: "Drink pre-workout.",
  },

  {
    id: "rec-4",
    slug: "berry-antioxidant-smoothie",
    categorySlug: "immunity",
    tags: ["immunity", "skin"],
    title: "Berry Antioxidant Smoothie",
    description: "Strengthens immunity.",
    previewIngredients: ["Blueberries", "Strawberries", "Yogurt"],
    recipeTitle: "Berry Smoothie",
    ingredients: [
      { icon: "🫐", label: "Blueberries" },
      { icon: "🍓", label: "Strawberries" },
      { icon: "🥛", label: "Yogurt" },
    ],
    howToMake: ["Blend and serve."],
    whyItWorks: "High antioxidants reduce oxidative stress.",
    insideTip: "Add chia seeds.",
  },

  {
    id: "rec-5",
    slug: "gut-healing-smoothie",
    categorySlug: "gut-health",
    tags: ["gut-health", "digestion"],
    title: "Gut Healing Smoothie",
    description: "Supports digestion.",
    previewIngredients: ["Banana", "Yogurt", "Honey"],
    recipeTitle: "Gut Smoothie",
    ingredients: [
      { icon: "🍌", label: "Banana" },
      { icon: "🥛", label: "Yogurt" },
      { icon: "🍯", label: "Honey" },
    ],
    howToMake: ["Blend and serve."],
    whyItWorks: "Probiotics improve gut flora.",
    insideTip: "Use kefir instead.",
  },

  {
    id: "rec-6",
    slug: "fat-burning-green-tea",
    categorySlug: "weight-loss",
    tags: ["weight", "energy"],
    title: "Fat Burning Green Tea",
    description: "Boosts metabolism.",
    previewIngredients: ["Green tea", "Lemon", "Honey"],
    recipeTitle: "Green Tea Drink",
    ingredients: [
      { icon: "🍵", label: "Green tea" },
      { icon: "🍋", label: "Lemon" },
      { icon: "🍯", label: "Honey" },
    ],
    howToMake: ["Brew and mix."],
    whyItWorks: "Improves fat oxidation.",
    insideTip: "Drink before workouts.",
  },

  {
    id: "rec-7",
    slug: "turmeric-drink",
    categorySlug: "anti-inflammatory",
    tags: ["anti-inflammatory", "immunity"],
    title: "Turmeric Drink",
    description: "Reduces inflammation.",
    previewIngredients: ["Turmeric", "Milk", "Honey"],
    recipeTitle: "Golden Milk",
    ingredients: [
      { icon: "🟡", label: "Turmeric" },
      { icon: "🥛", label: "Milk" },
      { icon: "🍯", label: "Honey" },
    ],
    howToMake: ["Heat and mix."],
    whyItWorks: "Curcumin fights inflammation.",
    insideTip: "Add black pepper.",
  },

  {
    id: "rec-8",
    slug: "electrolyte-drink",
    categorySlug: "hydration",
    tags: ["hydration", "energy"],
    title: "Electrolyte Drink",
    description: "Rehydrates quickly.",
    previewIngredients: ["Coconut water", "Salt", "Lime"],
    recipeTitle: "Electrolyte Drink",
    ingredients: [
      { icon: "🥥", label: "Coconut water" },
      { icon: "🧂", label: "Salt" },
      { icon: "🍋", label: "Lime" },
    ],
    howToMake: ["Mix and chill."],
    whyItWorks: "Restores electrolytes.",
    insideTip: "Post-workout drink.",
  },

  {
    id: "rec-9",
    slug: "brain-smoothie",
    categorySlug: "brain",
    tags: ["brain", "energy"],
    title: "Brain Smoothie",
    description: "Enhances focus.",
    previewIngredients: ["Blueberries", "Walnuts", "Milk"],
    recipeTitle: "Brain Boost",
    ingredients: [
      { icon: "🫐", label: "Blueberries" },
      { icon: "🌰", label: "Walnuts" },
      { icon: "🥛", label: "Milk" },
    ],
    howToMake: ["Blend."],
    whyItWorks: "Supports cognitive function.",
    insideTip: "Add flax seeds.",
  },

  {
    id: "rec-10",
    slug: "cinnamon-blood-sugar-drink",
    categorySlug: "blood-sugar",
    tags: ["blood-sugar", "weight"],
    title: "Cinnamon Drink",
    description: "Balances blood sugar.",
    previewIngredients: ["Apple", "Cinnamon", "Water"],
    recipeTitle: "Cinnamon Drink",
    ingredients: [
      { icon: "🍎", label: "Apple" },
      { icon: "🟤", label: "Cinnamon" },
      { icon: "💧", label: "Water" },
    ],
    howToMake: ["Boil and infuse."],
    whyItWorks: "Improves insulin response.",
    insideTip: "Drink after meals.",
  },

  // 11–40 (auto-generated but with tags array)

  ...Array.from({ length: 30 }).map((_, i) => ({
    id: `rec-${i + 11}`,
    slug: `recipe-${i + 11}`,
    categorySlug: "detoxing",
    tags: [
      ["detoxing", "hydration"],
      ["heart", "energy"],
      ["weight", "blood-sugar"],
      ["immunity", "skin"],
      ["gut-health", "digestion"],
    ][i % 5],
    title: `Healthy Recipe ${i + 11}`,
    description: "Supports overall wellness.",
    previewIngredients: ["Fruit", "Herbs", "Liquid"],
    recipeTitle: `Wellness Recipe ${i + 11}`,
    ingredients: [
      { icon: "🍏", label: "Fruit" },
      { icon: "🌿", label: "Herbs" },
      { icon: "💧", label: "Liquid" },
    ],
    howToMake: ["Prep", "Blend", "Serve"],
    whyItWorks: "Provides essential nutrients.",
    insideTip: "Adjust to taste.",
  })),
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

export const dummyRiskItems: RiskItem[] = [
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
];
