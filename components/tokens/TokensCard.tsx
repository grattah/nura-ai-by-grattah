"use client";

import React from "react";
import { Calendar, Info, ChevronRight } from "lucide-react";
import { HiOutlineSparkles } from "react-icons/hi";

import { ProgressBar } from "../ProgressBar";
import { CoinAnimation } from "./CoinAnimation";
import Link from "next/link";
import { LOW_WARN_PCT, type TokenState } from "@/lib/credits";
import { formatResetShort, formatBoughtDate } from "@/lib/tokens-format";

const TokensCard = ({
  variant = "weekly",
  state,
}: {
  variant?: string;
  state: TokenState;
}) => {
  if (variant === "extra") {
    return (
      <div className="flex flex-col gap-3.75">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-xl max-[400px]:text-lg">
              Extra tokens
            </p>
            <p className="text-subtle font-medium text-sm max-[400px]:text-xs">
              Purchased separately
            </p>
          </div>
          <div className="bg-[#227B6F1A] p-2 rounded-lg flex items-center gap-1">
            <Calendar size={16} color="#227B6F" strokeWidth={1.67} />
            <p className="text-xs font-semibold text-mint-green max-[400px]:text-[10px]">
              Bought {formatBoughtDate(state.lastPurchaseAt)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-1.75">
          <div className="flex flex-col gap-3">
            <ProgressBar
              value={state.extraPct}
              color={state.extraBalance === 0 ? "#F90000" : "#F39128"}
              trackColor={state.extraBalance === 0 ? "#FFDBD6" : "#ECEBEA"}
            />
            <p
              className={`${state.extraBalance === 0 ? "text-[#F90000]" : "text-[#F39128]"} text-sm font-semibold max-[400px]:text-xs`}
            >
              {state.extraPct}% used
            </p>
          </div>
          <div
            style={{
              backgroundColor:
                state.extraBalance === 0 ? "#FFDBD6" : "#F391281A",
            }}
            className="rounded-lg p-3 flex gap-1 items-start"
          >
            <Info
              color={state.extraBalance === 0 ? "#F90000" : "#F39128"}
              size={24}
              strokeWidth={1.67}
            />
            <p className="font-medium text-sm text-[#1B1D1D] max-[400px]:text-xs">
              Extra token are used only after your weekly limit is exhausted
            </p>
          </div>
        </div>
        <div className="px-3 py-2 rounded-2xl bg-white flex justify-between items-center">
          <Link href="/buy-tokens" className="flex gap-1.5 items-center">
            <div className="bg-[#FFF7EC] rounded-full">
              <CoinAnimation />
            </div>
            <p className="text-black font-medium max-[400px]:text-sm">
              Buy extra credits
            </p>
          </Link>
          <ChevronRight size={20} color="#1B1D1D" strokeWidth={2} />
        </div>
      </div>
    );
  }

  const almostOut = state.weeklyPct >= LOW_WARN_PCT * 100;
  const isOut = state.weeklyRemaining === 0;

  return (
    <div className="flex flex-col gap-3.75">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-xl max-[400px]:text-lg">
            Weekly limits
          </p>
          <p className="text-subtle font-medium text-sm max-[400px]:text-xs">
            Included with your subscription
          </p>
        </div>
        <div className="bg-[#227B6F1A] p-2 rounded-lg flex items-center gap-1">
          <Calendar size={16} color="#227B6F" strokeWidth={1.67} />
          <p className="text-xs font-semibold text-mint-green max-[400px]:text-[10px]">
            Resets in {formatResetShort(state.resetAt)}
          </p>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 flex flex-col gap-1.75">
        <div className="flex flex-col gap-3">
          <ProgressBar
            value={state.weeklyPct}
            color={isOut ? "#F90000" : almostOut ? "#F39128" : undefined}
            trackColor={isOut ? "#FFDBD6" : almostOut ? "#ECEBEA" : undefined}
          />
          <div className="flex justify-between items-center">
            <p
              className={`text-sm font-semibold max-[400px]:text-xs ${
                isOut
                  ? "text-[#F90000]"
                  : almostOut
                    ? "text-[#F39128]"
                    : "text-mint-green"
              }`}
            >
              {state.weeklyPct}% used
            </p>
            <p className="text-sm text-subtle font-medium max-[400px]:text-xs">
              Resets weekly
            </p>
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
          <p className="font-medium text-sm text-[#1B1D1D] max-[400px]:text-xs">
            {almostOut
              ? `Only ${state.weeklyRemaining} free weekly token${
                  state.weeklyRemaining === 1 ? "" : "s"
                } left — top up or wait for the reset.`
              : "You have plenty of free weekly token remaining, keep going!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokensCard;
