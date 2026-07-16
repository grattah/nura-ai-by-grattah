import {
  Heart,
  Leaf,
  type LucideIcon,
} from "lucide-react";
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
  Relief
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
  "antioxidant-cellular-protection": "Cytoprotective",
  "inflammation-support": "Inflammation Control",
  "immune-support": "Immunity",
  "natural-defense-support": "Antimicrobial Activity",
  "heart-circulation-support": "Heart",
  "cholesterol-lipid-balance": "Cholesterol Balance",
  "blood-sugar-support": "Blood Sugar Control",
  "weight-metabolic-support": "Metabolism",
  "gut-digestive-support": "Digestive",
  "microbiome-support": "Microbiome",
  "liver-detox-support": "Liver",
  "kidney-fluid-balance-support": "Fluid Balance",
  "brain-cognitive-support": "Brain",
  "mood-emotional-balance": "Mood Balance",
  "stress-resilience-support": "Stress Control",
  "sleep-relaxation-support": "Sleep",
  "pain-comfort-support": "Relief",
  "temperature-balance-support": "Body Balance",
  "hormonal-balance-support": "Hormonal Balance",
  "bone-joint-support": "Bone",
  "skin-health-support": "Skin",
  "healthy-aging-support": "Healthy Aging",
  "cellular-wellness-support": "Cell Wellness",
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
