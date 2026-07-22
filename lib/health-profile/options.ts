// Health Profile option lists + the draft shape. Single source of truth so the
// UI (Pass 1) and the personalization/safety logic (Pass 2) agree on keys.
// Keys are stored in `health_profiles`; labels are display-only.

export interface Option {
  key: string;
  label: string;
}

// ── 2.1 Basic profile (required) ────────────────────────────────────────────
export const AGE_RANGES: Option[] = [
  { key: "18-24", label: "18–24" },
  { key: "25-34", label: "25–34" },
  { key: "35-44", label: "35–44" },
  { key: "45-54", label: "45–54" },
  { key: "55-64", label: "55–64" },
  { key: "65+", label: "65+" },
];

export const BIOLOGICAL_SEX: Option[] = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "prefer-not-to-say", label: "Prefer not to say" },
];

export const PREGNANCY_STATUS: Option[] = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "prefer-not-to-say", label: "Prefer not to say" },
];

// ── 2.2 Health goals — the app's 14 categories (keys = CATEGORY_CONFIG slugs) ─
import {
  Activity,
  Brain,
  CircleSlash,
  CircleX,
  CloudLightning,
  CupSoda,
  Dumbbell,
  Heart,
  Hourglass,
  Leaf,
  type LucideIcon,
  Moon,
  Scale,
  Scroll,
  Shield,
  Sparkles,
  Sprout,
  Star,
} from "lucide-react";

export interface GoalOption extends Option {
  icon: LucideIcon;
}
export const GOALS: GoalOption[] = [
  { key: "energy", label: "Energy", icon: CloudLightning },
  { key: "hormones", label: "Hormones", icon: Hourglass },
  { key: "hydration", label: "Hydration", icon: CircleX },
  { key: "focus", label: "Focus", icon: Brain },
  { key: "beauty", label: "Beauty", icon: Sparkles },
  { key: "gut-health", label: "Gut Health", icon: Shield },
  { key: "immunity", label: "Immunity", icon: CircleX },
  { key: "weight-loss", label: "Weight Loss", icon: Scale },
  { key: "diabetes", label: "Diabetes", icon: Activity },
  { key: "menopause", label: "Menopause", icon: Leaf },
  { key: "heart", label: "Heart Health", icon: Heart },
];

// ── 2.3 Existing conditions — full PRD 20-item list (+ free-text "Other") ─────
export const CONDITIONS: Option[] = [
  { key: "type-1-diabetes", label: "Type 1 Diabetes" },
  { key: "type-2-diabetes", label: "Type 2 Diabetes" },
  { key: "prediabetes", label: "Prediabetes" },
  { key: "heart-disease", label: "Heart disease" },
  { key: "high-blood-pressure", label: "High blood pressure" },
  { key: "high-cholesterol", label: "High cholesterol" },
  { key: "thyroid-condition", label: "Thyroid condition" },
  { key: "pcos", label: "PCOS" },
  { key: "menopause", label: "Menopause" },
  { key: "perimenopause", label: "Perimenopause" },
  { key: "ibs", label: "IBS" },
  { key: "ibd", label: "IBD" },
  { key: "kidney-disease", label: "Kidney disease" },
  { key: "liver-disease", label: "Liver disease" },
  { key: "gout", label: "Gout" },
  { key: "gerd", label: "GERD / Acid reflux" },
  { key: "celiac-disease", label: "Celiac disease" },
  { key: "osteoporosis", label: "Osteoporosis / low bone density" },
  { key: "anemia", label: "Anemia" },
];

// ── 2.4 Allergies & intolerances — common allergens (+ free-text "Other") ─────
export const ALLERGENS: Option[] = [
  { key: "tree-nuts", label: "Tree nuts" },
  { key: "peanuts", label: "Peanuts" },
  { key: "dairy", label: "Dairy" },
  { key: "gluten", label: "Gluten" },
  { key: "soy", label: "Soy" },
  { key: "shellfish", label: "Shellfish" },
  { key: "eggs", label: "Eggs" },
];

export interface DietaryOption extends Option {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

// ── 2.6 Dietary pattern — single-select ─────────────────────────────────────
export const DIETARY_PATTERNS: DietaryOption[] = [
  {
    key: "vegan",
    label: "Vegan",
    iconBg: "#2E7D321A",
    iconColor: "#2E7D32",
    icon: Leaf,
  },
  {
    key: "vegetarian",
    label: "Vegetarian",
    iconBg: "#2E7D321A",
    iconColor: "#2E7D32",
    icon: Sprout,
  },
  {
    key: "halal",
    label: "Halal",
    iconBg: "#B781031A",
    iconColor: "#B78103",
    icon: Star,
  },
  {
    key: "kosher",
    label: "Kosher",
    iconBg: "#6D4C411A",
    iconColor: "#6D4C41",
    icon: Scroll,
  },
  {
    key: "low-sodium",
    label: "Low-sodium",
    iconBg: "#E651001A",
    iconColor: "#E65100",
    icon: CircleX,
  },
  {
    key: "low-sugar",
    label: "Low-sugar",
    iconBg: "#E651001A",
    iconColor: "#E65100",
    icon: CircleX,
  },
  {
    key: "no-restrictions",
    label: "No restrictions",
    iconBg: "#546E7A1A",
    iconColor: "#546E7A",
    icon: CircleSlash,
  },
];

// Bump when the consent copy / scope of stored sensitive data changes.
export const CONSENT_VERSION = "2026-07-20";

export function labelFor(options: Option[], key: string): string {
  return options.find((o) => o.key === key)?.label ?? key;
}

export function labelsFor(options: Option[], keys: string[]): string[] {
  return keys.map((k) => labelFor(options, k));
}
