import {
  HeartPulse,
  Zap,
  Flame,
  Shield,
  ShieldPlus,
  Heart,
  Droplets,
  Beaker,
  Sparkles,
  Leaf,
  Sprout,
  FlaskConical,
  Waves,
  Brain,
  Smile,
  Wind,
  Moon,
  BandageIcon,
  Thermometer,
  Scale,
  Bone,
  Hand,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { type SupportScore } from "@/lib/wellness-score";

// Draft icon mapping per bioactivity — swapped for the real design later.
const ICONS: Record<string, LucideIcon> = {
  "antioxidant-cellular-protection": Sparkles,
  "inflammation-support": Flame,
  "immune-support": Shield,
  "natural-defense-support": ShieldPlus,
  "heart-circulation-support": Heart,
  "cholesterol-lipid-balance": HeartPulse,
  "blood-sugar-support": Droplets,
  "weight-metabolic-support": Scale,
  "gut-digestive-support": Beaker,
  "microbiome-support": Sprout,
  "liver-detox-support": FlaskConical,
  "kidney-fluid-balance-support": Waves,
  "brain-cognitive-support": Brain,
  "mood-emotional-balance": Smile,
  "stress-resilience-support": Wind,
  "sleep-relaxation-support": Moon,
  "pain-comfort-support": BandageIcon,
  "temperature-balance-support": Thermometer,
  "hormonal-balance-support": Zap,
  "bone-joint-support": Bone,
  "skin-health-support": Hand,
  "healthy-aging-support": Clock,
  "cellular-wellness-support": Leaf,
};

// Compact display labels (the full bioactivity names are too long for the row).
const SHORT_LABELS: Record<string, string> = {
  "antioxidant-cellular-protection": "Antioxidant Support",
  "inflammation-support": "Inflammation Support",
  "immune-support": "Immunity Support",
  "natural-defense-support": "Defense Support",
  "heart-circulation-support": "Heart Support",
  "cholesterol-lipid-balance": "Cholesterol Support",
  "blood-sugar-support": "Blood Sugar Support",
  "weight-metabolic-support": "Metabolic Support",
  "gut-digestive-support": "Digestive Support",
  "microbiome-support": "Microbiome Support",
  "liver-detox-support": "Detox Support",
  "kidney-fluid-balance-support": "Kidney Support",
  "brain-cognitive-support": "Cognitive Support",
  "mood-emotional-balance": "Mood Support",
  "stress-resilience-support": "Stress Support",
  "sleep-relaxation-support": "Sleep Support",
  "pain-comfort-support": "Comfort Support",
  "temperature-balance-support": "Temperature Support",
  "hormonal-balance-support": "Hormonal Support",
  "bone-joint-support": "Joint Support",
  "skin-health-support": "Skin Support",
  "healthy-aging-support": "Healthy Aging",
  "cellular-wellness-support": "Cellular Support",
};

interface RecipeSupportsProps {
  /** Top bioactivities for this recipe (from recipe_tags), strongest first. */
  supports: SupportScore[];
}

export function RecipeSupports({ supports }: RecipeSupportsProps) {
  if (!supports?.length) return null;

  return (
    <div className="rounded-3xl bg-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <HeartPulse className="size-5 text-mint-green" strokeWidth={2} />
        <p className="text-base font-semibold text-black">
          How This Recipe Supports You
        </p>
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
              <p className="text-2xs leading-tight text-subtle line-clamp-2">
                {SHORT_LABELS[s.slug] ?? s.support}
              </p>
              <p className="text-sm font-semibold text-mint-green">
                {s.score}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
