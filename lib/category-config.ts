export interface CategoryConfig {
  bgColor: string;
  bgColorBadge: string;
  textColor: string;
  textColorBadge: string;
  subtitle: string;
  imageUrl: string;
  iconUrl: string;
  label?: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  beauty: {
    bgColor: "oklch(0.9484 0.0231 10.96)",
    textColor: "oklch(0.6753 0.1519 19.52)",
    bgColorBadge: "oklch(0.9396 0.049 194.77)",
    textColorBadge: "oklch(0.452 0.0714 194.92)",
    subtitle: "Glow from the inside out",
    imageUrl: "/beauty.webp",
    iconUrl: "/beauty-icon.svg",
    label: "Anti-aging",
  },
  detox: {
    bgColor: "oklch(0.9545 0.0182 161.12)",
    textColor: "oklch(0.5285 0.0838 182.07)",
    bgColorBadge: "oklch(0.927 0.0633 154.07)",
    textColorBadge: "oklch(0.5581 0.1674 145.91)",
    subtitle: "Cleanse your body naturally",
    imageUrl: "/detox.webp",
    iconUrl: "/detox-icon.svg",
  },
  "weight-loss": {
    bgColor: "oklch(0.9635 0.0202 58.07)",
    textColor: "oklch(0.6906 0.1941 45.46)",
    bgColorBadge: "oklch(0.8912 0.0029 264.54)",
    textColorBadge: "oklch(0.2182 0.0019 286.24)",
    subtitle: "Healthy meals, real results",
    imageUrl: "/weightloss.webp",
    iconUrl: "/weight-loss-icon.svg",
  },
  hormones: {
    bgColor: "oklch(0.939 0.0194 302.2)",
    textColor: "oklch(0.4534 0.1917 283.85)",
    bgColorBadge: "oklch(0.9454 0.0175 293.13)",
    textColorBadge: "oklch(0.4534 0.1917 283.85)",
    subtitle: "Balance and feel your best",
    imageUrl: "/hormones.webp",
    iconUrl: "/hormones-icon.svg",
  },
  fitness: {
    bgColor: "oklch(0.9469 0.0126 255.51)",
    textColor: "oklch(0.4983 0.1745 261.68)",
    bgColorBadge: "oklch(0.9469 0.0305 57.91)",
    textColorBadge: "oklch(0.6906 0.1941 45.46)",
    subtitle: "Fuel your workouts",
    imageUrl: "/fitness.webp",
    iconUrl: "/fitness-icon.svg",
  },
  energy: {
    bgColor: "oklch(0.979 0.0245 91.61)",
    textColor: "oklch(0.7225 0.1486 78.6)",
    bgColorBadge: "oklch(0.9393 0.0187 265.98)",
    textColorBadge: "oklch(0.4983 0.1745 261.68)",
    subtitle: "Boost your energy naturally",
    imageUrl: "/energy.webp",
    iconUrl: "/energy-icon.svg",
  },
  "gut-health": {
    bgColor: "oklch(0.979 0.0245 91.61)",
    textColor: "oklch(0.5533 0.1325 148.72)",
    bgColorBadge: "oklch(0.9589 0.0381 102.25)",
    textColorBadge: "oklch(0.5033 0.0871 157.19)",
    subtitle: "Nourish your gut, feel your best",
    imageUrl: "/gut-health.webp",
    iconUrl: "/gut-health-icon.svg",
  },
  sleep: {
    bgColor: "oklch(0.939 0.0194 302.2)",
    textColor: "oklch(0.4972 0.206 288.9)",
    bgColorBadge: "oklch(0.9082 0.0482 33.97)",
    textColorBadge: "oklch(0.294 0.0761 13.37)",
    subtitle: "Rest well, live better",
    imageUrl: "/sleep.webp",
    iconUrl: "/sleep-icon.svg",
  },
  focus: {
    bgColor: "oklch(0.9648 0.0195 125.82)",
    textColor: "oklch(0.5033 0.0871 157.19)",
    bgColorBadge: "oklch(0.9333 0.0201 150.09)",
    textColorBadge: "oklch(0.5285 0.0838 182.07)",
    subtitle: "Sharpen your mind, stay focused",
    imageUrl: "/focus.webp",
    iconUrl: "/focus-icon.svg",
  },
  immunity: {
    bgColor: "oklch(0.9484 0.0231 10.96)",
    textColor: "oklch(0.6557 0.154 19.36)",
    bgColorBadge: "oklch(0.9541 0.0299 78.79)",
    textColorBadge: "oklch(0.5413 0.0996 75.9)",
    subtitle: "Build resistance, stay strong",
    imageUrl: "/immunity.webp",
    iconUrl: "/immunity-icon.svg",
  },
  hydration: {
    bgColor: "oklch(0.9454 0.0138 247.97)",
    textColor: "oklch(0.473 0.1022 248.42)",
    bgColorBadge: "oklch(0.8461 0.0512 253.91)",
    textColorBadge: "oklch(0.4467 0.1098 246.46)",
    subtitle: "Drink up, feel refreshed",
    imageUrl: "/hydration.webp",
    iconUrl: "/hydration-icon.svg",
  },
  heart: {
    bgColor: "oklch(0.9093 0.0232 34.3)",
    textColor: "oklch(0.6247 0.1965 15.88)",
    bgColorBadge: "oklch(0.9093 0.0232 34.3)",
    textColorBadge: "oklch(0.6247 0.1965 15.88)",
    subtitle: "Support a healthy heart.",
    imageUrl: "/heart.webp",
    iconUrl: "/heart-icon.svg",
  },
  menopause: {
    bgColor: "oklch(0.9174 0.0295 317.24)",
    textColor: "oklch(0.5191 0.115 306.86)",
    bgColorBadge: "oklch(0.901573 0.073261 317.4297)",
    textColorBadge: "oklch(0.5191 0.115 306.86)",
    subtitle: "Ease everyday menopause symptoms.",
    imageUrl: "/menopause.webp",
    iconUrl: "/menopause-icon.svg",
  },
  diabetes: {
    bgColor: "oklch(0.9425 0.0177 253.34)",
    textColor: "oklch(0.5688 0.1385 246.48)",
    bgColorBadge: "oklch(0.9789 0.0777 105.39)",
    textColorBadge: "oklch(0.445 0.2397 296.79)",
    subtitle: "Support healthy blood sugar levels.",
    imageUrl: "/diabetes.webp",
    iconUrl: "/diabetes-icon.svg",
  },
};

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  bgColor: "oklch(0.963 0.0068 145.52)",
  bgColorBadge: "oklch(0.963 0.0068 145.52)",
  textColor: "",
  textColorBadge: "",
  subtitle: "Explore wellness recipes",
  imageUrl: "/placeholder.jpg",
  iconUrl: "/placeholder.svg",
};

export function getCategoryConfig(slug: string): CategoryConfig {
  return CATEGORY_CONFIG[slug] ?? DEFAULT_CATEGORY_CONFIG;
}
