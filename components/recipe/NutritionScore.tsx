"use client";

import { useEffect, useRef, useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";

const DISCLAIMER =
  "Personalized based on your preferences - not a substitute for guidance from your doctor or dietitian.";

export interface MatchBreakdownRow {
  key: string;
  label: string;
  percent: number;
}

const NutritionScore = ({
  baseScore,
  match,
  breakdown = [],
  average = null,
}: {
  /** Base Nutrition Score, 1–10 — the same for everyone. */
  baseScore: number;
  /** §7.1 headline: the highest credit + the condition/goal that produced it. */
  match: { percent: number; label: string };
  /** §7.2 every credit, already sorted best-first. */
  breakdown?: MatchBreakdownRow[];
  /** §7.3 mean of all credits. Shown inside the panel only, never as headline. */
  average?: number | null;
}) => {
  const [open, setOpen] = useState(false);
  // §7.2 expandable panel — collapsed by default.
  const [showBreakdown, setShowBreakdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // §7.5 with a single selection the average IS the highest, so showing both
  // adds no information.
  const showAverage = average != null && breakdown.length > 1;

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
            {Math.round(match.percent)}%
          </p>
          {/* §7.1 — the headline always names what it matched. */}
          <p className="text-sm font-medium text-subtle wrap-break-word">
            {match.label}
          </p>
        </div>
      </div>

      {/* §7.2 full breakdown, sorted best-first. */}
      {breakdown.length > 1 && (
        <div>
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            aria-controls="match-breakdown"
            className="text-sm font-medium text-mint-green underline"
          >
            {showBreakdown
              ? "Hide details"
              : "See other goals this recipe supports"}
          </button>

          {showBreakdown && (
            <ul id="match-breakdown" className="mt-3 flex flex-col gap-2">
              {breakdown.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-base-text wrap-break-word">{b.label}</span>
                  <span className="text-subtle shrink-0">
                    {Math.round(b.percent)}%
                  </span>
                </li>
              ))}
              {/* §7.3 optional average — secondary, never the headline. */}
              {showAverage && (
                <li className="flex items-center justify-between gap-3 text-sm border-t border-grey-c100 pt-2 mt-1">
                  <span className="text-subtle">Average across all</span>
                  <span className="text-subtle shrink-0">
                    {Math.round(average)}%
                  </span>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NutritionScore;