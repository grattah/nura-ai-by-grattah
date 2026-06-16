"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useCredits } from "@/components/providers/credits-provider";

// Shown to subscribers when their balance is at/below the low threshold. A
// carry-over balance has no fixed "% used" baseline, so we show the remaining
// count (matching the running-low banner in the designs).
export function LowCreditsBanner() {
  const { hasAccess, isLow, balance, isLoading } = useCredits();

  if (isLoading || !hasAccess || !isLow) return null;

  return (
    <Link href="/buy-credits" className="block">
      <div className="bg-orange-25 rounded-2xl p-4 flex gap-4 items-center hover:opacity-90 transition-opacity active:scale-[0.98]">
        <div className="w-14 h-14 rounded-full bg-[#E8836A] shrink-0 flex items-center justify-center">
          <Zap size={24} color="#FFFFFF" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">
            {balance === 0
              ? "You're out of credits"
              : `Only ${balance} credit${balance === 1 ? "" : "s"} left`}
          </p>
          <p className="text-sm text-muted-foreground leading-snug mt-0.5">
            Top up to keep searching, asking and generating recipes.{" "}
            <span className="font-bold text-foreground">Add more</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
