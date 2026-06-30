export interface CategoryConfig {
  bgColor: string;
  textColor: string;
  subtitle: string;
  imageUrl: string;
  iconUrl: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  beauty: {
    bgColor: "oklch(0.9484 0.0231 10.96)",
    textColor: "oklch(0.6753 0.1519 19.52)",
    subtitle: "Glow from the inside out",
    imageUrl: "/beauty.webp",
    iconUrl: "/beauty-icon.svg",
  },
  detox: {
    bgColor: "oklch(0.9545 0.0182 161.12)",
    textColor: "oklch(0.5285 0.0838 182.07)",
    subtitle: "Cleanse your body naturally",
    imageUrl: "/detox.webp",
    iconUrl: "/detox-icon.svg",
  },
  "weight loss": {
    bgColor: "oklch(0.9635 0.0202 58.07)",
    textColor: "oklch(0.6906 0.1941 45.46)",
    subtitle: "Healthy meals, real results",
    imageUrl: "/weightloss.webp",
    iconUrl: "/weight-loss-icon.svg",
  },
  hormones: {
    bgColor: "oklch(0.939 0.0194 302.2)",
    textColor: "oklch(0.4534 0.1917 283.85)",
    subtitle: "Balance and feel your best",
    imageUrl: "/hormones.webp",
    iconUrl: "/hormones-icon.svg",
  },
  fitness: {
    bgColor: "oklch(0.9469 0.0126 255.51)",
    textColor: "oklch(0.4983 0.1745 261.68)",
    subtitle: "Fuel your workouts",
    imageUrl: "/fitness.webp",
    iconUrl: "/fitness-icon.svg",
  },
  energy: {
    bgColor: "oklch(0.979 0.0245 91.61)",
    textColor: "oklch(0.7225 0.1486 78.6)",
    subtitle: "Boost your energy naturally",
    imageUrl: "/energy.webp",
    iconUrl: "/energy-icon.svg",
  },
  "gut health": {
    bgColor: "oklch(0.979 0.0245 91.61)",
    textColor: "oklch(0.5533 0.1325 148.72)",
    subtitle: "Nourish your gut, feel your best",
    imageUrl: "/gut-health.webp",
    iconUrl: "/gut-health-icon.svg",
  },
  sleep: {
    bgColor: "oklch(0.939 0.0194 302.2)",
    textColor: "oklch(0.4972 0.206 288.9)",
    subtitle: "Rest well, live better",
    imageUrl: "/sleep.webp",
    iconUrl: "/sleep-icon.svg",
  },
  focus: {
    bgColor: "oklch(0.9648 0.0195 125.82)",
    textColor: "oklch(0.8109 0.1651 78.61)",
    subtitle: "Sharpen your mind, stay focused",
    imageUrl: "/focus.webp",
    iconUrl: "/focus-icon.svg",
  },
  immunity: {
    bgColor: "oklch(0.9484 0.0231 10.96)",
    textColor: "oklch(0.7218 0.1487 20.45)",
    subtitle: "Build resistance, stay strong",
    imageUrl: "/immunity.webp",
    iconUrl: "/immunity-icon.svg",
  },
  hydration: {
    bgColor: "oklch(0.9454 0.0138 247.97)",
    textColor: "oklch(0.473 0.1022 248.42)",
    subtitle: "Drink up, feel refreshed",
    imageUrl: "/hydration.webp",
    iconUrl: "/hydration-icon.svg",
  },
  heart: {
    bgColor: "oklch(0.9093 0.0232 34.3)",
    textColor: "oklch(0.6247 0.1965 15.88)",
    subtitle: "Drink up, feel refreshed",
    imageUrl: "/heart.webp",
    iconUrl: "/heart-icon.svg",
  },
  menopause: {
    bgColor: "oklch(0.9174 0.0295 317.24)",
    textColor: "oklch(0.5718 0.1161 307.06)",
    subtitle: "Drink up, feel refreshed",
    imageUrl: "/menopause.webp",
    iconUrl: "/menopause-icon.svg",
  },
  diabetes: {
    bgColor: "oklch(0.9425 0.0177 253.34)",
    textColor: "oklch(0.5688 0.1385 246.48)",
    subtitle: "Drink up, feel refreshed",
    imageUrl: "/diabetes.webp",
    iconUrl: "/diabetes-icon.svg",
  },
};

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  bgColor: "oklch(0.963 0.0068 145.52)",
  textColor: "",
  subtitle: "Explore wellness recipes",
  imageUrl: "/placeholder.jpg",
  iconUrl: "/placeholder.svg",
};

export function getCategoryConfig(slug: string): CategoryConfig {
  return CATEGORY_CONFIG[slug] ?? DEFAULT_CATEGORY_CONFIG;
}
