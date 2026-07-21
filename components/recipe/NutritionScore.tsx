import Gauge from "@/components/vectors/Gauge";

const NutritionScore = ({
  baseScore,
  personalizedScore,
}: {
  baseScore: number;
  personalizedScore: number;
}) => {
  return (
    <div className="p-4 rounded-3xl bg-white flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <Gauge />
        <p className="font-semibold text-base text-base-text leading-[100%]">
          Nutrition score
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-success-c100 flex flex-col gap-2 p-3 items-center text-center">
          <p className="text-success-c600 text-hp-title leading-tight font-semibold">
            {baseScore}%
          </p>
          <p className="text-sm font-medium text-subtle">Same for everyone</p>
        </div>
        <div className="rounded-2xl bg-info-c100 flex flex-col gap-2 p-3 items-center text-center">
          <p className="text-info-c600 text-hp-title leading-tight font-semibold">
            {personalizedScore}%
          </p>
          <p className="text-sm font-semibold text-subtle">
            Adjusted for your preferences
          </p>
        </div>
      </div>

      {/* PRD-required disclaimer — never tie the score to a diagnosed condition. */}
      <p className="text-xs text-subtle leading-snug">
        Personalized based on your preferences — not a substitute for guidance
        from your doctor or dietitian.
      </p>
    </div>
  );
};

export default NutritionScore;
