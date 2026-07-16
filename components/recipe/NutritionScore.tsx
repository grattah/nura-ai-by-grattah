import React from "react";

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
        <p className="font-semibold text-base text-base-text leading-[100%]">Nutrition score</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-success-c100 flex flex-col gap-3 p-3 items-center text-center">
          <p className="text-success-c600 text-hero font-semibold">
            {baseScore}%
          </p>
          <p className="text-base font-medium text-subtle">
            <span className="text-success-c600 font-semibold">Very good.</span>{" "}
            Same for everyone
          </p>
        </div>
        <div className="rounded-2xl bg-info-c100 flex flex-col gap-3 p-3 items-center text-center">
          <p className="text-info-c600 text-hero font-semibold">
            {personalizedScore}%
          </p>
          <p className="text-base font-medium text-subtle">
            Adjusted for your heart condition
          </p>
        </div>
      </div>
    </div>
  );
};

export default NutritionScore;
