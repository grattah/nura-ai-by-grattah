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
  ArrowDown,
  BatteryMedium,
  Brain,
  CircleSlash,
  CircleX,
  CloudLightning,
  CupSoda,
  Droplet,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  HeartPulse,
  Hourglass,
  Leaf,
  type LucideIcon,
  MoonStar,
  Scale,
  Scroll,
  Shield,
  ShieldPlus,
  Shrink,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Target,
  Wind,
  Zap,
} from "lucide-react";

import {
  Fitness,
  GutIcon,
  LightningIcon,
  ScaleIcon,
  Skin,
} from "@/components/vectors/healthGoals";

export interface GoalOption extends Option {
  icon: LucideIcon;
}
/**
 * The 24 goals from the AUG 21 design, in design order.
 *
 * IMPORTANT — a goal only affects the Match Score if its key resolves through
 * GOAL_KEY_TO_PRD to a formula in GOAL_CREDITS. There are 13 formulas and 24
 * goals, so 11 of these are currently DISPLAY-ONLY: computeMatchScore skips an
 * unmapped key silently, which is why test/match-score-coverage.test.ts pins
 * the split explicitly rather than letting it drift.
 *
 * Several skin goals deliberately share one formula ("Improve my skin & hair").
 * That is safe: match-score.ts de-duplicates by formula, so picking all three
 * counts once instead of triple-weighting skin.
 */
export const GOALS: GoalOption[] = [
  { key: "reduce-bloating", label: "Reduce bloating", icon: Shrink },
  { key: "skin-brighten", label: "Brighten & firm my skin", icon: Sparkles },
  { key: "blood-sugar", label: "Balance blood sugar", icon: Activity },
  { key: "uti-yeast", label: "UTI & yeast balance support", icon: Shield },
  { key: "iron-levels", label: "Improve my iron levels", icon: BatteryMedium },
  { key: "muscle-recovery", label: "Muscle recovery support", icon: Dumbbell },
  { key: "fat-metabolism", label: "Fat metabolism support", icon: Flame },
  { key: "libido", label: "Libido support", icon: Heart },
  { key: "stress", label: "Reduce stress", icon: Wind },
  { key: "mood", label: "Improve my mood", icon: Smile },
  { key: "immunity", label: "Boost my immunity", icon: ShieldPlus },
  { key: "focus", label: "Sharpen my focus", icon: Target },
  { key: "gut-health", label: "Improve gut health", icon: GutIcon },
  { key: "constipation", label: "Relieve constipation", icon: ArrowDown },
  { key: "hair-growth", label: "Hair growth support", icon: Sprout },
  { key: "puffiness", label: "Reduce puffiness", icon: CircleSlash },
  { key: "joint-comfort", label: "Muscle & joint comfort", icon: Scroll },
  { key: "blood-pressure", label: "Lower blood pressure", icon: HeartPulse },
  { key: "cholesterol", label: "Reduce cholesterol", icon: Droplet },
  { key: "clear-skin", label: "Clear my skin", icon: Skin },
  { key: "hydrate-skin", label: "Hydrate my skin", icon: Droplets },
  { key: "testosterone", label: "Testosterone support", icon: Scale },
  { key: "sleep", label: "Sleep better", icon: MoonStar },
  { key: "mucus-congestion", label: "Relieve mucus & congestion", icon: Stethoscope },
];

// ── 2.3 Existing conditions — full PRD 20-item list (+ free-text "Other") ─────
/**
 * The three conditions in the AUG 21 design.
 *
 * Reduced from thirteen. The commented-out keys below are NOT dead: users who
 * completed the questionnaire earlier still hold them in `health_profiles`, and
 * CONDITION_KEY_TO_PRD still maps every one of them, so those saved profiles
 * keep producing a Match Score. They simply can no longer be newly selected.
 * Keeping them listed here documents that, and makes restoring one a one-line
 * change rather than an archaeology exercise.
 */
export const CONDITIONS: Option[] = [
  { key: "pcos", label: "PCOS" },
  { key: "menopause", label: "Menopause" },
  { key: "osteoporosis", label: "Osteoporosis" },
  // Retired from the picker in the AUG 21 design — formulas and mappings retained:
  // { key: "diabetes", label: "Diabetes" },
  // { key: "heart-disease", label: "Heart disease" },
  // { key: "high-blood-pressure", label: "High blood pressure" },
  // { key: "high-cholesterol", label: "High cholesterol" },
  // { key: "digestive-sensitivities", label: "Digestive Sensitivities" },
  // { key: "kidney-disease", label: "Kidney disease" },
  // { key: "liver-disease", label: "Liver disease" },
  // { key: "arthritis", label: "Arthritis" },
  // { key: "anemia", label: "Anemia" },
  // Never in the picker, but mapped for older saved profiles:
  // type-1-diabetes, type-2-diabetes, prediabetes, perimenopause, ibs, ibd, gerd
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
  { key: "fish", label: "Fish" },
  { key: "sesame", label: "Sesame" },
  { key: "mustard", label: "Mustard" },
  { key: "celery", label: "Celery" },
  { key: "lupin", label: "Lupin" },
  { key: "sulphites", label: "Sulphites" },
  { key: "molluscs", label: "Molluscs" },
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
