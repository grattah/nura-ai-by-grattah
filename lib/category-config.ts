export interface CategoryConfig {
  bgColor: string;
  subtitle: string;
  imageUrl: string;
  iconUrl: string;
}

// Maps tag slug → visual config for the category list and detail pages.
// bgColor matches the card backgrounds in the Figma design.
// imageUrl is a Cloudinary or public path; swap for real assets when ready.
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  beauty: {
    bgColor: "oklch(0.9484 0.0231 10.96)",
    subtitle: "Glow from the inside out",
    imageUrl: "/beauty.webp",
    iconUrl: "/beauty-icon.svg",
  },
  detox: {
    bgColor: "oklch(0.9545 0.0182 161.12)",
    subtitle: "Cleanse your body naturally",
    imageUrl: "/detox.webp",
    iconUrl: "/detox-icon.svg",
  },
  "weight-loss": {
    bgColor: "oklch(0.9635 0.0202 58.07)",
    subtitle: "Healthy meals, real results",
    imageUrl: "/weightloss.webp",
    iconUrl: "/weight-loss-icon.svg",
  },
  hormones: {
    bgColor: "oklch(0.939 0.0194 302.2)",
    subtitle: "Balance and feel your best",
    imageUrl: "/hormones.webp",
    iconUrl: "/hormones-icon.svg",
  },
  fitness: {
    bgColor: "oklch(0.9469 0.0126 255.51)",
    subtitle: "Fuel your workouts",
    imageUrl: "/fitness.webp",
    iconUrl: "/fitness-icon.svg",
  },
  energy: {
    bgColor: "oklch(0.979 0.0245 91.61)",
    subtitle: "Boost your energy naturally",
    imageUrl: "/energy.webp",
    iconUrl: "/energy-icon.svg",
  },
  "gut-health": {
    bgColor: "oklch(0.979 0.0245 91.61)",
    subtitle: "Nourish your gut, feel your best",
    imageUrl: "/gut-health.webp",
    iconUrl: "/gut-health-icon.svg",
  },
  sleep: {
    bgColor: "oklch(0.939 0.0194 302.2)",
    subtitle: "Rest well, live better",
    imageUrl: "/sleep.webp",
    iconUrl: "/sleep-icon.svg",
  },
  focus: {
    bgColor: "oklch(0.9648 0.0195 125.82)",
    subtitle: "Sharpen your mind, stay focused",
    imageUrl: "/focus.webp",
    iconUrl: "/focus-icon.svg",
  },
  immunity: {
    bgColor: "oklch(0.9484 0.0231 10.96)",
    subtitle: "Build resistance, stay strong",
    imageUrl: "/immunity.webp",
    iconUrl: "/immunity-icon.svg",
  },
  hydration: {
    bgColor: "oklch(0.9454 0.0138 247.97)",
    subtitle: "Drink up, feel refreshed",
    imageUrl: "/hydration.webp",
    iconUrl: "/hydration-icon.svg",
  },
};

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  bgColor: "oklch(0.963 0.0068 145.52)",
  subtitle: "Explore wellness recipes",
  imageUrl: "/placeholder.jpg",
  iconUrl: "/placeholder.svg",
};

export function getCategoryConfig(slug: string): CategoryConfig {
  return CATEGORY_CONFIG[slug] ?? DEFAULT_CATEGORY_CONFIG;
}
