"use client";

import React from "react";
import { Calendar, Info, ChevronRight } from "lucide-react";
import { HiOutlineSparkles } from "react-icons/hi";

import { ProgressBar } from "../ProgressBar";
import { CoinAnimation } from "./CoinAnimation";
import Link from "next/link";

const TokensCard = ({ variant = "weekly" }: { variant: string }) => {
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
              Bought Jun 17, 2026
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-1.75">
          <div className="flex flex-col gap-3">
            <ProgressBar value={25} color="#F39128" trackColor="#ECEBEA" />
            <p className="text-[#F39128] text-sm font-semibold max-[400px]:text-xs">
              25% used
            </p>
          </div>
          <div className="bg-[#F391281A] rounded-lg p-3 flex gap-1 items-start">
            <Info color="#F39128" size={24} strokeWidth={1.67} />
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
            Resets in 5d 12h
          </p>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 flex flex-col gap-1.75">
        <div className="flex flex-col gap-3">
          <ProgressBar value={68} />
          <div className="flex justify-between items-center">
            <p className="text-mint-green text-sm font-semibold max-[400px]:text-xs">
              68% used
            </p>
            <p className="text-sm text-subtle font-medium max-[400px]:text-xs">
              Resets weekly
            </p>
          </div>
        </div>
        <div className="bg-[#227B6F1A] rounded-lg p-3 flex gap-1 items-start">
          <HiOutlineSparkles color="#227B6F" size={24} strokeWidth={1.67} />
          <p className="font-medium text-sm text-[#1B1D1D] max-[400px]:text-xs">
            You have plenty of free weekly token remaining, keep going!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokensCard;
