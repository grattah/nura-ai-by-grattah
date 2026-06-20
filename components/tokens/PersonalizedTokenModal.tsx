"use client";

import { ProgressBar } from "../ProgressBar";
import { Info, Zap } from "lucide-react";
import Link from "next/link";
import { useCredits } from "@/components/providers/credits-provider";
import { formatResetDate } from "@/lib/tokens-format";
import { LOW_WARN_PCT } from "@/lib/credits";

const PersonalizedTokenModal = () => {
  const { hasAccess, isLow, isOut, state } = useCredits();

  if (
    !hasAccess ||
    !isLow ||
    isOut ||
    (state.extraPct && state.extraPct < LOW_WARN_PCT * 100)
  )
    return null;

  const WHAT_TO_SHOW =
    state.weeklyPct >= LOW_WARN_PCT * 100
      ? state.extraPct != null && state.extraPct >= LOW_WARN_PCT * 100
        ? "SHOWEXTRA"
        : "SHOWFREE"
      : null;

  return (
    <div className="p-4 rounded-2xl bg-white flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-black text-base text-center">
          You're almost out of {WHAT_TO_SHOW === "SHOWEXTRA" ? "extra" : "free"}{" "}
          credits
        </p>
        <ProgressBar
          value={
            WHAT_TO_SHOW === "SHOWEXTRA" ? state.extraPct : state.weeklyPct
          }
          color="#F39128"
          trackColor="#ECEBEA"
        />
        <div className="flex justify-between items-center">
          <p className="font-semibold text-[#F39128] text-sm">
            {WHAT_TO_SHOW === "SHOWEXTRA" ? state.extraPct : state.weeklyPct}%
            used
          </p>
          <p className="font-medium text-subtle text-sm">
            Resets {formatResetDate(state.resetAt)}
          </p>
        </div>
      </div>
      <div className="bg-[#F391281A] rounded-lg p-3 flex gap-1 items-start">
        <Info color="#F39128" size={24} strokeWidth={1.67} />
        <p className="font-medium text-sm text-[#1B1D1D]">
          You can get extra tokens to continue enjoying this feature
        </p>
      </div>
      <div className="w-full">
        <Link
          href="/buy-tokens"
          className="w-full flex gap-1 justify-center items-center rounded-full py-3.75 bg-mint-green"
        >
          <Zap size={18} color="#FFFFFF" strokeWidth={2} />
          <span className="text-white font-medium text-base">
            Get extra tokens
          </span>
        </Link>
      </div>
    </div>
  );
};

export default PersonalizedTokenModal;
