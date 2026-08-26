import { Heart, Leaf, type LucideIcon } from "lucide-react";
import {
  Immunity,
  Skin,
  Digestive,
  Liver,
  Brain,
  Sleep,
  Bone,
  Cytoprotective,
  FluidBalance,
  MoodBalance,
  StressControl,
  CellWellness,
  HormonalBalance,
  HealthyAging,
  Microbiome,
  Metabolism,
  BloodSugar,
  Cholestrol,
  Inflammation,
  AntiMicrobes,
  Temperature,
  Relief,
} from "@/components/vectors/bioactivities";
import { type SupportScore } from "@/lib/wellness-score";

// Draft icon mapping per bioactivity — swapped for the real design later.
const ICONS: Record<string, LucideIcon> = {
  "antioxidant-cellular-protection": Cytoprotective,
  "inflammation-support": Inflammation,
  "immune-support": Immunity,
  "natural-defense-support": AntiMicrobes,
  "heart-circulation-support": Heart,
  "cholesterol-lipid-balance": Cholestrol,
  "blood-sugar-support": BloodSugar,
  "weight-metabolic-support": Metabolism,
  "gut-digestive-support": Digestive,
  "microbiome-support": Microbiome,
  "liver-detox-support": Liver,
  "kidney-fluid-balance-support": FluidBalance,
  "brain-cognitive-support": Brain,
  "mood-emotional-balance": MoodBalance,
  "stress-resilience-support": StressControl,
  "sleep-relaxation-support": Sleep,
  "pain-comfort-support": Relief,
  "temperature-balance-support": Temperature,
  "hormonal-balance-support": HormonalBalance,
  "bone-joint-support": Bone,
  "skin-health-support": Skin,
  "healthy-aging-support": HealthyAging,
  "cellular-wellness-support": CellWellness,
};

// Compact display labels (the full bioactivity names are too long for the row).
const SHORT_LABELS: Record<string, string> = {
  "antioxidant-cellular-protection": "Antioxidants",
  "inflammation-support": "Inflammation",
  "immune-support": "Immunity",
  "natural-defense-support": "Antimicrobes",
  "heart-circulation-support": "Heart Health",
  "cholesterol-lipid-balance": "Lower LDL",
  "blood-sugar-support": "Blood Sugar",
  "weight-metabolic-support": "Metabolism",
  "gut-digestive-support": "Gut Health",
  "microbiome-support": "Microbiome",
  "liver-detox-support": "Liver",
  "kidney-fluid-balance-support": "Diuresis",
  "brain-cognitive-support": "Brain Health",
  "mood-emotional-balance": "Mood",
  "stress-resilience-support": "Stress Relief",
  "sleep-relaxation-support": "Relaxation",
  "pain-comfort-support": "Analgesia",
  "temperature-balance-support": "Homeostasis",
  "hormonal-balance-support": "Hormones",
  "bone-joint-support": "Bone",
  "skin-health-support": "Skin",
  "healthy-aging-support": "Anti-aging",
  "cellular-wellness-support": "Cell Health",
};

interface RecipeSupportsProps {
  /** Top bioactivities for this recipe (from recipe_tags), strongest first. */
  supports: SupportScore[];
  isSubscriber?: boolean;
  hasHealthProfile?: boolean;
}

export function RecipeSupports({
  supports,
  isSubscriber,
  hasHealthProfile,
}: RecipeSupportsProps) {
  if (!supports?.length) return null;

  return (
    <div className="rounded-3xl bg-white py-3 px-4">
      <div className="flex items-start justify-between gap-2">
        {supports.map((s) => {
          const Icon = ICONS[s.slug] ?? Leaf;
          return (
            <div
              key={s.slug}
              className="flex flex-1 flex-col items-center text-center gap-2 min-w-0"
            >
              <div className="size-12 rounded-full bg-[#F1F7F3] grid place-items-center shrink-0">
                <Icon className="size-5 text-mint-green" strokeWidth={2} />
              </div>
              <p className="text-2xs leading-tight text-subtle line-clamp-2 font-medium text-nowrap">
                {SHORT_LABELS[s.slug] ?? s.support}
              </p>
              {!isSubscriber && !hasHealthProfile ? (
                <p className="text-sm font-semibold text-[#087567]">
                  {s.score}%
                </p>
              ) : hasHealthProfile && !isSubscriber ? (
                <p className="text-sm font-semibold text-[#087567]">
                  {s.score}%
                </p>
              ) : !hasHealthProfile && isSubscriber ? (
                <p className="text-sm font-semibold text-[#087567]">
                  {s.score}%
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
