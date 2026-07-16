import {
  HeartPulse,
  Zap,
  Flame,
  ShieldPlus,
  Heart,
  Droplets,
  Sparkles,
  Leaf,
  Sprout,
  FlaskConical,
  Waves,
  Brain,
  Smile,
  Moon,
  BandageIcon,
  Thermometer,
  Scale,
  Bone,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {
  Energy,
  Immunity,
  Stress,
  Skin,
  Digestive,
} from "@/components/vectors/bioactivities";
import { type SupportScore } from "@/lib/wellness-score";

// Draft icon mapping per bioactivity — swapped for the real design later.
const ICONS = {
  "antioxidant-cellular-protection": Sparkles,
  "inflammation-support": Flame,
  "immune-support": Immunity,
  "natural-defense-support": ShieldPlus,
  "heart-circulation-support": Heart,
  "cholesterol-lipid-balance": HeartPulse,
  "blood-sugar-support": Droplets,
  "weight-metabolic-support": Scale,
  "gut-digestive-support": Digestive,
  "microbiome-support": Sprout,
  "liver-detox-support": FlaskConical,
  "kidney-fluid-balance-support": Waves,
  "brain-cognitive-support": Brain,
  "mood-emotional-balance": Smile,
  "stress-resilience-support": Stress,
  "sleep-relaxation-support": Moon,
  "pain-comfort-support": BandageIcon,
  "temperature-balance-support": Thermometer,
  "hormonal-balance-support": Zap,
  "bone-joint-support": Bone,
  "skin-health-support": Skin,
  "healthy-aging-support": Clock,
  "cellular-wellness-support": Leaf,
};

// Compact display labels (the full bioactivity names are too long for the row).
const SHORT_LABELS: Record<string, string> = {
  "antioxidant-cellular-protection": "Antioxidant",
  "inflammation-support": "Inflammation",
  "immune-support": "Immunity",
  "natural-defense-support": "Defense",
  "heart-circulation-support": "Heart",
  "cholesterol-lipid-balance": "Cholesterol",
  "blood-sugar-support": "Blood Sugar",
  "weight-metabolic-support": "Metabolic",
  "gut-digestive-support": "Digestive",
  "microbiome-support": "Microbiome",
  "liver-detox-support": "Detox",
  "kidney-fluid-balance-support": "Kidney",
  "brain-cognitive-support": "Cognitive",
  "mood-emotional-balance": "Mood",
  "stress-resilience-support": "Stress",
  "sleep-relaxation-support": "Sleep",
  "pain-comfort-support": "Comfort",
  "temperature-balance-support": "Temperature",
  "hormonal-balance-support": "Hormonal",
  "bone-joint-support": "Joint",
  "skin-health-support": "Skin",
  "healthy-aging-support": "Healthy Aging",
  "cellular-wellness-support": "Cellular",
};

interface RecipeSupportsProps {
  /** Top bioactivities for this recipe (from recipe_tags), strongest first. */
  supports: SupportScore[];
}

export function RecipeSupports({ supports }: RecipeSupportsProps) {
  if (!supports?.length) return null;

  return (
    <div className="rounded-3xl bg-white py-3 px-4">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-base font-semibold">This recipe supports</p>
      </div>

      <div className="flex items-start justify-between gap-2">
        {supports.map((s) => {
          const Icon = ICONS[s.slug] ?? Leaf;
          return (
            <div
              key={s.slug}
              className="flex flex-1 flex-col items-center text-center gap-1.5 min-w-0"
            >
              <div className="size-12 rounded-full bg-[#F1F7F3] grid place-items-center shrink-0">
                <Icon className="size-5 text-mint-green" strokeWidth={2} />
              </div>
              <p className="text-2xs leading-tight text-subtle line-clamp-2 font-medium">
                {SHORT_LABELS[s.slug] ?? s.support}
              </p>
              <p className="text-sm font-semibold text-[#087567]">{s.score}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
