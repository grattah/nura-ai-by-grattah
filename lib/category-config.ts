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
    bgColor: "#FDE8EA",
    subtitle: "Glow from the inside out",
    imageUrl: "/beauty-img.png",
    iconUrl: "/beauty-icon.svg",
  },
  detox: {
    bgColor: "#E6F4EC",
    subtitle: "Cleanse your body naturally",
    imageUrl: "/detox-img.png",
    iconUrl: "/detox-icon.svg",
  },
  "weight-loss": {
    bgColor: "#FEF0E6",
    subtitle: "Healthy meals, real results",
    imageUrl: "/weight-loss-img.png",
    iconUrl: "/weight-loss-icon.svg",
  },
  hormones: {
    bgColor: "#EDE8F6",
    subtitle: "Balance and feel your best",
    imageUrl: "/hormones-img.png",
    iconUrl: "/hormones-icon.svg",
  },
  fitness: {
    bgColor: "#E8EEF6",
    subtitle: "Fuel your workouts",
    imageUrl: "/fitness-img.png",
    iconUrl: "/fitness-icon.svg",
  },
  energy: {
    bgColor: "#FEF8E6",
    subtitle: "Boost your energy naturally",
    imageUrl: "/energy-img.png",
    iconUrl: "/energy-icon.svg",
  },
  "gut-health": {
    bgColor: "#FEF8E6",
    subtitle: "Nourish your gut, feel your best",
    imageUrl: "/gut-health-img.png",
    iconUrl: "/gut-health-icon.svg",
  },
  sleep: {
    bgColor: "#EDE8F6",
    subtitle: "Rest well, live better",
    imageUrl: "/sleep-img.png",
    iconUrl: "/sleep-icon.svg",
  },
  focus: {
    bgColor: "#F0F6E8",
    subtitle: "Sharpen your mind, stay focused",
    imageUrl: "/focus-img.png",
    iconUrl: "/focus-icon.svg",
  },
  immunity: {
    bgColor: "#FDE8EA",
    subtitle: "Build resistance, stay strong",
    imageUrl: "/immunity-img.png",
    iconUrl: "/immunity-icon.svg",
  },
  hydration: {
    bgColor: "#E6EEF6",
    subtitle: "Drink up, feel refreshed",
    imageUrl: "/hydration-img.png",
    iconUrl: "/hydration-icon.svg",
  },
};

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  bgColor: "#F0F4F0",
  subtitle: "Explore wellness recipes",
  imageUrl: "/placeholder.jpg",
  iconUrl: "/placeholder.svg",
};

export function getCategoryConfig(slug: string): CategoryConfig {
  return CATEGORY_CONFIG[slug] ?? DEFAULT_CATEGORY_CONFIG;
}
