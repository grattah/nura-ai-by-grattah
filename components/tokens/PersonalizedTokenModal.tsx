"use client";

import { ProgressBar } from "../ProgressBar";
import { Info, Zap } from "lucide-react";
import Link from "next/link";
import { useCredits } from "@/components/providers/credits-provider";
import { formatResetDate } from "@/lib/tokens-format";

const PersonalizedTokenModal = () => {
  const { hasAccess, isLow, isOut, wallet } = useCredits();

  // Nudge only while the period's grant is nearly spent AND buying more would
  // actually help. A user already holding purchased tokens is not stuck, and a
  // user with none left at all sees the full wall instead of this.
  if (!hasAccess || !isLow || isOut) return null;

  const hasPurchased = wallet.purchasedTokens > 0 && !wallet.purchasedFrozen;

  return (
    <div className="p-4 rounded-2xl bg-white flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-black text-base text-center">
          You&apos;re almost out of{" "}
          {hasPurchased ? "tokens" : "included tokens"}
        </p>
        <ProgressBar
          value={wallet.subscriptionPct}
          color="#F39128"
          trackColor="#ECEBEA"
        />
        <div className="flex justify-between items-center">
          <p className="font-semibold text-[#F39128] text-sm">
            {wallet.subscriptionPct}% used
          </p>
          <p className="font-medium text-subtle text-sm">
            Renews {formatResetDate(wallet.nextAllocationAt)}
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
