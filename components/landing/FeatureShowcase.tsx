"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Feature = {
  id: number;
  title: string;
  description: string;
  image: string;
};

const AUTOPLAY_MS = 4000;

export function FeatureShowcase({ features }: { features: Feature[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (features.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % features.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <div>
      {/* Viewport: hides everything except the current slide */}
      <div className="overflow-hidden -mx-6">
        {/* Track: one row of slides, shifted by whole viewports */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {features.map((feature) => (
            <div key={feature.id} className="shrink-0 w-full px-6">
              <Image
                src={feature.image}
                alt={feature.title}
                width={366}
                height={326}
                className="w-full"
				priority
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots: pure indicators now */}
      <div className="mt-4 flex justify-center gap-2">
        {features.map((feature, i) => (
          <span
            key={feature.id}
            className={cn(
              "h-3 w-3 rounded-full transition-all",
              i === activeIndex ? "bg-mint-green" : " bg-[#C7C2B2]"
            )}
          />
        ))}
      </div>

      {/* Cards, green border follows the active slide */}
      <div className="mt-6 flex flex-col gap-3">
        {features.map((feature, i) => (
          <div
            key={feature.id}
            className={cn(
              "w-full max-w-85.5 bg-[#EDEBDF] p-3.5 rounded-2xl flex flex-col gap-2 border transition-colors",
              i === activeIndex ? "border-mint-green" : "border-[#E1DDCA]"
            )}
          >
            <p className="text-base-text font-bold font-redHatDisplay leading-[22px] text-xl">
              {feature.title}
            </p>
            <p className="font-redHatDisplay font-medium text-sm text-subtle leading-[22px]">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
