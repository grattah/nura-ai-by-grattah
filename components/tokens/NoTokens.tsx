"use client";

import React from "react";
import Image from "next/image";
import { Calendar } from "lucide-react";

import TokensModal from "./TokensModal";
import coin from "@/public/broken-coin.png";
import { formatResetCountdown, formatResetLong } from "@/lib/tokens-format";

const NoTokens = ({ resetAt = null }: { resetAt?: string | null }) => {
  // Tick once a second so the countdown stays live.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!resetAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [resetAt]);

  return (
    <div className="bg-background pb-10">
      <main className="px-6 flex flex-col gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 items-center">
            <div className="p-2 rounded-full bg-[#FFDBD6]">
              <Image src={coin} alt="icon" />
            </div>
            <div className="flex flex-col gap-3 justify-center items-center">
              <p className="text-center text-2xl max-[400px]:text-xl font-semibold text-black">
                You’ve used all your free weekly tokens
              </p>
              <p className="text-center text-subtle max-[400px]:text-sm">
                You’ve reached your weekly limit for this feature. Your free
                tokens will reset at the end of the week.
              </p>
            </div>
          </div>
          <div className="py-3 pr-4 pl-3 flex gap-3 items-start bg-[#E8E6DC] rounded-2xl">
            <div className="p-2 rounded-lg bg-[#F2F3F3]">
              <Calendar color="#227B6F" size={16} strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-medium text-sm max-[400px]:text-xs">
                Tokens resets in
              </p>
              <p className="font-semibold text-mint-green text-2xl max-[400px]:text-xl">
                {formatResetCountdown(resetAt)}
              </p>
              <p className="font-medium text-sm text-subtle">
                {formatResetLong(resetAt)}
              </p>
            </div>
          </div>
        </div>
        <TokensModal />
      </main>
    </div>
  );
};

export default NoTokens;
