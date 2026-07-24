"use client";

import { useEffect, useRef, useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";

const DISCLAIMER =
  "Personalized based on your preferences - not a substitute for guidance from your doctor or dietitian.";

const NutritionScore = ({
  baseScore,
  personalizedScore,
}: {
  baseScore: number;
  personalizedScore: number;
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="p-4 rounded-3xl bg-white flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-base text-base-text leading-[100%]">
          Recipe insights
        </p>

        <div ref={wrapperRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="nutrition-score-info"
            aria-label="About these scores"
            className="block"
          >
            <HiOutlineInformationCircle color="#57605E" className="size-4.5" />
          </button>

          {open && (
            <div
              id="nutrition-score-info"
              role="tooltip"
              className="absolute bottom-full -right-3 mb-2.5 w-64 rounded-2xl bg-[#E6F4EB] border border-[#74A7A0] px-4 py-3 z-20"
            >
              <p className="text-sm text-base-text leading-snug text-left font-medium">
                {DISCLAIMER}
              </p>
              {/* Tail: a rotated square sharing the bubble's fill and border. */}
              <span
                aria-hidden="true"
                className="absolute -bottom-1.5 right-3.5 size-3 rotate-45 bg-[#E6F4EB] border-r border-b border-[#74A7A0] rounded-br-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-success-c100 flex flex-col gap-2 p-3 items-center text-center">
          <p className="text-success-c700 text-hp-title leading-tight font-semibold">
            {baseScore}<span className="text-subtle text-sm font-medium">{"/10"}</span>
          </p>
          <p className="text-sm font-medium text-subtle">Nutrition score</p>
        </div>
        <div className="rounded-2xl bg-info-c100 flex flex-col gap-2 p-3 items-center text-center">
          <p className="text-info-c600 text-hp-title leading-tight font-semibold">
            {personalizedScore}%
          </p>
          <p className="text-sm font-medium text-subtle">Your match</p>
        </div>
      </div>
    </div>
  );
};

export default NutritionScore;