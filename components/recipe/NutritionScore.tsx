"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { FaLock, FaStar } from "react-icons/fa";

import { NutritionScoreDrawer } from "@/components/recipe/NutritionScoreDrawer";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import type { NutritionPointInput } from "@/lib/scoring/nutrition-breakdown";

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
  points,
  hasProfile,
  isSubscribed,
}: {
  baseScore: number;
  match: { percent: number; label: string };
  breakdown?: MatchBreakdownRow[];
  average?: number | null;
  points: NutritionPointInput;
  hasProfile: boolean;
  isSubscribed: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const showAverage = average != null && breakdown.length > 1;
  // No profile → same as before, prompting them to build one. Profile but no
  // active subscription → still locked, but the blocker is the paywall now.
  // Profile + subscribed → the real scores.
  const unlocked = hasProfile && isSubscribed;

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
    <div
      className={`relative p-4 rounded-2xl bg-white flex flex-col gap-4 ${
        !unlocked && "h-57"
      }`}
    >
      <div className="relative z-30 flex justify-between items-center">
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
              className="absolute bottom-full space-y-4 -right-3 mb-2.5 w-[85vw] rounded-2xl bg-[#E6F4EB] border border-[#74A7A0] px-4 py-3 pb-0 z-20"
            >
              <p className="text-sm text-base-text leading-snug text-left font-medium">
                {DISCLAIMER}
              </p>
              <>
                <p className="text-sm text-base-text leading-snug text-left font-medium">
                  <span className="font-semibold text-base-text">
                    Match Score:
                  </span>{" "}
                  A percentage showing how well this recipe fits the health
                  goals and conditions in your profile, calculated separately
                  for each one you’ve selected.
                </p>
                <p className="text-sm text-base-text leading-snug text-left font-medium">
                  <span className="font-semibold text-base-text">
                    Nutri Score:
                  </span>{" "}
                  A score out of 10 showing how nutritionally sound this recipe
                  is, based on its key nutrients.
                </p>
              </>
              <span
                aria-hidden="true"
                className="absolute -bottom-1.5 right-3.5 size-3 rotate-45 bg-[#E6F4EB] border-r border-b border-[#74A7A0] rounded-br-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-stretch gap-3">
        <div className="rounded-2xl flex-1 bg-info-c100 flex flex-col gap-2 px-2 pt-7.5 pb-2 items-center text-center relative">
          {match.label && (
            <span className="rounded-full bg-info-c600/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-info-c600 wrap-break-word absolute top-2 left-4">
              {match.label}
            </span>
          )}
          <p className="text-info-c600 text-hp-title leading-tight font-semibold">
            {Math.round(match.percent)}%
          </p>
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            aria-controls="match-breakdown"
            className="flex items-center gap-1 text-xs font-semibold text-info-c600 hover:opacity-75 transition-opacity"
          >
            {showBreakdown ? "Hide details" : "See more details"}
            {showBreakdown ? (
              <ChevronUp className="size-4" strokeWidth={2} />
            ) : (
              <ChevronDown className="size-4" strokeWidth={2} />
            )}
          </button>
        </div>
        <div className="w-px bg-grey-c100 my-1.5" />
        {/* Nutri score — the whole tile opens the breakdown drawer. */}
        <NutritionScoreDrawer points={points}>
          <button
            type="button"
            className="rounded-2xl w-[clamp(78px,23vh,98px)] shrink-0 bg-success-c100 flex flex-col gap-2 px-3 pt-7.5 pb-5 text-center hover:opacity-90 transition-opacity"
          >
            <p className="text-success-c700 text-hp-title leading-tight font-semibold">
              {baseScore}
              <span className="text-subtle text-sm font-medium">{"/10"}</span>
            </p>
            <span className="flex items-center gap-1 text-nowrap text-xs font-medium text-subtle">
              Nutri score
              <ChevronDown className="size-4" strokeWidth={2} />
            </span>
          </button>
        </NutritionScoreDrawer>
      </div>

      {showBreakdown && (
        <div id="match-breakdown" className="flex flex-col gap-4">
          <div className="flex flex-col gap-y-4">
            <p className="text-sm text-subtle">This recipe supports</p>
            <ul className="flex flex-col gap-y-4">
              {breakdown.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-base-text wrap-break-word">
                    {b.label}
                  </span>
                  <span className="text-subtle shrink-0">
                    {Math.round(b.percent)}%
                  </span>
                </li>
              ))}

              {showAverage && (
                <li className="flex items-center justify-between gap-3 text-sm border-t border-grey-c100 pt-2 mt-1">
                  <span className="text-subtle">Average across all</span>
                  <span className="text-subtle shrink-0">
                    {Math.round(average)}%
                  </span>
                </li>
              )}
            </ul>
          </div>
          <Link
            href="/health-profile"
            className="w-full rounded-full border border-info-c600 py-3 text-center text-xs font-semibold text-info-c600 hover:opacity-75 transition-opacity"
          >
            Adjust my goals/conditions
          </Link>
        </div>
      )}
      {!unlocked && (
        <div className="absolute inset-0 rounded-2xl backdrop-blur-sm bg-white/30 flex flex-col items-center justify-center gap-3 text-center px-4 z-20">
          {!hasProfile ? (
            <>
              <div className="bg-[#F0F2EA] p-3 rounded-full">
                <FaLock color="#227B6F" size={16} />
              </div>
              <div className="flex flex-col gap-2 text-center items-center">
                <p className="font-semibold text-sm text-black">
                  See your match score
                </p>
                <p className="text-xs text-subtle w-8/12">
                  Discover the highest-scoring recipes for your health goals
                </p>
              </div>
              <Link
                href="/health-profile"
                data-paywall-passthrough
                className="bg-mint-green text-white py-2 px-4 rounded-full font-medium text-xs"
              >
                Choose my goals
              </Link>
            </>
          ) : (
            <>
              <div className="bg-[#F0F2EA] p-3 rounded-full">
                <FaLock color="#227B6F" size={16} />
              </div>
              <div className="flex flex-col gap-2 text-center items-center">
                <p className="font-semibold text-sm text-black">
                  Your match is now ready
                </p>
              </div>
              <button
                type="button"
                className="bg-mint-green text-white py-2 px-4 rounded-full font-medium text-xs"
              >
                Tap to view
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NutritionScore;
