"use client";

import React from "react";
import { Calendar, Info, ChevronRight } from "lucide-react";
import { HiOutlineSparkles } from "react-icons/hi";

import { ProgressBar } from "../ProgressBar";
import { CoinAnimation } from "./CoinAnimation";
import Link from "next/link";
import { LOW_WARN_PCT } from "@/lib/credits";
import type { WalletSnapshot } from "@/lib/tokens/spec";
import { formatResetShort, formatBoughtDate } from "@/lib/tokens-format";

const TokensCard = ({
  variant = "weekly",
  state,
}: {
  /** "weekly" = the subscription grant, "extra" = purchased tokens. */
  variant?: string;
  state: WalletSnapshot;
}) => {
  // Purchased tokens have no "granted" total to measure against — they are
  // topped up in arbitrary amounts and never expire, so a percentage would be
  // measured against a denominator that does not exist. The bar is full while
  // any remain and empty at zero; the count beside it carries the real detail.
  const purchasedPct = state.purchasedTokens > 0 ? 100 : 0;

  if (variant === "extra") {
    return (
      <div className="flex flex-col gap-3.75">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-xl">Extra tokens</p>
            <p className="text-subtle font-medium text-sm">
              Purchased separately
            </p>
          </div>
          <div className="bg-[#227B6F1A] p-2 rounded-lg flex items-center gap-1">
            <Calendar size={16} color="#227B6F" strokeWidth={1.67} />
            <p className="text-xs font-semibold text-mint-green">
              Bought {formatBoughtDate(state.lastPurchaseAt)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-1.75">
          <div className="flex flex-col gap-3">
            <ProgressBar
              value={purchasedPct}
              color={state.purchasedTokens === 0 ? "#F90000" : "#F39128"}
              trackColor={state.purchasedTokens === 0 ? "#FFDBD6" : "#ECEBEA"}
            />
            <p
              className={`${state.purchasedTokens === 0 ? "text-[#F90000]" : "text-[#F39128]"} text-sm font-semibold`}
            >
              {purchasedPct}% used
            </p>
          </div>
          <div
            style={{
              backgroundColor:
                state.purchasedTokens === 0 ? "#FFDBD6" : "#F391281A",
            }}
            className="rounded-lg p-3 flex gap-1 items-start"
          >
            <Info
              color={state.purchasedTokens === 0 ? "#F90000" : "#F39128"}
              size={24}
              strokeWidth={1.67}
            />
            <p className="font-medium text-sm text-[#1B1D1D]">
              {state.purchasedFrozen
                ? "These are paused while your subscription is inactive. They're kept, and become spendable again as soon as you resubscribe."
                : "Extra tokens are spent only once your included tokens run out"}
            </p>
          </div>
        </div>

        <Link
          href="/buy-tokens"
          className="px-3 py-2 rounded-2xl bg-white flex justify-between items-center hover:opacity-80 transition-opacity active:scale-[0.98]"
        >
          <div className="flex gap-1.5 items-center">
            <div className="bg-[#FFF7EC] rounded-full">
              <CoinAnimation />
            </div>
            <p className="text-black font-medium text-base">
              Buy extra credits
            </p>
          </div>
          <ChevronRight size={20} color="#1B1D1D" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const almostOut = state.subscriptionPct >= LOW_WARN_PCT * 100;
  const isOut = state.subscriptionTokens === 0;

  return (
    <div className="flex flex-col gap-3.75">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-xl">
            {state.plan === "weekly" ? "Weekly tokens" : "Monthly tokens"}
          </p>
          <p className="text-subtle font-medium text-sm">
            {state.grantTokens} included with your plan
          </p>
        </div>
        <div className="bg-[#227B6F1A] p-2 rounded-lg flex items-center gap-1">
          <Calendar size={16} color="#227B6F" strokeWidth={1.67} />
          <p className="text-xs font-semibold text-mint-green">
            Renews in {formatResetShort(state.nextAllocationAt)}
          </p>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 flex flex-col gap-1.75">
        <div className="flex flex-col gap-3">
          <ProgressBar
            value={state.subscriptionPct}
            color={isOut ? "#F90000" : almostOut ? "#F39128" : undefined}
            trackColor={isOut ? "#FFDBD6" : almostOut ? "#ECEBEA" : undefined}
          />
          <div className="flex justify-between items-center">
            <p
              className={`text-sm font-semibold ${
                isOut
                  ? "text-[#F90000]"
                  : almostOut
                    ? "text-[#F39128]"
                    : "text-mint-green"
              }`}
            >
              {state.subscriptionPct}% used
            </p>
            <p className="text-sm text-subtle font-medium">Renews each period</p>
          </div>
        </div>
        <div
          className={`rounded-lg p-3 flex gap-1 items-start ${
            isOut
              ? "bg-[#FFDBD6]"
              : almostOut
                ? "bg-[#F391281A]"
                : "bg-[#227B6F1A]"
          }`}
        >
          {isOut ? (
            <Info color="#F90000" size={24} strokeWidth={1.67} />
          ) : almostOut ? (
            <Info color="#F39128" size={24} strokeWidth={1.67} />
          ) : (
            <HiOutlineSparkles color="#227B6F" size={24} strokeWidth={1.67} />
          )}
          <p className="font-medium text-sm text-[#1B1D1D]">
            {almostOut
              ? `Only ${state.subscriptionTokens} included token${
                  state.subscriptionTokens === 1 ? "" : "s"
                } left — top up, or wait for your plan to renew.`
              : "You have plenty of included tokens remaining, keep going!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokensCard;
